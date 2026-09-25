"use strict";

const { BlobServiceClient } = require("@azure/storage-blob");
const { ManagedIdentityCredential } = require("@azure/identity");
const policy = require("./stage0BudgetPolicy");

function isConflict(error) {
  return error?.statusCode === 409 || error?.statusCode === 412;
}

class BlobBudgetLedger {
  constructor({ accountName, containerName, clientId }) {
    if (!/^[a-z0-9]{3,24}$/.test(accountName || "") || !/^[a-z0-9-]{3,63}$/.test(containerName || "") || !clientId) {
      throw new Error("INVALID_SHADOW_LEDGER_CONFIG");
    }
    const credential = new ManagedIdentityCredential(clientId);
    const service = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, credential);
    this.container = service.getContainerClient(containerName);
  }

  async ensureContainer() {
    await this.container.createIfNotExists();
  }

  async mutateMonth(now, mutation) {
    const month = policy.monthKey(now);
    const blob = this.container.getBlockBlobClient(`budget/${month}.json`);
    const empty = { month, spentCents: 0, reservedCents: 0, events: {} };
    try {
      await blob.uploadData(Buffer.from(JSON.stringify(empty)), { conditions: { ifNoneMatch: "*" } });
    } catch (error) {
      if (!isConflict(error)) throw error;
    }
    const lease = blob.getBlobLeaseClient();
    await lease.acquireLease(15);
    try {
      const download = await blob.download();
      const chunks = [];
      for await (const chunk of download.readableStreamBody) chunks.push(chunk);
      const state = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const result = mutation(state);
      if (result.state !== state) {
        await blob.uploadData(Buffer.from(JSON.stringify(result.state)), {
          leaseId: lease.leaseId,
          conditions: { ifMatch: download.etag },
          blobHTTPHeaders: { blobContentType: "application/json" },
        });
      }
      return result;
    } finally {
      await lease.releaseLease();
    }
  }

  async reserve(args) {
    await this.ensureContainer();
    const key = policy.eventKey(args.sourceEventId, args.policyVersion);
    const claim = this.container.getBlockBlobClient(`claims/${key}.json`);
    try {
      await claim.uploadData(Buffer.from(JSON.stringify({
        sourceEventId: args.sourceEventId.toLowerCase(),
        policyVersion: args.policyVersion,
        workload: policy.WORKLOAD,
        claimedAt: new Date(args.now).toISOString(),
      })), {
        conditions: { ifNoneMatch: "*" },
        blobHTTPHeaders: { blobContentType: "application/json" },
      });
    } catch (error) {
      if (isConflict(error)) return { outcome: "IDEMPOTENT_REPLAY" };
      throw error;
    }
    return this.mutateMonth(args.now, (state) => policy.reserve(state, args));
  }

  async finalize(args) {
    return this.mutateMonth(args.reservedAt, (state) => ({ state: policy.finalize(state, args) }));
  }

  async recordEvidence(sourceEventId, policyVersion, evidence) {
    const key = policy.eventKey(sourceEventId, policyVersion);
    const blob = this.container.getBlockBlobClient(`evidence/${key}.json`);
    const allowed = {
      shadowExecutionId: evidence.shadowExecutionId,
      sourceEventId,
      policyVersion,
      routeId: evidence.routeId,
      deploymentId: evidence.deploymentId,
      currentOutcome: evidence.currentOutcome,
      shadowOutcome: evidence.shadowOutcome,
      evaluation: evidence.evaluation,
      inputTokens: evidence.inputTokens,
      outputTokens: evidence.outputTokens,
      executionCostCents: evidence.executionCostCents,
      costAnomaly: evidence.costAnomaly,
      latencyMs: evidence.latencyMs,
      status: evidence.status,
      recordedAt: evidence.recordedAt,
    };
    await blob.uploadData(Buffer.from(JSON.stringify(allowed)), {
      conditions: { ifNoneMatch: "*" },
      blobHTTPHeaders: { blobContentType: "application/json" },
    });
    return key;
  }
}

module.exports = { BlobBudgetLedger };
