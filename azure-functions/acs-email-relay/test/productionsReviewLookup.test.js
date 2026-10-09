"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { createLedger, createFingerprint } = require("../src/state/messageLedger");
const { renderProductionsBp09Notice, CALLER_ID } = require("../src/templates/productionsBp09Notice");
const { lookupProductionsReviewNotice } = require("../src/functions/lookupProductionsReviewNotice");
const receiptId = "11111111-1111-4111-8111-111111111111";
const payload = { brand: "JMPRODUCTIONS", to: "productions@jmerrill.one",
  templateId: "PRODUCTIONS.BP09_REVIEW_OVERDUE", templateVersion: "1.0.0",
  templateData: { referenceId: "22222222-2222-4222-8222-222222222222", leadId: "33333333-3333-4333-8333-333333333333",
    transitionId: "44444444-4444-4444-8444-444444444444" } };
const auth = () => ({ ok: true, authModel: "ENTRA_WORKLOAD_IDENTITY", caller: { callerId: CALLER_ID, status: "ACTIVE" } });
const hash = text => createHash("sha256").update(text).digest("hex");
function fixture(override = {}, error) {
  const v = renderProductionsBp09Notice(payload).value;
  const input = { callerId: CALLER_ID, brand: v.brand, businessObjectType: v.businessObjectType,
    businessObjectId: v.businessObjectId, correlationId: v.correlationId, recipients: [payload.to],
    communicationPurpose: v.messageType, templateId: v.templateId, templateVersion: v.templateVersion,
    rendererVersion: v.renderMetadata.rendererVersion, brandTokenVersion: v.renderMetadata.brandTokenVersion,
    htmlSha256: v.renderMetadata.htmlSha256, plainTextSha256: v.renderMetadata.plainTextSha256, idempotencyKey: v.idempotencyKey };
  const entity = { ...input, partitionKey: hash(`${CALLER_ID}|${v.brand}`).slice(0, 32), rowKey: hash(v.idempotencyKey),
    fingerprint: createFingerprint(input), recipient: payload.to, jm1MessageId: receiptId, providerMessageId: "provider-id",
    acceptedAt: "2026-10-09T14:00:00Z", updatedAt: "2026-10-09T14:01:00Z", deliveryState: "ACCEPTED", ...override };
  const calls = [];
  const table = { url: "https://primary.table.core.windows.net", async getEntity(pk, rk) {
    calls.push([pk, rk]); if (error) throw error; return entity;
  }, async *listEntities() {}, createTable() { assert.fail("write"); }, createEntity() { assert.fail("write"); },
  updateEntity() { assert.fail("write"); }, upsertEntity() { assert.fail("write"); } };
  return { ledger: createLedger(table), calls };
}
async function lookup(f, body = { ...payload, receiptId }, authentication = auth) {
  return lookupProductionsReviewNotice({ json: async () => body }, { ledger: f.ledger, authenticateCaller: authentication });
}
test("checkpoint templates have independent exact transition keys and reference-only content", () => {
  const overdue = renderProductionsBp09Notice(payload);
  const resolved = renderProductionsBp09Notice({ ...payload, templateId: "PRODUCTIONS.BP09_REVIEW_RESOLVED" });
  const repeated = renderProductionsBp09Notice(payload);
  assert.equal(overdue.ok, true); assert.equal(resolved.ok, true);
  assert.notEqual(overdue.value.idempotencyKey, resolved.value.idempotencyKey);
  assert.equal(overdue.value.idempotencyKey, repeated.value.idempotencyKey);
  assert.equal(overdue.value.correlationId, payload.templateData.transitionId);
  for (const extra of [{ body: "private" }, { to: "wrong@example.com" }, { templateData: { ...payload.templateData, private: "text" } }]) {
    assert.equal(renderProductionsBp09Notice({ ...payload, ...extra }).ok, false);
  }
});
test("exact repeated lookup proves acceptance only, never delivery or resend authority", async () => {
  const f = fixture(); const first = await lookup(f); const second = await lookup(f);
  assert.deepEqual(first, second); assert.equal(first.jsonBody.status, "accepted");
  assert.equal(first.jsonBody.deliveryEvidenceAvailable, false); assert.equal(first.jsonBody.retryAuthorized, false);
  assert.deepEqual(Object.keys(first.jsonBody).sort(), ["status", "receiptId", "providerMessageId", "acceptedAt", "deliveryEvidenceAvailable", "retryAuthorized"].sort());
  assert.equal(first.jsonBody.acceptedAt, "2026-10-09T14:00:00Z"); assert.equal(f.calls.length, 2);
});
test("exact failed receipt returns failure timestamp, while reservation and conflicts stay unknown", async () => {
  assert.equal((await lookup(fixture({ deliveryState: "FAILED" }))).jsonBody.failedAt, "2026-10-09T14:01:00Z");
  for (const override of [{ deliveryState: "RESERVED" }, { jm1MessageId: "other" }, { fingerprint: "other" },
    { recipient: "other@example.com" }, { correlationId: "other" }, { updatedAt: "invalid", deliveryState: "FAILED" }]) {
    const result = await lookup(fixture(override)); assert.equal(result.jsonBody.status, "unknown");
    assert.equal(result.jsonBody.retryAuthorized, false);
  }
});
test("denied caller, recipient, receipt, version and unbounded content never read storage", async () => {
  for (const change of [{ receiptId: "invalid" }, { to: "other@example.com" }, { body: "private" }, { templateVersion: "2" }]) {
    const f = fixture(); const result = await lookup(f, { ...payload, receiptId, ...change });
    assert.equal(result.status, 400); assert.equal(result.jsonBody.retryAuthorized, false);
    assert.equal(f.calls.length, 0);
  }
  for (const a of [{ ...auth(), authModel: "LEGACY_SHARED_KEY" }, { ...auth(), caller: { callerId: "other", status: "ACTIVE" } }]) {
    const f = fixture(); const result = await lookup(f, undefined, () => a);
    assert.equal(result.status, 403); assert.equal(result.jsonBody.retryAuthorized, false); assert.equal(f.calls.length, 0);
  }
});
test("absence, permission failures and timeouts remain unknown with no resend permission", async () => {
  for (const error of [{ statusCode: 404 }, { statusCode: 403 }, { code: "ETIMEDOUT" }]) {
    const result = await lookup(fixture({}, error)); assert.equal(result.jsonBody.status, "unknown");
    assert.equal(result.jsonBody.retryAuthorized, false);
  }
});
