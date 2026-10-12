"use strict";
const { createHash } = require("node:crypto");
const sha = value => createHash("sha256").update(value).digest("hex");
const PREFIX = "new-submission-stage03/batch-20261011";
const LIMITS = Object.freeze({ maximumMicroUsd: 8000000, normalCalls: 23, retries: 1,
  totalCalls: 24, input: 125000, output: 8192, inputRate: 2, outputRate: 10 });
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }
async function read(container, path) {
  const blob = container.getBlockBlobClient(path), props = await blob.getProperties();
  if (!props.etag) deny("STAGE03_UNVERSIONED_RECORD");
  const bytes = await blob.downloadToBuffer(0, undefined, { conditions: { ifMatch: props.etag } });
  return { blob, etag: props.etag, bytes, value: JSON.parse(bytes.toString("utf8")) };
}
async function optional(container, path) {
  try { return await read(container, path); } catch (e) { if (e.statusCode === 404) return null; throw e; }
}
async function immutable(container, path, value) {
  const bytes = Buffer.from(JSON.stringify(value)), blob = container.getBlockBlobClient(path);
  try { await blob.uploadData(bytes, { conditions: { ifNoneMatch: "*" }, blobHTTPHeaders: { blobContentType: "application/json" } }); }
  catch (e) { if (![409, 412].includes(e.statusCode) || !(await read(container, path)).bytes.equals(bytes)) throw e; }
  return read(container, path);
}
function validateApproval(record, env) {
  const a = record.value;
  const founder = require("../author/jackieTitleSystemCommissioningPolicy").JACKIE_CANONICAL_AUTHOR_CONTACT_ID;
  if (sha(record.bytes) !== env.JM1_NEW_SUBMISSION_STAGE03_APPROVAL_SHA256 || a.status !== "APPROVED" ||
    a.actorContactId !== founder || a.purpose !== "FIVE_FRESH_STAGE03_ASSESSMENTS" ||
    !a.humanEvidenceReference || !/^[a-f0-9]{64}$/.test(a.proposalSha256 || "") ||
    JSON.stringify(a.limits) !== JSON.stringify(LIMITS) || a.stage04 !== "NOT_STARTED" ||
    !Array.isArray(a.sources) || a.sources.length !== 6 ||
    a.sources.some(x => !/^[a-f0-9]{64}$/.test(x.sourceSha256 || ""))) deny("STAGE03_SPEND_APPROVAL_DENIED");
  return a;
}
function reservation(count, ledger, retry = false) {
  if (!Number.isSafeInteger(count.inputTokens) || count.inputTokens < 1 ||
    !Number.isFinite(Date.parse(count.verifiedAt)) ||
    Date.now() - Date.parse(count.verifiedAt) > 300000 || Date.parse(count.verifiedAt) > Date.now()) deny("STAGE03_TOKEN_COUNT_INVALID");
  const inputCeiling = Math.ceil(count.inputTokens * 1.05);
  const maximumMicroUsd = inputCeiling * LIMITS.inputRate + LIMITS.output * LIMITS.outputRate;
  if (inputCeiling > LIMITS.input || ledger.calls.length >= LIMITS.totalCalls ||
    ledger.calls.filter(c => c.retry).length + Number(retry) > LIMITS.retries ||
    ledger.calls.filter(c => !c.retry).length + Number(!retry) > LIMITS.normalCalls ||
    ledger.calls.reduce((n, c) => n + c.maximumMicroUsd, 0) + maximumMicroUsd > LIMITS.maximumMicroUsd) deny("STAGE03_BATCH_BUDGET_EXCEEDED");
  if (ledger.calls.some(c => c.status === "IN_FLIGHT" || c.status === "AMBIGUOUS")) deny("STAGE03_AMBIGUOUS_PROVIDER_EFFECT_HELD");
  return { inputCeiling, maximumMicroUsd };
}
function actualCost(model, held) {
  const t = model.tokenCounts;
  if (!t || !Number.isSafeInteger(t.input) || !Number.isSafeInteger(t.output) || t.input < 1 || t.output < 1 ||
    t.input > held.inputCeiling || t.output > LIMITS.output) deny("STAGE03_ACTUAL_USAGE_UNVERIFIED");
  return t.input * LIMITS.inputRate + t.output * LIMITS.outputRate;
}
module.exports = { PREFIX, LIMITS, sha, deny, read, optional, immutable, validateApproval, reservation, actualCost };
