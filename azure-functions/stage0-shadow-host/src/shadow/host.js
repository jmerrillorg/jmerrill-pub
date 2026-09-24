"use strict";

const { app } = require("@azure/functions");
const { BlobServiceClient } = require("@azure/storage-blob");
const { ManagedIdentityCredential } = require("@azure/identity");
const { Stage0DataverseSource } = require("./stage0DataverseSource");
const { probe } = require("./authorityProbe");

app.timer("stage0-shadow-authority-probe", {
  schedule: "0 */5 * * * *",
  run: async (_timer, context) => {
    const clientId = process.env.JM1_SHADOW_MANAGED_IDENTITY_CLIENT_ID;
    const accountName = process.env.JM1_SHADOW_STORAGE_ACCOUNT;
    if (!clientId || !accountName) throw new Error("SHADOW_PROBE_CONFIG_MISSING");
    const state = await probe({
      clientId,
      storageAccount: accountName,
      ledgerContainer: "shadow-ledger",
      dataverseApiBase: process.env.DATAVERSE_WEB_API_BASE_URL,
      dataverseResourceUrl: process.env.DATAVERSE_RESOURCE_URL,
      releaseSha: process.env.JM1_RELEASE_SHA,
      shadowEnabled: process.env.JM1_SHADOW_ENABLED === "true",
    });
    const storage = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`, new ManagedIdentityCredential(clientId),
    );
    const container = storage.getContainerClient("shadow-ledger");
    await container.createIfNotExists();
    const blob = container.getBlockBlobClient("health/latest.json");
    await blob.uploadData(Buffer.from(JSON.stringify(state)), {
      blobHTTPHeaders: { blobContentType: "application/json" },
    });
    context.log(`stage0_shadow_probe=${Object.values(state.states).every((value) => value === "PASS") ? "PASS" : "PARTIAL"}`);
  },
});

app.timer("stage0-shadow-poll", {
  schedule: "0 */5 * * * *",
  run: async (_timer, context) => {
    if (process.env.JM1_SHADOW_ENABLED !== "true") {
      context.log("stage0_shadow_disabled");
      return;
    }
    if (process.env.JM1_SHADOW_ROUTE_STATUS !== "ACTIVE") {
      context.error("stage0_shadow_route_not_active");
      return;
    }
    // Real-data execution stays closed until the site-scoped asset read and
    // independent-evaluation ports pass their production proofs.
    if (process.env.JM1_SHADOW_EXECUTION_CERTIFIED !== "true") {
      context.error("stage0_shadow_execution_not_certified");
      return;
    }
    const source = new Stage0DataverseSource({
      apiBase: process.env.DATAVERSE_WEB_API_BASE_URL,
      resourceUrl: process.env.DATAVERSE_RESOURCE_URL,
      clientId: process.env.JM1_SHADOW_MANAGED_IDENTITY_CLIENT_ID,
      activationUtc: process.env.JM1_SHADOW_ACTIVATION_UTC,
    });
    const events = await source.listNaturalCompletedEvents();
    context.log(`stage0_shadow_natural_events_observed=${events.length}`);
    throw new Error("STAGE0_SHADOW_EXECUTOR_NOT_BOUND");
  },
});
