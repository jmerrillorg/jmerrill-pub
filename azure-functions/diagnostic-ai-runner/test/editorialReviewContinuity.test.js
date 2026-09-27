"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { CONTINUITY_AUTHORITY, prepareEditorialReviewContinuity } = require("../src/mail/inbound/editorialReviewContinuity");
const { serviceCopy } = require("../src/mail/inbound/serviceIntent");
const row = { ...CONTINUITY_AUTHORITY, stageId: "ae3c9d5e-67b5-f111-aaab-000d3a10aa9c" };
const gateId = "4d04daa2-67b5-f111-aaac-000d3a14673b";
const artifactId = "8ed48c9c-67b5-f111-aaab-000d3a10aa9c";
const provider = "82df9cc1-a5a1-4be6-9e38-f3a905f1070e";
function fixture() {
  const stage = { jm1pub_editorialstageid: row.stageId, _jm1pub_titleid_value: row.titleId, _jm1pub_contactid_value: row.authorId, jm1pub_stagetype: 100000001 };
  const gate = { jm1pub_editorialapprovalgateid: gateId, _jm1pub_titleid_value: row.titleId, jm1pub_gatestatus: 196650002, _jm1pub_deliverableartifactid_value: artifactId };
  const artifact = { jm1pub_editorialartifactid: artifactId, _jm1pub_titleid_value: row.titleId, _jm1pub_editorialstageid_value: row.stageId, jm1pub_sha256: "a".repeat(64) };
  const log = { jm1_executionlogid: "sent-log", createdon: "2026-09-21T09:02:38Z",
    jm1_actiondescription: `providerMessageId=${provider}; gate=${gateId}; package=original-package; checksums=editedManuscript:${"a".repeat(64)}|reviewInstructions:${"b".repeat(64)};` };
  const copy = { id: "native-copy", from: { emailAddress: { address: "publishing@email.jmerrill.one" } },
    toRecipients: [{ emailAddress: { address: "author@example.net" } }],
    internetMessageId: `<202609210902.${provider.replaceAll("-", "")}-provenance@microsoft.com>`,
    sentDateTime: "2026-09-21T09:02:36Z", conversationId: "delivery-thread" };
  const search = { authorEmail: "author@example.net", responseSearch: { complete: true, aliases: [] },
    queries: [{ rows: [copy] }] };
  let gateReads = 0;
  return { stage, gate, artifact, log, copy, search, deps: {
    client: { first: async entity => entity === "jm1pub_editorialstages" ? stage : entity === "jm1pub_editorialartifacts" ? artifact : (++gateReads, gate),
      list: async () => [log] },
    lifecycleReadback: async () => ({ status: 200, jsonBody: search }),
  }, get gateReads() { return gateReads; } };
}
test("exact delivered package plus complete empty response search prepares without effects", async () => {
  const f = fixture();
  const result = await prepareEditorialReviewContinuity(row, f.deps);
  assert.equal(result.status, "READY");
  assert.equal(result.response, "NOT_FOUND");
  assert.equal(result.artifactId, artifactId);
  assert.equal(f.gateReads, 2);
  assert.equal(result.effects, 0);
});
test("other titles cannot inherit the one-title continuity send authority", async () => {
  assert.equal((await prepareEditorialReviewContinuity({ ...row, titleId: row.authorId }, {
    client: { first: () => { throw new Error("must not read"); } },
  })).reason, "CONTINUITY_NOT_AUTHORIZED");
});
for (const [name, mutate, reason] of [
  ["wrong author", f => { f.stage._jm1pub_contactid_value = "other"; }, "DELIVERED_DEVELOPMENTAL_STAGE_BINDING_UNPROVEN"],
  ["wrong title", f => { f.stage._jm1pub_titleid_value = "other"; }, "DELIVERED_DEVELOPMENTAL_STAGE_BINDING_UNPROVEN"],
  ["wrong artifact title", f => { f.artifact._jm1pub_titleid_value = "other"; }, "DELIVERED_ARTIFACT_CHECKSUM_MISMATCH"],
  ["approved gate", f => { f.gate.jm1pub_authordecision = "APPROVED"; }, "DELIVERED_REVIEW_GATE_CHANGED"],
  ["changed checksum", f => { f.artifact.jm1pub_sha256 = "c".repeat(64); }, "DELIVERED_ARTIFACT_CHECKSUM_MISMATCH"],
  ["partial search", f => { f.search.responseSearch.complete = false; }, "AUTHOR_RESPONSE_SEARCH_INCOMPLETE"],
  ["provider mismatch", f => { f.copy.internetMessageId = "<different@example.net>"; }, "DELIVERED_NATIVE_MESSAGE_BINDING_UNPROVEN"],
  ["wrong recipient", f => { f.copy.toRecipients = []; }, "DELIVERED_NATIVE_MESSAGE_BINDING_UNPROVEN"],
  ["author response", f => { f.search.queries[0].rows.push({ id: "reply", from: { emailAddress: { address: "author@example.net" } },
    receivedDateTime: "2026-09-22T10:00:00Z", body: { content: "Approved" } }); }, "AUTHOR_RESPONSE_REQUIRES_EXACT_PACKAGE_DISPOSITION"],
]) test(name + " denies follow-up", async () => {
  const f = fixture(); mutate(f);
  assert.equal((await prepareEditorialReviewContinuity(row, f.deps)).reason, reason);
});
test("quoted old approval does not become a new editorial decision", async () => {
  const f = fixture();
  f.search.queries[0].rows.push({ id: "onboarding-help", from: { emailAddress: { address: "author@example.net" } },
    receivedDateTime: "2026-09-26T10:00:00Z", conversationId: "onboarding-thread",
    body: { content: "The form failed. Please help.\n\nOn Sep 21, 2026, Publishing wrote:\nPlease reply Approved." } });
  assert.equal((await prepareEditorialReviewContinuity(row, f.deps)).status, "READY");
});
test("concurrent gate disposition invalidates preparation", async () => {
  const f = fixture();
  f.deps.lifecycleReadback = async () => { f.gate.jm1pub_authordecisionon = "2026-09-27T10:00:00Z"; return { status: 200, jsonBody: f.search }; };
  assert.equal((await prepareEditorialReviewContinuity(row, f.deps)).reason, "DELIVERED_REVIEW_GATE_CHANGED");
});
test("correspondence refers to existing materials without onboarding, OTP, or replacement links", () => {
  const copy = serviceCopy("DELIVERED_EDITORIAL_REVIEW_CONTINUITY", "Jackuline Fly", "Whole", "Help", {
    status: "READY", deliveredAt: "2026-09-21T09:02:36Z",
  });
  assert.match(copy.body, /September 21/);
  assert.match(copy.body, /Approved with corrections/);
  assert.match(copy.body, /do not need to repeat/);
  assert.doesNotMatch(copy.body, /https?:|OTP|Dataverse|Cody|execution|checksum|workflow/i);
  assert.equal(serviceCopy("DELIVERED_EDITORIAL_REVIEW_CONTINUITY", "Jackuline", "Whole", "Help", {}), null);
});
