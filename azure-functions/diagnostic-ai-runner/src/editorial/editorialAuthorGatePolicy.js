"use strict";

const AUTHOR_DECISION = Object.freeze({
  APPROVE: 196650000,
  REQUEST_REVISION: 196650001,
  REQUEST_CLARIFICATION: 196650002,
  HOLD: 196650003,
  DECLINE: 196650004
});

const GATE_STATUS = Object.freeze({
  READY_FOR_AUTHOR_REVIEW: 196650001,
  AWAITING_AUTHOR: 196650002,
  RESPONSE_RECEIVED: 196650002,
  APPROVED: 196650003,
  RETURNED_FOR_REVISION: 196650004,
  HELD: 196650005,
  SUPERSEDED: 196650006
});

const STAGE_SEQUENCE = Object.freeze([
  "EDITORIAL_REVIEW",
  "DEVELOPMENTAL_EDITING",
  "LINE_EDITING",
  "COPYEDITING",
  "PROOFREADING"
]);

const STAGE_TRANSITIONS = Object.freeze({
  EDITORIAL_REVIEW: {
    next: "DEVELOPMENTAL_EDITING",
    authorLabel: "Editorial Review",
    reviewPrompt: "Your Editorial Review Is Ready for Review"
  },
  DEVELOPMENTAL_EDITING: {
    previous: "EDITORIAL_REVIEW",
    next: "LINE_EDITING",
    authorLabel: "Developmental Edit",
    reviewPrompt: "Your Developmental Edit Is Ready for Review"
  },
  LINE_EDITING: {
    previous: "DEVELOPMENTAL_EDITING",
    next: "COPYEDITING",
    authorLabel: "Line Edit",
    reviewPrompt: "Your Line Edit Is Ready for Review"
  },
  COPYEDITING: {
    previous: "LINE_EDITING",
    next: "PROOFREADING",
    authorLabel: "Copyedit",
    reviewPrompt: "Your Copyedit Is Ready for Review"
  },
  PROOFREADING: {
    previous: "COPYEDITING",
    next: "PRODUCTION_HANDOFF",
    authorLabel: "Proof",
    reviewPrompt: "Your Proof Is Ready for Final Review",
    finalApproval: true
  }
});

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDecisionLabel(value) {
  return normalizeString(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function decisionIsFullApproval(decision) {
  if (Number(decision) === AUTHOR_DECISION.APPROVE) return true;
  const label = normalizeDecisionLabel(decision);
  return label === "APPROVE" || label === "APPROVED" || label === "APPROVED_WITHOUT_CHANGES";
}

function decisionRequiresSameStageRevision(decision, summary = "") {
  if (Number(decision) === AUTHOR_DECISION.REQUEST_REVISION || Number(decision) === AUTHOR_DECISION.REQUEST_CLARIFICATION) {
    return true;
  }
  const text = `${normalizeDecisionLabel(decision)} ${normalizeString(summary).toUpperCase()}`;
  if (!text.trim()) return false;
  return [
    "REQUEST_REVISION",
    "REQUESTED_REVISION",
    "REQUEST_CHANGES",
    "REQUESTED_CHANGES",
    "REQUEST_CLARIFICATION",
    "APPROVED_WITH_CORRECTIONS",
    "APPROVED_PENDING_CHANGES",
    "CONDITIONAL_APPROVAL",
    "PARTIAL_APPROVAL",
    "MOSTLY_APPROVED"
  ].some((marker) => text.includes(marker));
}

function gateArtifactId(gate) {
  return normalizeString(gate?._jm1pub_deliverableartifactid_value || gate?.deliverableArtifactId || gate?.artifactId);
}

function gateIsSuperseded(gate) {
  const status = Number(gate?.jm1pub_gatestatus || gate?.gateStatus || 0);
  const name = normalizeString(gate?.jm1pub_editorialapprovalgatename || gate?.name).toLowerCase();
  return status === GATE_STATUS.SUPERSEDED || name.includes("superseded");
}

function gateHasFullAuthorApprovalForArtifact(gate, artifact) {
  if (!gate || !artifact || gateIsSuperseded(gate)) return false;
  const status = Number(gate.jm1pub_gatestatus || gate.gateStatus || 0);
  const decidedOn = normalizeString(gate.jm1pub_authordecisionon || gate.authorDecisionOn);
  const nextStageAuthorized = gate.jm1pub_nextstageauthorized === true || gate.nextStageAuthorized === true;
  const artifactMatches = gateArtifactId(gate) === normalizeString(artifact.jm1pub_editorialartifactid || artifact.artifactId);
  return Boolean(
    status === GATE_STATUS.APPROVED &&
    decisionIsFullApproval(gate.jm1pub_authordecision || gate.authorDecision) &&
    decidedOn &&
    nextStageAuthorized &&
    artifactMatches &&
    normalizeString(artifact.jm1pub_sha256 || artifact.sha256)
  );
}

function gateBlocksCurrentStageRuntime(gate) {
  if (!gate || gateIsSuperseded(gate)) return false;
  const status = Number(gate.jm1pub_gatestatus || gate.gateStatus || 0);
  const decision = gate.jm1pub_authordecision || gate.authorDecision;
  const summary = gate.jm1pub_authorresponsesummary || gate.authorResponseSummary || "";
  const boundArtifactId = gateArtifactId(gate);
  if (
    boundArtifactId &&
    gateHasFullAuthorApprovalForArtifact(gate, { jm1pub_editorialartifactid: boundArtifactId, jm1pub_sha256: "bound" })
  ) {
    return false;
  }
  if (decisionRequiresSameStageRevision(decision, summary)) return false;
  return (
    status === GATE_STATUS.READY_FOR_AUTHOR_REVIEW ||
    status === GATE_STATUS.AWAITING_AUTHOR ||
    status === GATE_STATUS.RESPONSE_RECEIVED ||
    status === GATE_STATUS.HELD ||
    status === GATE_STATUS.APPROVED
  );
}

function previousStageCode(stageCode) {
  return STAGE_TRANSITIONS[stageCode]?.previous || null;
}

function nextStageCode(stageCode) {
  return STAGE_TRANSITIONS[stageCode]?.next || null;
}

function stageRequiresAuthorApprovalBeforeExecution(stageCode) {
  return Boolean(previousStageCode(stageCode));
}

function selectApprovedArtifactForStage({ artifacts = [], gates = [] } = {}) {
  const approvedArtifacts = artifacts.filter((artifact) => artifact?.jm1pub_iscurrentapproved === true || artifact?.isCurrentApproved === true);
  for (const artifact of approvedArtifacts) {
    const gate = gates.find((candidate) => gateHasFullAuthorApprovalForArtifact(candidate, artifact));
    if (gate) return { ok: true, artifact, gate };
  }
  return {
    ok: false,
    reason: approvedArtifacts.length ? "AUTHOR_APPROVAL_NOT_BOUND_TO_CURRENT_ARTIFACT" : "APPROVED_ARTIFACT_MISSING"
  };
}

function evaluateNextStageEligibility({ stageCode, upstreamArtifacts = [], upstreamGates = [] } = {}) {
  const previous = previousStageCode(stageCode);
  if (!previous) return { ok: true, previousStageCode: null, reason: "NO_UPSTREAM_AUTHOR_GATE_REQUIRED" };
  const selected = selectApprovedArtifactForStage({ artifacts: upstreamArtifacts, gates: upstreamGates });
  if (!selected.ok) {
    return { ok: false, previousStageCode: previous, reason: `${previous}_AUTHOR_APPROVAL_REQUIRED — ${selected.reason}` };
  }
  return {
    ok: true,
    previousStageCode: previous,
    approvedArtifactId: selected.artifact.jm1pub_editorialartifactid || selected.artifact.artifactId,
    approvedArtifactHash: selected.artifact.jm1pub_sha256 || selected.artifact.sha256,
    approvalGateId: selected.gate.jm1pub_editorialapprovalgateid || selected.gate.gateId
  };
}

function createAuthorReviewGatePlan({ stageCode, titleId, stageId, artifact, existingGates = [] } = {}) {
  const artifactId = normalizeString(artifact?.jm1pub_editorialartifactid || artifact?.artifactId);
  const artifactHash = normalizeString(artifact?.jm1pub_sha256 || artifact?.sha256);
  if (!artifactId || !artifactHash) {
    return { ok: false, reason: "AUTHOR_REVIEW_ARTIFACT_BINDING_MISSING" };
  }
  const existing = existingGates.find((gate) => !gateIsSuperseded(gate) && gateArtifactId(gate) === artifactId);
  if (existing) {
    return {
      ok: true,
      idempotent: true,
      gateId: existing.jm1pub_editorialapprovalgateid || existing.gateId,
      artifactId,
      artifactHash
    };
  }
  const policy = STAGE_TRANSITIONS[stageCode] || {};
  return {
    ok: true,
    idempotent: false,
    stageCode,
    titleId,
    stageId,
    artifactId,
    artifactHash,
    nextStageAuthorized: false,
    gateStatus: GATE_STATUS.AWAITING_AUTHOR,
    reviewPrompt: policy.reviewPrompt || "Your Editorial Review Is Ready for Review",
    authorLabel: policy.authorLabel || stageCode
  };
}

function classifyAuthorDecisionForStage({ decision, summary = "", gate = null, artifact = null } = {}) {
  if (gate && artifact && gateHasFullAuthorApprovalForArtifact(gate, artifact)) {
    return { stageDisposition: "APPROVED", nextStageAuthorized: true };
  }
  if (decisionIsFullApproval(decision)) {
    return { stageDisposition: "APPROVED", nextStageAuthorized: true };
  }
  if (decisionRequiresSameStageRevision(decision, summary)) {
    return { stageDisposition: "RETURNED_FOR_REVISION", nextStageAuthorized: false };
  }
  const label = normalizeDecisionLabel(decision);
  if (label.includes("HOLD")) return { stageDisposition: "HELD", nextStageAuthorized: false };
  if (label.includes("DECLINE")) return { stageDisposition: "HELD", nextStageAuthorized: false };
  return { stageDisposition: "AWAITING_AUTHOR_RESPONSE", nextStageAuthorized: false };
}

module.exports = {
  AUTHOR_DECISION,
  GATE_STATUS,
  STAGE_SEQUENCE,
  STAGE_TRANSITIONS,
  classifyAuthorDecisionForStage,
  createAuthorReviewGatePlan,
  decisionIsFullApproval,
  decisionRequiresSameStageRevision,
  evaluateNextStageEligibility,
  gateBlocksCurrentStageRuntime,
  gateHasFullAuthorApprovalForArtifact,
  nextStageCode,
  previousStageCode,
  selectApprovedArtifactForStage,
  stageRequiresAuthorApprovalBeforeExecution
};
