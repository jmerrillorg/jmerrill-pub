"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { createLedger, createFingerprint } = require("../src/state/messageLedger");
const { lookupFinancialInquiryNotice } = require("../src/functions/lookupFinancialInquiryNotice");
const { renderFinancialInquiryNotice } = require("../src/templates/financialInquiryNotice");
const payload = { brand: "JMF", to: "financial@jmerrill.one", templateId: "FINANCIAL.INQUIRY_NOTICE",
  templateVersion: "1.0.0", templateData: { referenceId: "685c85a5-ead7-53bf-ad7e-a10795d8f885" } };
const auth = () => ({ ok: true, authModel: "ENTRA_WORKLOAD_IDENTITY", caller: { callerId: "financial-inquiry-function-prod", status: "ACTIVE" } });
const hash = text => createHash("sha256").update(text).digest("hex");
function input() {
  const v = renderFinancialInquiryNotice(payload).value;
  return { callerId: "financial-inquiry-function-prod", brand: v.brand, businessObjectType: v.businessObjectType,
    businessObjectId: v.businessObjectId, correlationId: v.correlationId, recipients: [payload.to],
    communicationPurpose: v.messageType, templateId: v.templateId, templateVersion: v.templateVersion,
    rendererVersion: v.renderMetadata.rendererVersion, brandTokenVersion: v.renderMetadata.brandTokenVersion,
    htmlSha256: v.renderMetadata.htmlSha256, plainTextSha256: v.renderMetadata.plainTextSha256, idempotencyKey: v.idempotencyKey };
}
function fixture(options = {}) {
  const i = input();
  const entity = { ...i, partitionKey: hash(`${i.callerId}|${i.brand}`).slice(0, 32), rowKey: hash(i.idempotencyKey),
    fingerprint: createFingerprint(i), recipient: payload.to, jm1MessageId: "message-id", providerMessageId: "provider-id",
    acceptedAt: "2026-10-09T00:00:00.000Z", deliveryState: "ACCEPTED", privateBody: "must never return", ...options.entity };
  const calls = [];
  const table = { url: options.secondary ? "https://example-secondary.table.core.windows.net" : "https://example.table.core.windows.net",
    async getEntity(pk, rk) { calls.push([pk, rk]); if (options.error) throw options.error; return entity; },
    async *listEntities(query) { calls.push(query); if (options.queryError) throw options.queryError; for (const row of options.rows || []) yield row; },
    createTable() { assert.fail("write"); }, createEntity() { assert.fail("write"); }, updateEntity() { assert.fail("write"); }, upsertEntity() { assert.fail("write"); } };
  return { ledger: createLedger(table), entity, calls };
}
test("exact accepted lookup returns only stable receipt fields, no writes, and repeats safely", async () => {
  const f = fixture();
  const request = { json: async () => payload };
  const a = await lookupFinancialInquiryNotice(request, { authenticateCaller: auth, ledger: f.ledger });
  const b = await lookupFinancialInquiryNotice(request, { authenticateCaller: auth, ledger: f.ledger });
  assert.deepEqual(a, b); assert.equal(a.jsonBody.status, "found");
  assert.deepEqual(Object.keys(a.jsonBody).sort(), ["status", "jm1MessageId", "providerMessageId", "acceptedAt", "deliveryState"].sort());
  assert.equal(f.calls.length, 2);
});
test("wrong caller and legacy credentials are denied before storage", async () => {
  for (const authentication of [{ ok: false }, { ...auth(), authModel: "LEGACY_SHARED_KEY" },
    { ...auth(), caller: { callerId: "publishing-web-prod", status: "ACTIVE" } }]) {
    const f = fixture();
    assert.equal((await lookupFinancialInquiryNotice({ json: async () => payload }, { authenticateCaller: () => authentication, ledger: f.ledger })).status, 403);
    assert.equal(f.calls.length, 0);
  }
});
test("wrong brand, template, version, recipient, reference and excess data never read storage", async () => {
  for (const override of [{ brand: "JMP" }, { templateId: "OTHER" }, { templateVersion: "2" }, { to: "other@example.com" },
    { templateData: { referenceId: "invalid" } }, { body: "private" }]) {
    const f = fixture();
    assert.equal((await lookupFinancialInquiryNotice({ json: async () => ({ ...payload, ...override }) }, { authenticateCaller: auth, ledger: f.ledger })).status, 400);
    assert.equal(f.calls.length, 0);
  }
});
test("mismatched stored bindings and incomplete transport remain indeterminate", async () => {
  for (const entity of [{ callerId: "other" }, { brand: "JMP" }, { recipient: "other@example.com" },
    { businessObjectId: "other" }, { templateId: "OTHER" }, { deliveryState: "RESERVED" }, { fingerprint: "other" }]) {
    assert.deepEqual(await fixture({ entity }).ledger.lookupExact(input()), { status: "indeterminate" });
  }
});
test("404 is not absence until an exact indexed query completes successfully", async () => {
  const error = { statusCode: 404 };
  const f = fixture({ error });
  assert.deepEqual(await f.ledger.lookupExact(input()), { status: "not_found" });
  assert.match(f.calls[1].queryOptions.filter, /^PartitionKey eq '[a-f0-9]{32}' and RowKey eq '[a-f0-9]{64}'$/);
  assert.deepEqual(await fixture({ error, queryError: { statusCode: 404 } }).ledger.lookupExact(input()), { status: "indeterminate" });
  const one = fixture();
  assert.deepEqual(await fixture({ error, rows: [one.entity, one.entity] }).ledger.lookupExact(input()), { status: "indeterminate" });
});
test("permission errors, timeouts, unavailable primary and secondary lag cannot authorize resend", async () => {
  for (const error of [{ statusCode: 403 }, { code: "ETIMEDOUT" }, { statusCode: 500 }]) {
    assert.deepEqual(await fixture({ error }).ledger.lookupExact(input()), { status: "indeterminate" });
  }
  const secondary = fixture({ secondary: true });
  assert.deepEqual(await secondary.ledger.lookupExact(input()), { status: "indeterminate" });
  assert.equal(secondary.calls.length, 0);
});
