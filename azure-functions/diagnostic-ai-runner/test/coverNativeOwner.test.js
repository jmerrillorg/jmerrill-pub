"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { verifyNativeCoverSpend, claimNativeCoverSpend, runNativeCoverOwners } = require("../src/production/coverNativeOwner");
const { digest } = require("../src/production/coverOwnerStore");

test("native owner remains disabled without constructing storage or Dataverse clients", async () => {
  assert.deepEqual(await runNativeCoverOwners({ env: {} }), { enabled: false, results: [], failures: [] });
});

test("one authenticated spend decision cannot fund a second execution or refreshed approval alias", async () => {
  const sha = "a".repeat(64), records = new Map();
  let writes = 0;
  const payload = { titleId: "fixture-title", editionId: "fixture-edition", sourceSha256: sha,
    bundleSha256: sha, maxCostMicroUsd: 20000, variantCount: 2 };
  const decision = { kind: "AUTHENTICATED_FOUNDER_DECISION", decision: "APPROVED", approvedPayloadSha256: digest(payload),
    authenticatedPrincipalId: "11111111-1111-4111-8111-111111111111",
    founderContactId: require("../src/author/jackieTitleSystemCommissioningPolicy").JACKIE_CANONICAL_AUTHOR_CONTACT_ID };
  const tariff = { modelDeployment: "fixture", modelVersion: "fixture-v1", size: "1024x1536", quality: "high",
    currency: "USD", expiresAt: "2027-01-01T00:00:00Z", maxMicroUsdPerImage: 10000 };
  const decisionKey = digest({ fixture: "decision" }), tariffKey = digest({ fixture: "tariff" });
  const approval = { kind: "RECORDED_OWNER_COVER_SPEND_APPROVAL", status: "APPROVED", ...payload,
    modelDeployment: "fixture", modelVersion: "fixture-v1", expiresAt: "2027-01-01T00:00:00Z", approvedPayload: payload,
    decisionEvidenceKey: decisionKey, decisionEvidenceSha256: digest(decision), tariffKey, tariffSha256: digest(tariff) };
  const approvalKey = digest({ fixture: "approval" });
  for (const [key, value] of [[approvalKey, approval], [decisionKey, decision], [tariffKey, tariff]]) records.set(`sources/${key}`, value);
  const request = { ...payload, source: { sha256: sha }, paidApprovalKey: approvalKey, paidApprovalSha256: digest(approval) };
  const deps = { env: { JM1_COVER_IMAGE_DEPLOYMENT: "fixture", JM1_COVER_IMAGE_MODEL_VERSION: "fixture-v1" },
    store: { read: async (kind, key) => {
      const value = records.get(`${kind}/${key}`);
      return value ? { value, sha256: digest(value) } : null;
    }, writeJson: async (kind, key, value) => {
      assert.equal(records.has(`${kind}/${key}`), false);
      records.set(`${kind}/${key}`, value); writes++;
      return { value, sha256: digest(value) };
    } } };
  const execution = { executionKey: "b".repeat(64), bindingHash: "c".repeat(64) };
  assert.equal(await claimNativeCoverSpend(request, { sha256: sha }, deps, execution), true);
  assert.equal(await claimNativeCoverSpend(request, { sha256: sha }, deps, execution), true);
  const second = { executionKey: "d".repeat(64), bindingHash: "e".repeat(64) };
  assert.equal(await claimNativeCoverSpend(request, { sha256: sha }, deps, second), false);
  const aliasKey = digest({ fixture: "refreshed-approval" }), refreshed = { ...approval, verifiedAt: "fixture-refresh" };
  records.set(`sources/${aliasKey}`, refreshed);
  assert.equal(await claimNativeCoverSpend({ ...request, paidApprovalKey: aliasKey, paidApprovalSha256: digest(refreshed) },
    { sha256: sha }, deps, second), false);
  assert.equal(writes, 1);
});

test("native spend authority rejects malformed expiry before decision or tariff reads", async () => {
  const sha = "a".repeat(64);
  const request = { paidApprovalKey: sha, paidApprovalSha256: sha, titleId: "title", editionId: "edition",
    source: { sha256: sha }, variantCount: 2 };
  let reads = 0;
  const deps = { env: { JM1_COVER_IMAGE_DEPLOYMENT: "deployment", JM1_COVER_IMAGE_MODEL_VERSION: "version" },
    store: { read: async () => {
      reads++;
      return { sha256: sha, value: { kind: "RECORDED_OWNER_COVER_SPEND_APPROVAL", status: "APPROVED",
        titleId: "title", editionId: "edition", sourceSha256: sha, bundleSha256: sha, variantCount: 2,
        modelDeployment: "deployment", modelVersion: "version", expiresAt: "not-a-date", maxCostMicroUsd: 1,
        decisionEvidenceKey: sha, decisionEvidenceSha256: sha, tariffKey: sha, tariffSha256: sha } };
    } } };
  assert.equal(await verifyNativeCoverSpend(request, { sha256: sha }, deps), false);
  assert.equal(reads, 1);
});
