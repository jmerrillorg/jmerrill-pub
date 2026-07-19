"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");

const {
  buildApprovalEventFromGate,
  consumeApprovalEvent,
  runAutomaticApprovalEventConsumer
} = require("../src/orchestration/approvalEventConsumer");

const approvalGateId = "be079017-0983-f111-ab0f-000d3a14673b";
const titleId = "e797232b-da7a-f111-ab0f-00224820105b";
const stageId = "e0e2e9ee-0883-f111-ab0f-000d3a14673b";
const artifactId = "6c01c3f7-0883-f111-ab0f-000d3a14673b";
const checksum = "d038b45dddb7b797cc69d576f5fbeb4520a85d84c61162c180c506666200b922";

function createMockClient(overrides = {}) {
  const calls = { created: [], patched: [] };
  const client = {
    calls,
    async list() {
      return [];
    },
    async first(entitySet, query) {
      const filter = query?.$filter || "";
      if (entitySet === "jm1pub_editorialstages") {
        return {
          jm1pub_editorialstageid: stageId,
          jm1pub_name: "Proofreading",
          jm1pub_stagestatus: 100000002
        };
      }
      if (entitySet === "jm1pub_editorialartifacts") {
        return {
          jm1pub_editorialartifactid: artifactId,
          jm1pub_sha256: checksum,
          jm1pub_repositoryitemid: "01DF3SEQJAMN5URIB7PVFIEBA2YUH6XTS4",
          jm1pub_repositorypath: "01_Titles/05_Proofreading/The Intentional Leader"
        };
      }
      if (entitySet === "jm1pub_titles") {
        return {
          jm1pub_titleid: titleId,
          jm1pub_titlename: "The Intentional Leader"
        };
      }
      if (entitySet === "jm1_executionlogs" && filter.includes("AUTHOR_PACKAGE_ATTACHMENT_EVIDENCE_RECORDED")) {
        return overrides.completeNotification === false
          ? null
          : {
              jm1_executionlogid: "attachment-evidence",
              jm1_actiondescription: "Corrected send included required attachment artifact IDs and checksums."
            };
      }
      if (entitySet === "jm1_executionlogs") return null;
      return null;
    },
    async create(entitySet, payload) {
      calls.created.push({ entitySet, payload });
      return `${payload.jm1_actiontype || entitySet}-id`;
    },
    async patch(entitySet, id, payload) {
      calls.patched.push({ entitySet, id, payload });
    }
  };
  return client;
}

function approvedGate(summary = "Corrected notification sent with required attachments.", source = "corrected-notification:c782bdb8-2e6c-46f5-ad9c-c57d3b5f836c") {
  return {
    jm1pub_editorialapprovalgateid: approvalGateId,
    jm1pub_authordecisionon: "2026-07-19T15:00:00Z",
    jm1pub_authorresponsesummary: summary,
    jm1pub_authordecisionsource: source,
    _jm1pub_titleid_value: titleId,
    _jm1pub_editorialstageid_value: stageId,
    _jm1pub_deliverableartifactid_value: artifactId
  };
}

test("Azure Functions timer is the durable consumer, not a GitHub scheduled workflow", () => {
  const wrapper = readFileSync("src/functions/runApprovalEventConsumer.js", "utf8");
  const index = readFileSync("src/index.js", "utf8");
  assert.match(wrapper, /app\.timer\("run-approval-event-consumer"/);
  assert.match(wrapper, /schedule: "0 \*\/5 \* \* \* \*"/);
  assert.match(index, /runApprovalEventConsumer/);
});

test("approval event emission starts at committed gate persistence and complete notification evidence", async () => {
  const client = createMockClient();
  const event = await buildApprovalEventFromGate(client, approvedGate(), "SCHEDULED_WORKER");
  assert.equal(event.eventType, "PROOFREADING_APPROVED");
  assert.equal(event.triggerSource, "AUTHOR_APPROVAL");
  assert.equal(event.gateId, approvalGateId);
  assert.equal(event.approvedArtifactChecksum, checksum);
  assert.match(event.idempotencyKey, /^approval-event:PROOFREADING_APPROVED:/);
});

test("approval event is not emitted without complete attachment-aware notification evidence", async () => {
  const client = createMockClient({ completeNotification: false });
  const event = await buildApprovalEventFromGate(
    client,
    approvedGate("Workspace link only; no attachment evidence.", "notification:not-returned-by-relay"),
    "SCHEDULED_WORKER"
  );
  assert.equal(event, null);
});

test("consumer claims and dead-letters malformed gates idempotently", async () => {
  const client = createMockClient();
  client.list = async () => [
    {
      jm1pub_editorialapprovalgateid: approvalGateId,
      jm1pub_authordecisionon: "2026-07-19T15:00:00Z"
    }
  ];
  const result = await runAutomaticApprovalEventConsumer({ maxEvents: 1 }, { client });
  assert.equal(result.blocked, 1);
  assert.equal(result.results[0].detail, "payload_missing_required_reference_or_complete_notification");
  assert.equal(client.calls.created[0].payload.jm1_actiontype, "EDITORIAL_APPROVAL_EVENT_BLOCKED");
});

test("normal transition path records that no publisher action route, GitHub Action, or Cody session is required", async () => {
  const source = readFileSync("src/orchestration/approvalEventConsumer.js", "utf8");
  assert.match(source, /No Publisher Center action, GitHub Action, Cody session, or manual API request is required for the normal path/);
  assert.match(source, /EDITORIAL_APPROVAL_EVENT_CLAIMED/);
  assert.match(source, /EDITORIAL_APPROVAL_EVENT_CONSUMED/);
});

test("automatic consumer can close Proofreading and start Interior Layout from approval persistence", async () => {
  const client = createMockClient();
  const event = await buildApprovalEventFromGate(client, approvedGate(), "SCHEDULED_WORKER");
  const result = await consumeApprovalEvent(client, event);
  assert.equal(result.status, "transition-completed");
  assert.ok(client.calls.patched.some((call) => call.entitySet === "jm1pub_editorialapprovalgates" && call.payload.jm1pub_gatestatus === 196650003));
  assert.ok(client.calls.patched.some((call) => call.entitySet === "jm1pub_editorialstages" && call.payload.jm1pub_stagestatus === 100000008));
  assert.ok(client.calls.created.some((call) => call.entitySet === "jm1_productionprojects"));
  assert.ok(client.calls.created.some((call) => call.entitySet === "jm1_productiontasks"));
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "EDITORIAL_APPROVAL_EVENT_CONSUMED"));
});
