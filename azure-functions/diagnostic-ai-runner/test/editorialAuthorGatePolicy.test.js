"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  AUTHOR_DECISION,
  GATE_STATUS,
  STAGE_SEQUENCE,
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
} = require("../src/editorial/editorialAuthorGatePolicy");

function approvedGate(overrides = {}) {
  return {
    jm1pub_editorialapprovalgateid: "gate-1",
    jm1pub_gatestatus: GATE_STATUS.APPROVED,
    jm1pub_authordecision: AUTHOR_DECISION.APPROVE,
    jm1pub_authordecisionon: "2026-08-14T12:00:00Z",
    jm1pub_nextstageauthorized: true,
    _jm1pub_deliverableartifactid_value: "artifact-1",
    ...overrides
  };
}

function artifact(overrides = {}) {
  return {
    jm1pub_editorialartifactid: "artifact-1",
    jm1pub_sha256: "sha-1",
    jm1pub_iscurrentapproved: true,
    ...overrides
  };
}

test("canonical editorial stage sequence requires author approval between all stage transitions", () => {
  assert.deepEqual(STAGE_SEQUENCE, [
    "EDITORIAL_REVIEW",
    "DEVELOPMENTAL_EDITING",
    "LINE_EDITING",
    "COPYEDITING",
    "PROOFREADING"
  ]);
  assert.equal(nextStageCode("EDITORIAL_REVIEW"), "DEVELOPMENTAL_EDITING");
  assert.equal(nextStageCode("DEVELOPMENTAL_EDITING"), "LINE_EDITING");
  assert.equal(nextStageCode("LINE_EDITING"), "COPYEDITING");
  assert.equal(nextStageCode("COPYEDITING"), "PROOFREADING");
  assert.equal(nextStageCode("PROOFREADING"), "PRODUCTION_HANDOFF");
});

test("stage zero does not require upstream approval before execution", () => {
  assert.equal(previousStageCode("EDITORIAL_REVIEW"), null);
  assert.equal(stageRequiresAuthorApprovalBeforeExecution("EDITORIAL_REVIEW"), false);
  assert.equal(evaluateNextStageEligibility({ stageCode: "EDITORIAL_REVIEW" }).ok, true);
});

test("developmental editing requires editorial review author approval first", () => {
  assert.equal(previousStageCode("DEVELOPMENTAL_EDITING"), "EDITORIAL_REVIEW");
  assert.equal(stageRequiresAuthorApprovalBeforeExecution("DEVELOPMENTAL_EDITING"), true);
  const result = evaluateNextStageEligibility({ stageCode: "DEVELOPMENTAL_EDITING" });
  assert.equal(result.ok, false);
  assert.match(result.reason, /EDITORIAL_REVIEW_AUTHOR_APPROVAL_REQUIRED/);
});

test("full approval must be explicit", () => {
  assert.equal(decisionIsFullApproval(AUTHOR_DECISION.APPROVE), true);
  assert.equal(decisionIsFullApproval("approved without changes"), true);
  assert.equal(decisionIsFullApproval("approved with corrections"), false);
  assert.equal(decisionIsFullApproval(AUTHOR_DECISION.REQUEST_REVISION), false);
});

test("conditional or partial approval returns the same stage for revision", () => {
  assert.equal(decisionRequiresSameStageRevision("APPROVED_WITH_CORRECTIONS"), true);
  assert.equal(decisionRequiresSameStageRevision("PARTIAL_APPROVAL"), true);
  assert.equal(decisionRequiresSameStageRevision(AUTHOR_DECISION.REQUEST_CLARIFICATION), true);
  assert.equal(decisionRequiresSameStageRevision(AUTHOR_DECISION.APPROVE), false);
});

test("full author approval is valid only when bound to the exact checksum artifact", () => {
  assert.equal(gateHasFullAuthorApprovalForArtifact(approvedGate(), artifact()), true);
  assert.equal(gateHasFullAuthorApprovalForArtifact(approvedGate(), artifact({ jm1pub_sha256: "" })), false);
  assert.equal(gateHasFullAuthorApprovalForArtifact(approvedGate({ _jm1pub_deliverableartifactid_value: "other" }), artifact()), false);
  assert.equal(gateHasFullAuthorApprovalForArtifact(approvedGate({ jm1pub_nextstageauthorized: false }), artifact()), false);
  assert.equal(gateHasFullAuthorApprovalForArtifact(approvedGate({ jm1pub_authordecisionon: "" }), artifact()), false);
});

test("superseded approval gates never authorize next stage execution", () => {
  const gate = approvedGate({ jm1pub_gatestatus: GATE_STATUS.SUPERSEDED });
  assert.equal(gateHasFullAuthorApprovalForArtifact(gate, artifact()), false);
  assert.equal(gateBlocksCurrentStageRuntime(gate), false);
});

test("awaiting author and response received gates block current stage runtime", () => {
  assert.equal(gateBlocksCurrentStageRuntime({ jm1pub_gatestatus: GATE_STATUS.AWAITING_AUTHOR }), true);
  assert.equal(gateBlocksCurrentStageRuntime({ jm1pub_gatestatus: GATE_STATUS.RESPONSE_RECEIVED }), true);
  assert.equal(gateBlocksCurrentStageRuntime({ jm1pub_gatestatus: GATE_STATUS.HELD }), true);
});

test("approved gate without deliverable binding still blocks runtime", () => {
  assert.equal(gateBlocksCurrentStageRuntime(approvedGate({ _jm1pub_deliverableartifactid_value: "" })), true);
});

test("revision-request decisions do not advance next stage", () => {
  const result = classifyAuthorDecisionForStage({ decision: "APPROVED_WITH_CORRECTIONS" });
  assert.deepEqual(result, { stageDisposition: "RETURNED_FOR_REVISION", nextStageAuthorized: false });
});

test("full author approval classification authorizes next stage", () => {
  const result = classifyAuthorDecisionForStage({ gate: approvedGate(), artifact: artifact() });
  assert.deepEqual(result, { stageDisposition: "APPROVED", nextStageAuthorized: true });
});

test("selectApprovedArtifactForStage chooses only current approved artifacts with full gate approval", () => {
  const selected = selectApprovedArtifactForStage({
    artifacts: [artifact({ jm1pub_editorialartifactid: "old", jm1pub_iscurrentapproved: false }), artifact()],
    gates: [approvedGate()]
  });
  assert.equal(selected.ok, true);
  assert.equal(selected.artifact.jm1pub_editorialartifactid, "artifact-1");
});

test("selectApprovedArtifactForStage fails closed when approval is bound to stale artifact", () => {
  const selected = selectApprovedArtifactForStage({
    artifacts: [artifact()],
    gates: [approvedGate({ _jm1pub_deliverableartifactid_value: "old-artifact" })]
  });
  assert.equal(selected.ok, false);
  assert.equal(selected.reason, "AUTHOR_APPROVAL_NOT_BOUND_TO_CURRENT_ARTIFACT");
});

test("createAuthorReviewGatePlan creates one awaiting-author gate per deliverable artifact", () => {
  const plan = createAuthorReviewGatePlan({
    stageCode: "LINE_EDITING",
    titleId: "title-1",
    stageId: "stage-line",
    artifact: artifact()
  });
  assert.equal(plan.ok, true);
  assert.equal(plan.idempotent, false);
  assert.equal(plan.gateStatus, GATE_STATUS.AWAITING_AUTHOR);
  assert.equal(plan.nextStageAuthorized, false);
  assert.equal(plan.artifactId, "artifact-1");
});

test("createAuthorReviewGatePlan is idempotent for an existing non-superseded artifact gate", () => {
  const plan = createAuthorReviewGatePlan({
    stageCode: "COPYEDITING",
    titleId: "title-1",
    stageId: "stage-copy",
    artifact: artifact(),
    existingGates: [approvedGate()]
  });
  assert.equal(plan.ok, true);
  assert.equal(plan.idempotent, true);
  assert.equal(plan.gateId, "gate-1");
});

test("createAuthorReviewGatePlan fails closed without artifact checksum", () => {
  const plan = createAuthorReviewGatePlan({
    stageCode: "PROOFREADING",
    titleId: "title-1",
    stageId: "stage-proof",
    artifact: artifact({ jm1pub_sha256: "" })
  });
  assert.equal(plan.ok, false);
  assert.equal(plan.reason, "AUTHOR_REVIEW_ARTIFACT_BINDING_MISSING");
});
