"use strict";

const { createHash } = require("node:crypto");
const { app } = require("@azure/functions");
const { BlobServiceClient } = require("@azure/storage-blob");
const { ManagedIdentityCredential } = require("@azure/identity");
const { Stage0DataverseSource } = require("./stage0DataverseSource");
const { probe } = require("./authorityProbe");
const { BlobBudgetLedger } = require("./blobBudgetLedger");
const { processStage0Event, ROUTE_ID, ENTITY, WORKLOAD, CANARY_EVENT_ID } = require("./stage0ShadowRuntime");
const { readApprovedInput } = require("./stage0InputAdapter");
const model = require("./exactResourceExecutor");
const evaluator = require("./deterministicEvaluator");
const cost = require("./stage0ModelCost");
const { readPermissionState } = require("./permissionMonitorState");
const { TARGET_SITE } = require("./authorityProbe");

const MODEL_REGISTER_ID = "AZURE:OAI-JM1-DIAGNOSTIC:JM1-PUB-DIAGNOSTIC-PRIMARY";
const RISK_REGISTER_ID = "JM1-AI-RISK-STAGE0-SHADOW-001";
const POLICY_VERSION = "STAGE0-SHADOW-C11-v1";
const CANARY_EXCERPT = "Synthetic publishing diagnostic sample. A fictional manuscript excerpt has a clear opening, an unresolved transition, and no real author or client information.";

function routeFromEnvironment(env) {
  if (env.JM1_SHADOW_MODEL_REGISTER_ID !== MODEL_REGISTER_ID ||
      env.JM1_SHADOW_RISK_REGISTER_ID !== RISK_REGISTER_ID ||
      env.JM1_SHADOW_ROUTE_POLICY_VERSION !== POLICY_VERSION ||
      !env.JM1_SHADOW_ROUTE_EXPIRES_AT) {
    throw new Error("SHADOW_ROUTE_AUTHORITY_MISSING");
  }
  return {
    id: ROUTE_ID,
    entity: ENTITY,
    workload: WORKLOAD,
    status: env.JM1_SHADOW_ROUTE_STATUS,
    mode: "SHADOW_ONLY",
    actionAuthority: "READ_ONLY",
    businessWriteAuthority: "NONE",
    authorMessageAuthority: "NONE",
    financialAuthority: "NONE",
    identityClientId: env.JM1_SHADOW_MANAGED_IDENTITY_CLIENT_ID,
    policyVersion: env.JM1_SHADOW_ROUTE_POLICY_VERSION,
    expiresAt: env.JM1_SHADOW_ROUTE_EXPIRES_AT,
    azureResourceId: model.RESOURCE_ID,
    deploymentId: model.DEPLOYMENT_ID,
    deploymentName: model.DEPLOYMENT_NAME,
    modelRegisterId: MODEL_REGISTER_ID,
    riskRegisterId: env.JM1_SHADOW_RISK_REGISTER_ID,
    modelVersion: model.MODEL_VERSION,
    region: "eastus",
    evaluationRequired: true,
    executionLogRequired: true,
    costGovernanceRequired: true,
  };
}

function productionPorts(env, context) {
  const clientId = env.JM1_SHADOW_MANAGED_IDENTITY_CLIENT_ID;
  const ledger = new BlobBudgetLedger({
    accountName: env.JM1_SHADOW_STORAGE_ACCOUNT,
    containerName: "shadow-ledger",
    clientId,
  });
  return {
    identityClientId: clientId,
    modelResourceId: model.RESOURCE_ID,
    modelRegisterId: MODEL_REGISTER_ID,
    now: () => new Date().toISOString(),
    projectMaximumCost: () => cost.projectMaximumCost({ approvedExcerpt: "x".repeat(12000) }),
    actualCostCents: cost.actualCostCents,
    ledger,
    readApprovedInput: (event) => readApprovedInput(event, { clientId }),
    infer: (input, selection) => model.infer(input, selection, { clientId }),
    evaluate: evaluator.evaluate,
    metric: (name, value) => context.log(JSON.stringify({ event: name, value })),
    alert: async (name, details) => context.error(JSON.stringify({ event: name, ...details })),
  };
}

app.timer("stage0-shadow-authority-probe", {
  schedule: "0 */5 * * * *",
  handler: async (_timer, context) => {
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

app.timer("stage0-shadow-commissioning-canary", {
  schedule: "0 */5 * * * *",
  handler: async (_timer, context) => {
    if (process.env.JM1_SHADOW_CANARY_ENABLED !== "true") return;
    if (process.env.JM1_SHADOW_ENABLED === "true" ||
        process.env.JM1_SHADOW_ROUTE_STATUS !== "CANARY_ONLY") {
      throw new Error("SHADOW_CANARY_ROUTE_BOUNDARY_DENIED");
    }
    const event = {
      sourceEventId: CANARY_EVENT_ID,
      entity: ENTITY,
      workload: WORKLOAD,
      synthetic: true,
      manuscriptApprovedForDiagnostic: true,
      currentOutcome: 835500004,
    };
    const ports = productionPorts(process.env, context);
    ports.readApprovedInput = async () => ({
      sourceEventId: CANARY_EVENT_ID,
      approvedExcerpt: CANARY_EXCERPT,
      sourceReferenceIds: [createHash("sha256").update(CANARY_EXCERPT).digest("hex")],
    });
    const result = await processStage0Event(event, routeFromEnvironment(process.env), ports);
    context.log(JSON.stringify({ event: "stage0_shadow_canary", status: result.status,
      sourceEventId: CANARY_EVENT_ID }));
  },
});

app.timer("stage0-shadow-poll", {
  schedule: "0 */5 * * * *",
  handler: async (_timer, context) => {
    if (process.env.JM1_SHADOW_ENABLED !== "true") {
      context.log("stage0_shadow_disabled");
      return;
    }
    if (process.env.JM1_SHADOW_ROUTE_STATUS !== "ACTIVE") {
      context.error("stage0_shadow_route_not_active");
      return;
    }
    // Production data remains closed until the bounded route and execution
    // controls have been separately certified.
    if (process.env.JM1_SHADOW_EXECUTION_CERTIFIED !== "true") {
      context.error("stage0_shadow_execution_not_certified");
      return;
    }
    try {
      await readPermissionState({
        accountName: process.env.JM1_SHADOW_PERMISSION_STATE_ACCOUNT,
        clientId: process.env.JM1_SHADOW_MANAGED_IDENTITY_CLIENT_ID,
        expected: {
          appId: process.env.JM1_SHADOW_MANAGED_IDENTITY_CLIENT_ID,
          siteId: TARGET_SITE,
          grantId: process.env.JM1_SHADOW_EXPECTED_SITE_GRANT_ID,
        },
      });
    } catch (error) {
      context.error(JSON.stringify({ event: "stage0_shadow_permission_unverified", code: error.message }));
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
    const route = routeFromEnvironment(process.env);
    const ports = productionPorts(process.env, context);
    for (const event of events) {
      try {
        const result = await processStage0Event(event, route, ports);
        context.log(JSON.stringify({ event: "stage0_shadow_result", sourceEventId: event.sourceEventId,
          status: result.status }));
      } catch (error) {
        context.error(JSON.stringify({ event: "stage0_shadow_rejected", sourceEventId: event.sourceEventId,
          code: error.message }));
      }
    }
  },
});

module.exports = { routeFromEnvironment, productionPorts, CANARY_EVENT_ID };
