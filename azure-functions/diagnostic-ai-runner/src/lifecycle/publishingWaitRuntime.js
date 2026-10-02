"use strict";

const { BlobServiceClient } = require("@azure/storage-blob");
const { createPublishingWaitStore } = require("./publishingWaitStore");
const { createAuthorWaitOwner, authorWaitFor } = require("./publishingAuthorWaitOwner");
const { registerPublishingWait } = require("./publishingWaitCoordinator");
const { createDataverseClient } = require("../orchestration/authorReviewResponseConsumer");
const { BlobInboundEvidenceStore } = require("../mail/inbound/blobEvidenceStore");
const { PublishingMailboxGraphClient } = require("../mail/inbound/graphClient");
const { verifyCorrespondenceIdentity, bindCorrespondenceIdentity, declaredCorrespondenceEmail } = require("../mail/inbound/correspondenceIdentity");
const { OWNER_BY_TYPE } = require("./publishingWaitResumeAdapter");
const { waitRuntimeOwnsTitle } = require("./publishingWaitEnablement");
const { recoverCadenceDelivery } = require("../mail/inbound/cadenceDeliveryRecovery");
const PROJECTION_CONTAINER = "jm1-publishing-wait-projections";
const SIGNAL_QUEUE = "jm1-publishing-wait-signals";

function createPublishingWaitRuntime(deps = {}) {
  const client = deps.client || createDataverseClient({ apiBase: process.env.DATAVERSE_WEB_API_BASE_URL, resourceUrl: process.env.DATAVERSE_RESOURCE_URL });
  const inbound = deps.inbound || new BlobInboundEvidenceStore();
  const graph = deps.graph || new PublishingMailboxGraphClient();
  const store = deps.store || createPublishingWaitStore();
  const author = createAuthorWaitOwner({ client, inbound, graph });
  const owners = { AUTHOR_RESPONSE_CONSUMER: author, ...(deps.owners || {}) };
  function owner(wait) {
    const adapter = owners[OWNER_BY_TYPE[wait.waitType]];
    if (!adapter) throw Object.assign(new Error("PUBLISHING_WAIT_OWNER_NOT_COMMISSIONED"), { safeCode: "PUBLISHING_WAIT_OWNER_NOT_COMMISSIONED" });
    return adapter;
  }
  const projection = deps.projection || BlobServiceClient.fromConnectionString(process.env.AzureWebJobsStorage).getContainerClient(PROJECTION_CONTAINER);
  const runtime = {
    store, handlers: owners, now: deps.now, observe: deps.observe,
    readAuthority: (wait) => owner(wait).readAuthority(wait),
    verifyCondition: (wait, authority) => owner(wait).verifyCondition(wait, authority),
    async publishReady(signal) {
      // OPS receives a narrow immutable projection, not access to the wait/author record.
      const blob = projection.getBlockBlobClient(`ready/${signal.waitId}.json`);
      await blob.uploadData(Buffer.from(JSON.stringify(signal)), { blobHTTPHeaders: { blobContentType: "application/json" } });
    },
    async produceAuthorWaits() {
      const gates = await client.list("jm1pub_editorialapprovalgates", { $filter: "statecode eq 0 and jm1pub_gatestatus eq 196650002", $top: "5000" });
      const messages = await inbound.listPrefix("messages/");
      let registered = 0;
      const failures = [];
      const recordFailure = (gate, message, error) => {
        const failure = { gateId: gate.jm1pub_editorialapprovalgateid, sourceEventId: message?.eventId || null,
          code: error.safeCode || "PUBLISHING_WAIT_PRODUCER_FAILED" };
        failures.push(failure);
        runtime.observe?.({ ...failure, status: "PRODUCER_FAILED" });
      };
      for (const gate of gates) {
        if (!waitRuntimeOwnsTitle(gate._jm1pub_titleid_value)) continue;
        try {
        const stage = await client.first("jm1pub_editorialstages", { $filter: `jm1pub_editorialstageid eq ${gate._jm1pub_editorialstageid_value}` });
        if (!stage?._jm1pub_contactid_value || !stage.jm1pub_publishingintakereference) continue;
        const contact = await client.first("contacts", { $filter: `contactid eq ${stage._jm1pub_contactid_value}`, $select: "contactid,emailaddress1" });
        // Recover explicit declarations before evaluating alternate-address replies, independent of blob order.
        for (const message of messages) {
          if (!contact?.emailaddress1 || message.fromAddress?.toLowerCase() !== contact.emailaddress1.toLowerCase() || !message.graphMessageId) continue;
          try {
          const source = await graph.getMessage(message.graphMessageId);
          if (source.internetMessageId !== message.internetMessageId || source.receivedDateTime !== message.receivedAt) continue;
          const alternateEmail = declaredCorrespondenceEmail(source);
          if (alternateEmail) await bindCorrespondenceIdentity({ authorId: stage._jm1pub_contactid_value, alternateEmail, sourceMessageId: message.graphMessageId },
            { client, graph, store: inbound, now: deps.now });
          } catch (error) { recordFailure(gate, message, error); }
        }
        for (const message of messages) {
          if (!message.fromAddress || !message.internetMessageId || !Number.isFinite(Date.parse(message.receivedAt)) ||
              Date.parse(message.receivedAt) < Date.parse(gate.jm1pub_awaitingsince || gate.createdon)) continue;
          try {
          const identity = await verifyCorrespondenceIdentity(stage._jm1pub_contactid_value, message.fromAddress, { client, store: inbound });
          if (!identity.verified) continue;
          const wait = authorWaitFor(gate, stage, message, deps.now?.() || new Date());
          const authority = await author.readAuthority(wait);
          if (!authority) continue;
          await recoverCadenceDelivery(wait, authority, message, { client, inbound, graph });
          // Neither subject nor quoted title text establishes this event's title.
          const proof = await author.verifyCondition(wait, authority);
          if (!proof.satisfied) { runtime.observe?.({ waitId: wait.waitId, status: "HELD", reason: proof.reason }); continue; }
          if ((await registerPublishingWait(wait, runtime)).status === "REGISTERED") registered += 1;
          } catch (error) { recordFailure(gate, message, error); }
        }
        } catch (error) { recordFailure(gate, null, error); }
      }
      return { registered, failures };
    },
    async publishHealth(results, producerFailures = []) {
      const health = { observedAt: (deps.now?.() || new Date()).toISOString(), counts: {}, failures: [...producerFailures] };
      for (const item of results) {
        health.counts[item.status] = (health.counts[item.status] || 0) + 1;
        if (["FAILURE_RECORDED", "FAILED"].includes(item.status)) health.failures.push({ waitId: item.waitId, code: item.code });
      }
      for await (const { value } of store.list()) {
        if (value.status === "FAILED") health.failures.push({ waitId: value.waitId, code: value.lastFailure?.code });
        if (value.status === "RESUMED") {
          const receipt = { schemaVersion: 1, owner: "jmerrillorg/jmerrill-pub", status: "RESUMED", waitId: value.waitId,
            sourceEventId: value.resumeResult.sourceEventId, owningRuntime: value.resumeResult.owningRuntime,
            evidenceId: value.resumeResult.evidenceId, resumedAt: value.resumeResult.resumedAt };
          await projection.getBlockBlobClient(`receipts/${value.waitId}.json`).uploadData(Buffer.from(JSON.stringify(receipt)),
            { blobHTTPHeaders: { blobContentType: "application/json" } });
        }
        if (["RESUMED", "CANCELLED", "SUPERSEDED", "FAILED"].includes(value.status)) {
          await projection.getBlockBlobClient(`ready/${value.waitId}.json`).deleteIfExists();
        }
      }
      await projection.getBlockBlobClient("health.json").uploadData(Buffer.from(JSON.stringify(health)), { blobHTTPHeaders: { blobContentType: "application/json" } });
      return health;
    }
  };
  return runtime;
}
module.exports = { createPublishingWaitRuntime, PROJECTION_CONTAINER, SIGNAL_QUEUE };
