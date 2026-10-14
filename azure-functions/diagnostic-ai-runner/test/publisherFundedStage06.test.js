"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const owner = require("../src/lifecycle/publisherFundedStage06");
const policy = require("../src/lifecycle/jackieInternalTitlePolicy");
const titleId = Object.keys(policy.TITLES)[0];
function fixture() {
  const bundle = { title: "Exact title", offer: { titleId, offerSha256: "offer" } };
  const execution = { titleId, offerSha256: "offer", agreementSha256: "agreement", status: "REPLACEMENT_EXECUTION_VERIFIED", stage05Complete: true,
    authorDueCents: 0, authorPaymentDisposition: "NOT_APPLICABLE_PUBLISHER_FUNDED", paymentCreated: false, proof: { seal: { fullDocumentIntegrity: true }, requiredPartyEvents: 2 } };
  const answers = Object.fromEntries(["legalName", "phone", "mailingAddress", "genre", "targetAudience", "shortDescription", "manuscriptStatus", "preferredPrintFormat", "preferredTrimSize", "interiorColor", "paperTypePreference", "bindingType", "publishingGoal", "governedFormatSelection"].map(k => [k, "recorded"]));
  Object.assign(answers, { bookTitle: bundle.title, email: "synthetic@example.com", rightsHolderConfirmed: "true", packageConfirmation: "PUBLISHER_FUNDED", submissionProvenance: { actor: "Cody", onBehalfOf: "Author" } });
  const payload = { bookTitle: bundle.title, email: answers.email, rightsHolderConfirmed: true, rawFormData: answers,
    governedAuthority: { titleId, contactId: policy.CONTACT, agreementSha256: "agreement", policyVersion: "PUBLISHER_FUNDED_ONBOARDING_V1" } };
  const row = { jm1pub_submissionid: "receipt", "@odata.etag": "version", jm1pub_formtype: "author-onboarding-attempt", _jm1pub_linkedcontact_value: policy.CONTACT,
    jm1pub_email: answers.email, jm1pub_rightsholderconfirmed: true, jm1pub_rawpayload: JSON.stringify(payload) };
  return { bundle, execution, payload, row };
}
test("exact version, contact, answers and delegated provenance are retained", () => {
  const f = fixture(); owner.validateExecution(f.execution, f.bundle);
  const result = owner.validateSubmission(f.row, f.bundle, f.execution);
  assert.equal(result.submissionId, "receipt"); assert.equal(result.provenance.actor, "Cody");
  assert.deepEqual(result, owner.validateSubmission(f.row, f.bundle, f.execution));
});
test("stale, mismatched, incomplete and unconfirmed submissions fail closed", () => {
  for (const mutate of [f => f.payload.governedAuthority.titleId = "other", f => f.payload.governedAuthority.contactId = "other",
    f => f.payload.governedAuthority.agreementSha256 = "old", f => f.payload.rawFormData.bookTitle = "wrong",
    f => f.payload.rawFormData.mailingAddress = "", f => f.payload.rawFormData.rightsHolderConfirmed = "false",
    f => f.row._jm1pub_linkedcontact_value = "other", f => f.row.jm1pub_rightsholderconfirmed = false]) {
    const f = fixture(); mutate(f); f.row.jm1pub_rawpayload = JSON.stringify(f.payload);
    assert.throws(() => owner.validateSubmission(f.row, f.bundle, f.execution), /STAGE06_/);
  }
});
test("agreement signature and zero-payment authority cannot be inferred", () => {
  for (const field of ["stage05Complete", "paymentCreated", "authorDueCents", "authorPaymentDisposition"]) {
    const f = fixture(); f.execution[field] = "wrong"; assert.throws(() => owner.validateExecution(f.execution, f.bundle), /EXECUTION_REQUIRED/);
  }
});
test("scope and enablement guards precede effects", async () => {
  assert.equal((await owner.handler({ mode: "SUBMISSION_06_ACCEPT", titleId: "external", submissionId: "a".repeat(36) })).status, 400);
  assert.equal((await owner.handler({ mode: "SUBMISSION_06_ACCEPT", titleId, submissionId: "a".repeat(36) }, { env: {} })).status, 403);
});
test("acceptance checks source custody and replays the same immutable receipt without other effects", async t => {
  const f = fixture(), b = require("../src/lifecycle/newSubmissionStage03Budget"), stored = new Map();
  let writes = 0, sourceChecks = 0;
  f.bundle.sourceFingerprint = "source"; f.bundle.offer.components = [{}];
  f.row.jm1pub_submissionid = "11111111-1111-4111-8111-111111111111";
  const source = { titleId, contactId: policy.CONTACT, sourceFingerprint: "source", status: "COMPLETED", stageCode: "02_INTAKE",
    outputs: [{ role: "EDITORIAL_WORKING_SOURCE" }], manifest: {}, collectionTreatment: "SINGLE_WORKING_SOURCE" };
  const deps = { env: { JM1_NEW_SUBMISSION_STAGE06_ENABLED: "true", JM1_NEW_SUBMISSION_STAGE06_TITLE_IDS: titleId,
    JM1_TITLE_COMMISSIONING_REVIEW_ENABLED: "false", JM1_PUBLISHING_STAGE_RUNTIME_ENABLED: "false", JM1_PUBLISHING_WAIT_RUNTIME_ENABLED: "false" },
    containerClient: { getProperties: async () => ({}) }, authorityClient: { first: async () => f.row } };
  t.mock.method(require("../src/lifecycle/newSubmissionStage01"), "native", async () => deps);
  t.mock.method(require("../src/lifecycle/publisherFundedStage04"), "load", async () => f.bundle);
  t.mock.method(require("../src/lifecycle/newSubmissionStage02"), "verifyOutput", async () => { sourceChecks++; });
  t.mock.method(b, "read", async (_c, path) => ({ value: path.endsWith("execution.json") ? f.execution : path.endsWith("prepared.json") ? f.execution : source }));
  t.mock.method(b, "optional", async (_c, path) => stored.has(path) ? { value: stored.get(path) } : null);
  t.mock.method(b, "immutable", async (_c, path, value) => {
    if (stored.has(path)) assert.deepEqual(stored.get(path), value); else { writes++; stored.set(path, value); }
  });
  const input = { titleId, mode: "SUBMISSION_06_ACCEPT", submissionId: f.row.jm1pub_submissionid };
  const first = await owner.handler(input, deps), replay = await owner.handler(input, deps);
  assert.equal(first.status, 200); assert.equal(first.jsonBody.accepted, true);
  assert.equal(replay.jsonBody.replay, true); assert.equal(writes, 1); assert.equal(sourceChecks, 4);
  assert.deepEqual(first.jsonBody.readiness, replay.jsonBody.readiness);
  assert.equal(first.jsonBody.modelCalls, 0); assert.equal(first.jsonBody.payments, 0); assert.equal(first.jsonBody.communications, 0);
  f.row["@odata.etag"] = "changed";
  assert.equal((await owner.handler(input, deps)).jsonBody.code, "STAGE06_RECEIPT_CONFLICT");
  assert.equal(writes, 1);
});
