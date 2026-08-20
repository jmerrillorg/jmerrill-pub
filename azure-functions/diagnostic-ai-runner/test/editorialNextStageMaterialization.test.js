"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");

const {
  STAGE_STATUS,
  STAGE_TYPES,
  evaluateEditorialNextStageMaterialization,
  inputFromApprovalEvent,
  materializationIdempotencyKey,
  runEditorialNextStageMaterialization
} = require("../src/editorial/editorialNextStageMaterialization");
const { consumeApprovalEvent } = require("../src/orchestration/approvalEventConsumer");

const titleId = "title-1";
const completedStageId = "stage-dev";
const artifactId = "artifact-dev";
const gateId = "gate-dev";
const checksum = "a".repeat(64);

function title(overrides = {}) {
  return {
    jm1pub_titleid: titleId,
    jm1pub_titlename: "The General's Will and Last Testament",
    jm1pub_authorname: "Iyorwuese Hagher",
    ...overrides
  };
}

function completedStage(overrides = {}) {
  return {
    jm1pub_editorialstageid: completedStageId,
    jm1pub_name: "Developmental Editing - The General's Will and Last Testament",
    jm1pub_stagetype: STAGE_TYPES.DEVELOPMENTAL_EDITING,
    jm1pub_stagestatus: STAGE_STATUS.COMPLETE,
    jm1pub_stagesequence: 2,
    _jm1pub_titleid_value: titleId,
    _jm1pub_publishingassetid_value: "asset-1",
    _jm1pub_contactid_value: "contact-1",
    ...overrides
  };
}

function artifact(overrides = {}) {
  return {
    jm1pub_editorialartifactid: artifactId,
    jm1pub_editorialartifactname: "Editorial Working Version - Jackie Restoration.docx",
    jm1pub_filename: "Editorial Working Version - Jackie Restoration.docx",
    jm1pub_sha256: checksum,
    jm1pub_repositoryitemid: "01DF3SEQITEM",
    _jm1pub_titleid_value: titleId,
    _jm1pub_editorialstageid_value: completedStageId,
    ...overrides
  };
}

function gate(overrides = {}) {
  return {
    jm1pub_editorialapprovalgateid: gateId,
    jm1pub_gatestatus: 196650003,
    jm1pub_authordecision: 196650000,
    jm1pub_authordecisionon: "2026-08-11T18:00:00Z",
    jm1pub_authordecisionsource: "PHONE / VERBAL",
    jm1pub_nextstageauthorized: true,
    _jm1pub_titleid_value: titleId,
    _jm1pub_editorialstageid_value: completedStageId,
    _jm1pub_deliverableartifactid_value: artifactId,
    ...overrides
  };
}

function materializationInput(overrides = {}) {
  return {
    executionMode: "DRY_RUN",
    titleId,
    completedStageId,
    completedStageCode: "DEVELOPMENTAL_EDITING",
    approvedArtifactId: artifactId,
    approvedArtifactChecksum: checksum,
    approvalGateId: gateId,
    approvalDecisionId: "decision-1",
    targetStageCode: "LINE_EDITING",
    expectedCurrentState: "DEVELOPMENTAL_EDITING_COMPLETE",
    ...overrides
  };
}

function createMockClient(overrides = {}) {
  const calls = { created: [], listed: [] };
  const rows = {
    titles: [title()],
    completedStages: [completedStage()],
    artifacts: [artifact()],
    gates: [gate()],
    targetStages: [],
    executionLogs: [],
    ...(overrides.rows || {})
  };
  return {
    calls,
    async list(entitySet, query = {}) {
      calls.listed.push({ entitySet, query });
      const filter = query.$filter || "";
      if (entitySet === "jm1pub_titles") return rows.titles;
      if (entitySet === "jm1pub_editorialartifacts") return rows.artifacts;
      if (entitySet === "jm1pub_editorialapprovalgates") return rows.gates;
      if (entitySet === "jm1_executionlogs") return rows.executionLogs;
      if (entitySet === "jm1pub_editorialstages") {
        if (filter.includes(`jm1pub_stagetype eq ${STAGE_TYPES.LINE_EDITING}`)) return rows.targetStages;
        return rows.completedStages;
      }
      return [];
    },
    async create(entitySet, payload) {
      calls.created.push({ entitySet, payload });
      if (entitySet === "jm1pub_editorialstages") return "stage-line";
      if (entitySet === "jm1_executionlogs") return `${payload.jm1_actiontype}-log`;
      return `${entitySet}-id`;
    }
  };
}

test("materializer dry-run creates a Line Editing plan from completed Developmental approval evidence", async () => {
  const client = createMockClient();
  const result = await evaluateEditorialNextStageMaterialization(materializationInput(), { client });
  assert.equal(result.ok, true);
  assert.equal(result.status, "DRY_RUN_READY");
  assert.equal(result.targetStageCode, "LINE_EDITING");
  assert.equal(result.approvalGate.nextStageAuthorized, true);
});

test("execute creates exactly one Line Editing stage and one materialization log", async () => {
  const client = createMockClient();
  const result = await runEditorialNextStageMaterialization(materializationInput({ executionMode: "EXECUTE" }), { client });
  assert.equal(result.status, "MATERIALIZED");
  assert.equal(result.targetStage.stageCode, "LINE_EDITING");
  assert.equal(result.externalSends, 0);
  assert.equal(client.calls.created.filter((call) => call.entitySet === "jm1pub_editorialstages").length, 1);
  assert.equal(client.calls.created.filter((call) => call.entitySet === "jm1_executionlogs").length, 1);
  const payload = client.calls.created.find((call) => call.entitySet === "jm1pub_editorialstages").payload;
  assert.equal(payload.jm1pub_stagetype, STAGE_TYPES.LINE_EDITING);
  assert.equal(payload.jm1pub_stagestatus, STAGE_STATUS.IN_PROGRESS);
  assert.match(payload.jm1pub_internaloperationalsummary, /Idempotency/);
});

test("replay with matching provenance is idempotent and creates no duplicate target stage", async () => {
  const input = materializationInput();
  const key = materializationIdempotencyKey(input);
  const client = createMockClient({
    rows: {
      targetStages: [
        {
          jm1pub_editorialstageid: "stage-line",
          jm1pub_name: "Line Editing - The General's Will and Last Testament",
          jm1pub_stagetype: STAGE_TYPES.LINE_EDITING,
          jm1pub_stagestatus: STAGE_STATUS.IN_PROGRESS,
          jm1pub_internaloperationalsummary: `Already done. Idempotency ${key}.`
        }
      ]
    }
  });
  const result = await runEditorialNextStageMaterialization(input, { client });
  assert.equal(result.status, "IDEMPOTENT");
  assert.equal(client.calls.created.length, 0);
});

test("materializer blocks when the completed stage is not complete", async () => {
  const client = createMockClient({ rows: { completedStages: [completedStage({ jm1pub_stagestatus: STAGE_STATUS.IN_PROGRESS })] } });
  const result = await evaluateEditorialNextStageMaterialization(materializationInput(), { client });
  assert.equal(result.ok, false);
  assert.equal(result.code, "COMPLETED_STAGE_NOT_COMPLETE");
});

test("materializer blocks when the approval gate is conditional or not final approval", async () => {
  const client = createMockClient({ rows: { gates: [gate({ jm1pub_authordecision: 196650001 })] } });
  const result = await evaluateEditorialNextStageMaterialization(materializationInput(), { client });
  assert.equal(result.ok, false);
  assert.equal(result.code, "AUTHOR_FULL_APPROVAL_REQUIRED");
});

test("materializer blocks when nextStageAuthorized is false", async () => {
  const client = createMockClient({ rows: { gates: [gate({ jm1pub_nextstageauthorized: false })] } });
  const result = await evaluateEditorialNextStageMaterialization(materializationInput(), { client });
  assert.equal(result.ok, false);
  assert.equal(result.code, "NEXT_STAGE_NOT_AUTHORIZED");
});

test("materializer blocks when approval binds to a different artifact", async () => {
  const client = createMockClient({ rows: { gates: [gate({ _jm1pub_deliverableartifactid_value: "other-artifact" })] } });
  const result = await evaluateEditorialNextStageMaterialization(materializationInput(), { client });
  assert.equal(result.ok, false);
  assert.equal(result.code, "APPROVAL_GATE_BINDS_DIFFERENT_ARTIFACT");
});

test("materializer blocks when checksum does not match the approved artifact", async () => {
  const client = createMockClient({ rows: { artifacts: [artifact({ jm1pub_sha256: "b".repeat(64) })] } });
  const result = await evaluateEditorialNextStageMaterialization(materializationInput(), { client });
  assert.equal(result.ok, false);
  assert.equal(result.code, "APPROVED_ARTIFACT_CHECKSUM_MISMATCH");
});

test("materializer blocks wrong target stage instead of inventing a sequence", async () => {
  const client = createMockClient();
  const result = await evaluateEditorialNextStageMaterialization(materializationInput({ targetStageCode: "COPYEDITING" }), { client });
  assert.equal(result.ok, false);
  assert.equal(result.code, "TARGET_STAGE_SEQUENCE_MISMATCH");
});

test("materializer blocks duplicate target stages", async () => {
  const client = createMockClient({
    rows: {
      targetStages: [
        { jm1pub_editorialstageid: "stage-line-1", jm1pub_stagetype: STAGE_TYPES.LINE_EDITING },
        { jm1pub_editorialstageid: "stage-line-2", jm1pub_stagetype: STAGE_TYPES.LINE_EDITING }
      ]
    }
  });
  const result = await evaluateEditorialNextStageMaterialization(materializationInput(), { client });
  assert.equal(result.ok, false);
  assert.equal(result.code, "DUPLICATE_TARGET_STAGE_EXISTS");
});

test("approval event input maps Developmental completion to Line Editing", () => {
  const input = inputFromApprovalEvent({
    titleId,
    currentStageId: completedStageId,
    currentStageCode: "DEVELOPMENTAL_EDITING",
    approvedArtifactId: artifactId,
    approvedArtifactChecksum: checksum,
    gateId,
    eventId: "event-1"
  });
  assert.equal(input.targetStageCode, "LINE_EDITING");
  assert.equal(input.expectedCurrentState, "DEVELOPMENTAL_EDITING_COMPLETE");
});

test("approval consumer routes Developmental approval to next-stage materialization", async () => {
  const client = createMockClient();
  const result = await consumeApprovalEvent(client, {
    eventType: "EDITORIAL_STAGE_APPROVED",
    eventId: "event-1",
    titleId,
    currentStageId: completedStageId,
    stageId: completedStageId,
    currentStageCode: "DEVELOPMENTAL_EDITING",
    approvedArtifactId: artifactId,
    approvedArtifactChecksum: checksum,
    gateId,
    authorResponseId: "decision-1",
    idempotencyKey: "approval-event:dev"
  });
  assert.equal(result.status, "transition-completed");
  assert.ok(client.calls.created.some((call) => call.entitySet === "jm1pub_editorialstages"));
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "EDITORIAL_APPROVAL_EVENT_CONSUMED"));
});

test("function route is registered without adding author communication behavior", () => {
  const wrapper = readFileSync("src/functions/runEditorialNextStageMaterialization.js", "utf8");
  const index = readFileSync("src/index.js", "utf8");
  assert.match(wrapper, /run-editorial-next-stage-materialization/);
  assert.match(wrapper, /JM1_DIAGNOSTIC_RUNNER_KEY/);
  assert.doesNotMatch(wrapper, /sendMail|messages\/send|notification/i);
  assert.match(index, /runEditorialNextStageMaterialization/);
});
