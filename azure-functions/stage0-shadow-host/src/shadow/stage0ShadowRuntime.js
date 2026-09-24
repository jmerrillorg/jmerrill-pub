"use strict";

const { randomUUID } = require("node:crypto");

const ROUTE_ID = "STAGE_0_DIAGNOSTIC_SHADOW_ONLY";
const ENTITY = "J_MERRILL_PUBLISHING";
const WORKLOAD = "STAGE_0_DIAGNOSTIC_SHADOW";

function authorizeRoute(event, route, identityClientId) {
  if (!event || !route || !identityClientId) throw new Error("SHADOW_AUTHORITY_MISSING");
  if (route.status !== "ACTIVE" || route.id !== ROUTE_ID || route.entity !== ENTITY ||
      route.workload !== WORKLOAD || route.mode !== "SHADOW_ONLY" ||
      route.actionAuthority !== "READ_ONLY" || route.businessWriteAuthority !== "NONE" ||
      route.authorMessageAuthority !== "NONE" || route.financialAuthority !== "NONE" ||
      route.identityClientId !== identityClientId ||
      !route.policyVersion || !route.deploymentId ||
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
  return { routeId: ROUTE_ID, policyVersion: route.policyVersion, deploymentId: route.deploymentId };
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
  const selection = authorizeRoute(event, route, ports.identityClientId);
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
  try {
    const input = await ports.readApprovedInput(event);
    const result = await ports.infer(input, selection);
    const evaluation = evaluateStructure(event.currentOutcome, result.output);
    const actualCents = ports.actualCostCents(result.tokenCounts);
    if (!Number.isSafeInteger(actualCents) || actualCents < 0 || actualCents > projectedCents) {
      throw new Error("SHADOW_COST_RECONCILIATION_FAILED");
    }
    await ports.ledger.recordEvidence(event.sourceEventId, selection.policyVersion, {
      shadowExecutionId,
      routeId: selection.routeId,
      deploymentId: selection.deploymentId,
      currentOutcome: event.currentOutcome,
      shadowOutcome: evaluation.shadowOutcome,
      evaluation,
      inputTokens: result.tokenCounts.input,
      outputTokens: result.tokenCounts.output,
      executionCostCents: actualCents,
      latencyMs: Date.now() - start,
      status: "SHADOW_ONLY",
      recordedAt: ports.now(),
    });
    await ports.ledger.finalize({
      sourceEventId: event.sourceEventId,
      policyVersion: selection.policyVersion,
      actualCents,
      status: "SUCCEEDED",
      now: ports.now(),
    });
    ports.metric("stage0_shadow_success", 1);
    ports.metric("stage0_shadow_cost", actualCents / 100);
    if (!evaluation.outcomeAgreement) ports.metric("stage0_shadow_divergence", 1);
    return { status: "SHADOW_ONLY", shadowExecutionId, evaluation };
  } catch (error) {
    // An ambiguous provider failure may already have incurred cost. Keep the
    // reservation and deny replay until reconciliation instead of spending twice.
    ports.metric("stage0_shadow_failure", 1);
    await ports.alert("stage0_shadow_failure", {
      sourceEventId: event.sourceEventId,
      code: error.message,
    });
    return { status: "FAILED_RESERVED", shadowExecutionId };
  }
}

module.exports = { ROUTE_ID, ENTITY, WORKLOAD, authorizeRoute, evaluateStructure, processStage0Event };
