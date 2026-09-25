"use strict";

const { randomUUID } = require("node:crypto");

const ROUTE_ID = "STAGE_0_DIAGNOSTIC_SHADOW_ONLY";
const ENTITY = "J_MERRILL_PUBLISHING";
const WORKLOAD = "STAGE_0_DIAGNOSTIC_SHADOW";
const CANARY_EVENT_ID = "c1100000-0000-4000-8000-000000000003";

function authorizeRoute(event, route, identityClientId, modelResourceId, modelRegisterId) {
  if (!event || !route || !identityClientId || !modelResourceId || !modelRegisterId) {
    throw new Error("SHADOW_AUTHORITY_MISSING");
  }
  const deploymentResourceId = `${modelResourceId}/deployments/${route.deploymentName}`;
  const canaryOnly = route.status === "CANARY_ONLY" && event.synthetic === true &&
    event.sourceEventId === CANARY_EVENT_ID;
  if (!(route.status === "ACTIVE" || canaryOnly) || route.id !== ROUTE_ID || route.entity !== ENTITY ||
      route.workload !== WORKLOAD || route.mode !== "SHADOW_ONLY" ||
      route.actionAuthority !== "READ_ONLY" || route.businessWriteAuthority !== "NONE" ||
      route.authorMessageAuthority !== "NONE" || route.financialAuthority !== "NONE" ||
      route.identityClientId !== identityClientId ||
      !route.policyVersion || !route.deploymentName ||
      route.azureResourceId !== modelResourceId ||
      route.deploymentId !== deploymentResourceId ||
      route.modelRegisterId !== modelRegisterId ||
      !route.modelVersion || !route.region ||
      route.evaluationRequired !== true || route.executionLogRequired !== true ||
      route.costGovernanceRequired !== true) {
    throw new Error("SHADOW_ROUTE_DENIED");
  }
  if (event.entity !== ENTITY || event.workload !== WORKLOAD ||
      event.manuscriptApprovedForDiagnostic !== true ||
      ![835500002, 835500004].includes(event.currentOutcome)) {
    throw new Error("SHADOW_EVENT_DENIED");
  }
  const expiry = new Date(route.expiresAt).getTime();
  if (!Number.isFinite(expiry) || expiry <= Date.now()) throw new Error("SHADOW_ROUTE_EXPIRED");
  return { routeId: ROUTE_ID, policyVersion: route.policyVersion,
    azureResourceId: modelResourceId, deploymentId: route.deploymentId,
    deploymentName: route.deploymentName, modelRegisterId, modelVersion: route.modelVersion };
}

function evaluateStructure(currentOutcome, modelOutput) {
  const valid = modelOutput && typeof modelOutput === "object" &&
    typeof modelOutput.jm1_diagnosticoutputsummary === "string" &&
    modelOutput.jm1_diagnosticoutputsummary.length > 0 &&
    modelOutput.jm1_diagnosticoutputsummary.length <= 240 &&
    typeof modelOutput.jm1_diagnosticriskflags === "string" &&
    modelOutput.jm1_diagnosticriskflags.length <= 240 &&
    typeof modelOutput.jm1_confidence === "number" &&
    Number.isFinite(modelOutput.jm1_confidence) &&
    modelOutput.jm1_confidence >= 0 && modelOutput.jm1_confidence <= 1 &&
    modelOutput.jm1_requireshumanreview === true;
  const shadowOutcome = !valid ? "INVALID_OUTPUT" :
    modelOutput.jm1_confidence >= 0.85 ? 835500002 : 835500004;
  return {
    structureValid: Boolean(valid),
    currentOutcome,
    shadowOutcome,
    outcomeAgreement: currentOutcome === shadowOutcome,
    divergenceClass: !valid ? "AI_ERROR" :
      currentOutcome === shadowOutcome ? "NONE" : "AMBIGUOUS",
    groundedness: "NOT_PROVEN",
    hallucinatedFacts: "NOT_PROVEN",
    authorityReady: false,
  };
}

async function processStage0Event(event, route, ports) {
  const selection = authorizeRoute(event, route, ports.identityClientId,
    ports.modelResourceId, ports.modelRegisterId);
  const now = ports.now();
  const projectedCents = await ports.projectMaximumCost(event, selection);
  const reservation = await ports.ledger.reserve({
    sourceEventId: event.sourceEventId,
    policyVersion: selection.policyVersion,
    projectedCents,
    now,
  });
  if (reservation.outcome === "IDEMPOTENT_REPLAY") return { status: "IDEMPOTENT_REPLAY" };
  if (reservation.outcome === "BUDGET_DENIED") {
    await ports.alert("stage0_shadow_budget_denied", { sourceEventId: event.sourceEventId });
    return { status: "BUDGET_DENIED" };
  }

  const shadowExecutionId = randomUUID();
  const start = Date.now();
  let providerUsage = null;
  let input = null;
  try {
    input = await ports.readApprovedInput(event);
    const result = await ports.infer(input, selection);
    providerUsage = result.tokenCounts;
    const evaluation = evaluateStructure(event.currentOutcome, result.output);
    if (evaluation.structureValid) {
      if (typeof ports.evaluate !== "function") throw new Error("INDEPENDENT_EVALUATOR_NOT_BOUND");
      const verdict = await ports.evaluate({ input, output: result.output, selection, event });
      if (!verdict || typeof verdict.pass !== "boolean" || !verdict.evaluatorId ||
          !verdict.policyVersion || !verdict.method) {
        throw new Error("INDEPENDENT_EVALUATION_INVALID");
      }
      evaluation.independent = {
        pass: verdict.pass,
        evaluatorId: verdict.evaluatorId,
        policyVersion: verdict.policyVersion,
        method: verdict.method,
        failureClass: verdict.failureClass || null,
      };
    }
    const actualCents = ports.actualCostCents(result.tokenCounts);
    if (!Number.isSafeInteger(actualCents) || actualCents < 0 || actualCents > projectedCents) {
      throw new Error("SHADOW_COST_RECONCILIATION_FAILED");
    }
    const costAnomaly = actualCents > 10;
    const evaluationFailed = !evaluation.structureValid || !evaluation.independent.pass;
    await ports.ledger.recordEvidence(event.sourceEventId, selection.policyVersion, {
      shadowExecutionId,
      routeId: selection.routeId,
      deploymentId: selection.deploymentId,
      modelRegisterId: selection.modelRegisterId,
      sourceHashes: input.sourceReferenceIds,
      currentOutcome: event.currentOutcome,
      shadowOutcome: evaluation.shadowOutcome,
      evaluation,
      inputTokens: result.tokenCounts.input,
      outputTokens: result.tokenCounts.output,
      executionCostCents: actualCents,
      costAnomaly,
      latencyMs: Date.now() - start,
      status: evaluationFailed ? "EVALUATION_FAILED" : "SHADOW_ONLY",
      recordedAt: ports.now(),
    });
    await ports.ledger.finalize({
      sourceEventId: event.sourceEventId,
      policyVersion: selection.policyVersion,
      actualCents,
      status: evaluationFailed ? "EVALUATION_FAILED" : "SUCCEEDED",
      now: ports.now(),
      reservedAt: reservation.event.recordedAt,
    });
    if (costAnomaly) {
      ports.metric("stage0_shadow_cost_anomaly", 1);
      await ports.alert("stage0_shadow_cost_anomaly", { sourceEventId: event.sourceEventId });
    }
    if (evaluationFailed) {
      ports.metric("stage0_shadow_eval_fail", 1);
      await ports.alert("stage0_shadow_eval_fail", { sourceEventId: event.sourceEventId });
      return { status: "EVALUATION_FAILED", shadowExecutionId, evaluation };
    }
    ports.metric("stage0_shadow_success", 1);
    ports.metric("stage0_shadow_cost", actualCents / 100);
    if (!evaluation.outcomeAgreement) ports.metric("stage0_shadow_divergence", 1);
    return { status: "SHADOW_ONLY", shadowExecutionId, evaluation };
  } catch (error) {
    // A returned provider usage record is billable even when evaluation fails.
    // Ambiguous provider failures keep their reservation for reconciliation.
    let settled = false;
    if (providerUsage) {
      try {
        const actualCents = ports.actualCostCents(providerUsage);
        await ports.ledger.recordEvidence(event.sourceEventId, selection.policyVersion, {
          shadowExecutionId,
          routeId: selection.routeId,
          deploymentId: selection.deploymentId,
          modelRegisterId: selection.modelRegisterId,
          sourceHashes: input?.sourceReferenceIds || [],
          evaluation: { pass: false, failureClass: error.message },
          inputTokens: providerUsage.input,
          outputTokens: providerUsage.output,
          executionCostCents: actualCents,
          status: "EVALUATION_FAILED",
          recordedAt: ports.now(),
        });
        await ports.ledger.finalize({
          sourceEventId: event.sourceEventId,
          policyVersion: selection.policyVersion,
          actualCents,
          status: "EVALUATION_FAILED",
          now: ports.now(),
          reservedAt: reservation.event.recordedAt,
        });
        settled = true;
      } catch {
        ports.metric("stage0_shadow_cost_reconciliation_pending", 1);
      }
    }
    ports.metric("stage0_shadow_failure", 1);
    await ports.alert("stage0_shadow_failure", {
      sourceEventId: event.sourceEventId,
      code: error.message,
    });
    return { status: settled ? "EVALUATION_FAILED" : "FAILED_RESERVED", shadowExecutionId };
  }
}

module.exports = { ROUTE_ID, ENTITY, WORKLOAD, CANARY_EVENT_ID,
  authorizeRoute, evaluateStructure, processStage0Event };
