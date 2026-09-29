"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { projectLegacyEditorialAction } = require("../src/author/currentAuthorActionProjection");
const { scanCurrentAuthorActions } = require("../src/author/currentAuthorActionCensus");
const { evaluateMailboxResponseSearch } = require("../src/author/currentAuthorResponseSearch");

const titleId = "daf8180f-85a3-f111-b8de-000d3a14673b";
const authorId = "106a78d0-fb9a-f111-b8dc-6045bdd69738";
const stageId = "ae3c9d5e-bcdd-4a97-90c0-5bbc5bd8334f";
const gateId = "4d04daa2-aabd-43f8-9a56-3e55af125ef6";
const artifactId = "a86d3188-b6b2-4f69-b7c6-41bd01ee0b4b";
const providerId = "82df9cc1-49e9-4bd3-a369-b57506470a2b";
const checksum = "a".repeat(64);
const base = {
  title: { jm1pub_titleid: titleId, _jm1_author_value: authorId },
  stages: [{ jm1pub_editorialstageid: stageId, _jm1pub_titleid_value: titleId,
    _jm1pub_contactid_value: authorId, jm1pub_stagesequence: 2,
    jm1pub_stagestatus: 100000002, jm1pub_stagetype: 100000001,
    jm1pub_intakereference: "JMP-INT-202608-JFLY01" }],
  gates: [{ jm1pub_editorialapprovalgateid: gateId, _jm1pub_titleid_value: titleId,
    _jm1pub_editorialstageid_value: stageId, _jm1pub_deliverableartifactid_value: artifactId,
    jm1pub_gatestatus: 196650002 }],
  artifacts: [{ jm1pub_editorialartifactid: artifactId, _jm1pub_titleid_value: titleId,
    _jm1pub_editorialstageid_value: stageId, jm1pub_sha256: checksum }],
  sendEvents: [{ jm1_executionlogid: "2ab9de41-10be-483a-8664-9b7ef9b612a9",
    jm1_actiontype: "PACKAGE_CADENCE_RELEASE_AUTHOR_PACKAGE_SENT", jm1_sourcerecordid: stageId,
    jm1_actiondescription: `DELIVERY_STATUS=SENT; providerMessageId=${providerId}; gate=${gateId}; checksums=editedManuscript:${checksum};`,
    createdon: "2026-09-21T17:00:00.000Z" }],
  intentEvents: [{ jm1_actiontype: "AUTHOR_COMMUNICATION_INTENT_SENT", jm1_sourcerecordid: titleId,
    jm1_actiondescription: `providerMessageId=${providerId}; DATAVERSE_RECORD=PASS; ACS_DELIVERY=PASS; PUBLISHING_MAILBOX_COPY=PASS; ATTACHMENT_PARITY=PASS.` }],
  responseEvents: [], responseSearch: { complete: true, candidateMessageIds: [] },
  authorizedDueAt: "2026-09-28T17:00:00.000Z",
  dueAuthority: "AUTHOR_REVIEW_RESPONSE_PERIOD_CALENDAR_DAYS_V1"
};

test("projects one exact delivered legacy editorial action", () => {
  const result = projectLegacyEditorialAction(base);
  assert.equal(result.nextActionOwner, "AUTHOR");
  assert.equal(result.actionRequestId, gateId);
  assert.equal(result.engagementId, "JMP-INT-202608-JFLY01");
  assert.equal(result.currentDeliveryState, "VERIFIED");
  assert.equal(result.actionDueAt, base.authorizedDueAt);
});

test("historical gate alone, absent mailbox copy, or duplicate send never authorizes followup", () => {
  assert.equal(projectLegacyEditorialAction({ ...base, sendEvents: [] }).nextActionOwner, "AMBIGUOUS");
  assert.equal(projectLegacyEditorialAction({ ...base, intentEvents: [] }).reason, "DELIVERY_OBSERVABILITY_UNPROVEN");
  assert.equal(projectLegacyEditorialAction({ ...base, sendEvents: [...base.sendEvents, ...base.sendEvents] }).reason,
    "DELIVERY_CARDINALITY_UNPROVEN");
  assert.equal(projectLegacyEditorialAction({ ...base, intentEvents: [{ ...base.intentEvents[0],
    jm1_actiondescription: base.intentEvents[0].jm1_actiondescription.replace("PUBLISHING_MAILBOX_COPY=PASS", "PUBLISHING_MAILBOX_COPY=UNPROVEN") }] }).nextActionOwner, "AMBIGUOUS");
});

test("response or changed stage cancels the author wait", () => {
  assert.equal(projectLegacyEditorialAction({ ...base, responseEvents: [{ jm1_sourcerecordid: gateId,
    jm1_actiontype: "AUTHOR_RESPONSE_CAPTURED" }] }).nextActionOwner, "JM_PUBLISHING");
  assert.equal(projectLegacyEditorialAction({ ...base, stages: [{ ...base.stages[0], jm1pub_stagestatus: 100000003 }] }).nextActionOwner,
    "JM_PUBLISHING");
  assert.equal(projectLegacyEditorialAction({ ...base, responseSearch: { complete: true,
    candidateMessageIds: ["message-1"] } }).reason, "AUTHOR_REPLY_REQUIRES_DISPOSITION");
  assert.equal(projectLegacyEditorialAction({ ...base, responseSearch: null }).reason, "CURRENT_INBOUND_SEARCH_INCOMPLETE");
});

test("unproven author, artifact, stage, or deadline fails closed", () => {
  assert.equal(projectLegacyEditorialAction({ ...base, title: { jm1pub_titleid: titleId } }).nextActionOwner, "AMBIGUOUS");
  assert.equal(projectLegacyEditorialAction({ ...base, title: { ...base.title,
    _jm1_primaryauthor_value: "1229d151-80f1-4ca6-a6a8-9c27a60896f3" } }).reason, "AUTHOR_IDENTITY_UNPROVEN");
  assert.equal(projectLegacyEditorialAction({ ...base, title: { ...base.title,
    jm1_canonicalauthorcontactreference: "UNRESOLVED" } }).reason, "AUTHOR_IDENTITY_UNPROVEN");
  assert.equal(projectLegacyEditorialAction({ ...base, artifacts: [] }).reason, "GATE_ARTIFACT_BINDING_UNPROVEN");
  assert.equal(projectLegacyEditorialAction({ ...base, stages: [{ ...base.stages[0], jm1pub_stagetype: 100000002 }] }).reason,
    "STAGE_ACTION_MAPPING_UNPROVEN");
  assert.equal(projectLegacyEditorialAction({ ...base, stages: [
    { ...base.stages[0], modifiedon: "2026-09-21T17:00:00Z" },
    { ...base.stages[0], jm1pub_editorialstageid: "1d6a2bd2-b6ac-4bca-b924-99ea0aefc624",
      jm1pub_stagesequence: null, modifiedon: "2026-09-22T17:00:00Z" }
  ] }).reason, "NEWER_UNSEQUENCED_STAGE_REQUIRES_REVIEW");
  assert.equal(projectLegacyEditorialAction({ ...base, dueAuthority: null }).reason, "AUTHOR_DEADLINE_AUTHORITY_UNPROVEN");
  assert.equal(projectLegacyEditorialAction({ ...base, stages: [{ ...base.stages[0],
    jm1pub_intakereference: null }] }).reason, "LEGACY_ENGAGEMENT_BINDING_UNPROVEN");
  assert.equal(projectLegacyEditorialAction({ ...base, title: { ...base.title, jm1_canonicalstatus: "DUPLICATE_RECORD" },
    stages: [] }).nextActionOwner, "NONE");
});

test("portfolio scan separates noncanonical rows, current waits, and unresolved identities", async () => {
  const duplicateId = "baffff61-01e6-4ac6-8d61-181ff49b7950";
  const unresolvedId = "3f17a488-3ac9-4a09-bde7-d2b3a95623d0";
  const client = { async list(entitySet) {
    if (entitySet === "jm1pub_titles") return [
      { ...base.title, jm1_canonicalauthorcontactreference: `contact:${authorId}` },
      { jm1pub_titleid: duplicateId, jm1_canonicalstatus: "DUPLICATE_RECORD" },
      { jm1pub_titleid: unresolvedId, jm1_canonicalauthorcontactreference: "UNRESOLVED" }
    ];
    if (entitySet === "jm1pub_editorialstages") return base.stages;
    if (entitySet === "jm1pub_editorialapprovalgates") return base.gates;
    if (entitySet === "jm1pub_editorialartifacts") return base.artifacts;
    if (entitySet === "jm1_executionlogs") return [...base.sendEvents, ...base.intentEvents, ...base.responseEvents];
    throw new Error(`Unexpected ${entitySet}`);
  } };
  const result = await scanCurrentAuthorActions(client, { responseSearch: async () =>
    ({ complete: true, candidateMessageIds: [] }) });
  assert.equal(result.activeTitlesScanned, 3);
  assert.deepEqual(result.classifications, { AUTHOR: 1, JM_PUBLISHING: 0, NONE: 1, AMBIGUOUS: 1 });
  assert.equal(result.projections.find((row) => row.titleId === titleId).actionDueAt,
    "2026-09-28T17:00:00.000Z");
});

test("mailbox cancellation check requires exact system copy and holds on any later author reply", () => {
  const token = providerId.replaceAll("-", "");
  const copy = { id: "copy-1", internetMessageId: `<123456789012.${token}-1@microsoft.com>`,
    from: { emailAddress: { address: "publishing@email.jmerrill.one" } },
    toRecipients: [{ emailAddress: { address: "author@example.com" } }],
    sentDateTime: "2026-09-21T17:00:00Z", conversationId: "review-thread" };
  const readback = { status: 200, jsonBody: { authorTitleBinding: "PASS", authorEmail: "author@example.com",
    responseSearch: { complete: true, aliases: [] }, queries: [{ rows: [copy] }] } };
  assert.deepEqual(evaluateMailboxResponseSearch(readback, { send: base.sendEvents[0] }).candidateMessageIds, []);
  const reply = { id: "reply-1", from: { emailAddress: { address: "author@example.com" } },
    receivedDateTime: "2026-09-22T17:00:00Z", conversationId: "review-thread", authorReply: "I have questions." };
  const withReply = { ...readback, jsonBody: { ...readback.jsonBody, queries: [{ rows: [copy, reply] }] } };
  assert.deepEqual(evaluateMailboxResponseSearch(withReply, { send: base.sendEvents[0] }).candidateMessageIds, ["reply-1"]);
  const unrelated = { ...reply, id: "onboarding-1", conversationId: "onboarding-thread",
    subject: "Whole onboarding" };
  assert.deepEqual(evaluateMailboxResponseSearch({ ...readback, jsonBody: { ...readback.jsonBody,
    queries: [{ rows: [copy, unrelated] }] } }, { send: base.sendEvents[0], titleName: "Whole" }).candidateMessageIds, []);
  assert.deepEqual(evaluateMailboxResponseSearch({ ...readback, jsonBody: { ...readback.jsonBody,
    queries: [{ rows: [copy, { ...unrelated, id: "new-subject", subject: "Whole manuscript reply" }] }] } },
  { send: base.sendEvents[0], titleName: "Whole" }).candidateMessageIds, ["new-subject"]);
  assert.equal(evaluateMailboxResponseSearch({ ...readback, jsonBody: { ...readback.jsonBody,
    responseSearch: { complete: false } } }, { send: base.sendEvents[0] }).complete, false);
  assert.equal(evaluateMailboxResponseSearch({ ...readback, jsonBody: { ...readback.jsonBody,
    queries: [{ rows: [] }] } }, { send: base.sendEvents[0] }).reason, "EXACT_MAILBOX_COPY_UNPROVEN");
});
