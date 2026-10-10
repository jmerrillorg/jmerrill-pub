"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { verifyNativeCoverSpend, runNativeCoverOwners } = require("../src/production/coverNativeOwner");

test("native owner remains disabled without constructing storage or Dataverse clients", async () => {
  assert.deepEqual(await runNativeCoverOwners({ env: {} }), { enabled: false, results: [], failures: [] });
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
