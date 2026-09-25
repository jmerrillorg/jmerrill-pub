"use strict";

const { createHash, randomUUID } = require("node:crypto");
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
const { readAuthorityProbe } = require("./authorityProbeState");
const { probeWithManagedIdentity } = require("./personalSiteProbe");
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
    try {
      const personalSiteIds = await readPermissionState({
        accountName: process.env.JM1_SHADOW_PERMISSION_STATE_ACCOUNT,
        clientId,
        expected: {
          appId: clientId,
          siteId: TARGET_SITE,
          grantId: process.env.JM1_SHADOW_EXPECTED_SITE_GRANT_ID,
        },
      });
      await probeWithManagedIdentity(personalSiteIds, clientId);
      state.states.opsPermissionVerdict = "PASS";
      state.personalSitesDenied = personalSiteIds.length;
    } catch (error) {
      state.states.opsPermissionVerdict = `FAIL_${String(error.message || error).replace(/[^A-Z0-9_]/gi, "_").slice(0, 60)}`;
    }
    const storage = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`, new ManagedIdentityCredential(clientId),
    );
    const container = storage.getContainerClient("shadow-ledger");
    await container.createIfNotExists();
    const blob = container.getBlockBlobClient("health/latest.json");
    await blob.uploadData(Buffer.from(JSON.stringify(state)), {
      blobHTTPHeaders: { blobContentType: "application/json" },
    });
    context.log(`stage0_shadow_permission_probe=${state.states.opsPermissionVerdict} personal=${state.personalSitesDenied || 0}`);
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

app.timer("stage0-shadow-budget-certification", {
  schedule: "0 */5 * * * *",
  handler: async (_timer, context) => {
    if (process.env.JM1_SHADOW_BUDGET_CERTIFICATION_ENABLED !== "true") return;
    if (process.env.JM1_SHADOW_ENABLED === "true" ||
        process.env.JM1_SHADOW_ROUTE_STATUS !== "CANARY_ONLY") {
      throw new Error("SHADOW_BUDGET_CERTIFICATION_BOUNDARY_DENIED");
    }
    const now = new Date().toISOString();
    const month = now.slice(0, 7);
    const event = {
      sourceEventId: CANARY_EVENT_ID,
      entity: ENTITY,
      workload: WORKLOAD,
      synthetic: true,
      manuscriptApprovedForDiagnostic: true,
      currentOutcome: 835500004,
    };
    const route = routeFromEnvironment(process.env);
    const results = [];
    for (const [scenario, spentCents] of [["exhausted", 2500], ["projected", 2499]]) {
      const containerName = `shadow-cert-${randomUUID().replace(/-/g, "")}`;
      const ports = productionPorts(process.env, context);
      if (scenario === "projected") ports.projectMaximumCost = async () => 2;
      ports.ledger = new BlobBudgetLedger({
        accountName: process.env.JM1_SHADOW_STORAGE_ACCOUNT,
        containerName,
        clientId: process.env.JM1_SHADOW_MANAGED_IDENTITY_CLIENT_ID,
      });
      await ports.ledger.ensureContainer();
      const budget = ports.ledger.container.getBlockBlobClient(`budget/${month}.json`);
      await budget.uploadData(Buffer.from(JSON.stringify({
        month, spentCents, reservedCents: 0, events: {},
      })), { conditions: { ifNoneMatch: "*" } });
      let providerCalls = 0;
      ports.readApprovedInput = async () => { throw new Error("CERTIFICATION_INPUT_READ_DENIED"); };
      ports.infer = async () => { providerCalls++; throw new Error("CERTIFICATION_PROVIDER_CALL_DENIED"); };
      const result = await processStage0Event(event, route, ports);
      const claim = await ports.ledger.reserve({
        sourceEventId: CANARY_EVENT_ID,
        policyVersion: route.policyVersion,
        projectedCents: await ports.projectMaximumCost(),
        now,
      });
      const remainingCents = 2500 - spentCents;
      if (result.status !== "BUDGET_DENIED" || claim.outcome !== "IDEMPOTENT_REPLAY" || providerCalls !== 0 ||
          claim.event.monthToDateCostCents !== spentCents ||
          claim.event.budgetRemainingCents !== remainingCents) {
        throw new Error(`SHADOW_BUDGET_CERTIFICATION_FAILED_${scenario.toUpperCase()}`);
      }
      results.push({ scenario, spentCents, result: result.status, claim: claim.outcome,
        providerCalls, monthToDateCostCents: claim.event.monthToDateCostCents,
        budgetRemainingCents: claim.event.budgetRemainingCents, containerName });
    }
    const softContainerName = `shadow-cert-${randomUUID().replace(/-/g, "")}`;
    const softPorts = productionPorts(process.env, context);
    softPorts.ledger = new BlobBudgetLedger({
      accountName: process.env.JM1_SHADOW_STORAGE_ACCOUNT,
      containerName: softContainerName,
      clientId: process.env.JM1_SHADOW_MANAGED_IDENTITY_CLIENT_ID,
    });
    softPorts.projectMaximumCost = async () => 12;
    softPorts.readApprovedInput = async () => ({
      approvedExcerpt: CANARY_EXCERPT,
      sourceReferenceIds: [createHash("sha256").update(CANARY_EXCERPT).digest("hex")],
    });
    let syntheticInferenceCalls = 0;
    softPorts.infer = async () => {
      syntheticInferenceCalls++;
      return {
        output: {
          jm1_diagnosticoutputsummary: "Synthetic certification output",
          jm1_diagnosticriskflags: "none",
          jm1_confidence: 0.9,
          jm1_requireshumanreview: true,
        },
        tokenCounts: { input: 1, output: 1 },
      };
    };
    softPorts.evaluate = async () => ({
      pass: true, evaluatorId: "synthetic-cost-certification",
      policyVersion: route.policyVersion, method: "SYNTHETIC",
    });
    softPorts.actualCostCents = () => 11;
    const softSignals = [];
    const emitMetric = softPorts.metric;
    const emitAlert = softPorts.alert;
    softPorts.metric = (name, value) => { softSignals.push(`metric:${name}`); emitMetric(name, value); };
    softPorts.alert = async (name, details) => {
      softSignals.push(`alert:${name}`);
      await emitAlert(name, details);
    };
    const softResult = await processStage0Event(event, route, softPorts);
    const softClaim = await softPorts.ledger.reserve({
      sourceEventId: CANARY_EVENT_ID, policyVersion: route.policyVersion,
      projectedCents: 12, now,
    });
    if (softResult.status !== "SHADOW_ONLY" || softClaim.outcome !== "IDEMPOTENT_REPLAY" ||
        softClaim.event.actualCents !== 11 || syntheticInferenceCalls !== 1 ||
        softClaim.event.primaryInferenceCostCents !== 11 ||
        softClaim.event.evaluatorCostCents !== 0 ||
        softClaim.event.totalEventCostCents !== 11 ||
        softClaim.event.monthToDateCostCents !== 11 ||
        softClaim.event.budgetRemainingCents !== 2489 ||
        !softSignals.includes("metric:stage0_shadow_cost_anomaly") ||
        !softSignals.includes("alert:stage0_shadow_cost_anomaly")) {
      throw new Error("SHADOW_SOFT_COST_CERTIFICATION_FAILED");
    }
    results.push({ scenario: "soft_target", spentCents: 0, result: softResult.status,
      claim: softClaim.outcome, syntheticInferenceCalls, providerCalls: 0,
      primaryInferenceCostCents: softClaim.event.primaryInferenceCostCents,
      evaluatorCostCents: softClaim.event.evaluatorCostCents,
      totalEventCostCents: softClaim.event.totalEventCostCents,
      monthToDateCostCents: softClaim.event.monthToDateCostCents,
      budgetRemainingCents: softClaim.event.budgetRemainingCents,
      costAnomaly: true, containerName: softContainerName });
    context.log(JSON.stringify({ event: "stage0_shadow_budget_certification", status: "PASS", results }));
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
      const personalSiteIds = await readPermissionState({
        accountName: process.env.JM1_SHADOW_PERMISSION_STATE_ACCOUNT,
        clientId: process.env.JM1_SHADOW_MANAGED_IDENTITY_CLIENT_ID,
        expected: {
          appId: process.env.JM1_SHADOW_MANAGED_IDENTITY_CLIENT_ID,
          siteId: TARGET_SITE,
          grantId: process.env.JM1_SHADOW_EXPECTED_SITE_GRANT_ID,
        },
      });
      await probeWithManagedIdentity(personalSiteIds, process.env.JM1_SHADOW_MANAGED_IDENTITY_CLIENT_ID);
      await readAuthorityProbe({
        accountName: process.env.JM1_SHADOW_STORAGE_ACCOUNT,
        clientId: process.env.JM1_SHADOW_MANAGED_IDENTITY_CLIENT_ID,
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
