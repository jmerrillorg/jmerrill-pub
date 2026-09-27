"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { validatePermissionState, MAX_AGE_MS } = require("../../src/shadow/permissionMonitorState");
const now = Date.parse("2026-09-25T12:00:00Z");
const expected = {
  appId: "runtime-app", principalId: "runtime-principal", siteId: "publishing-site", grantId: "grant-1",
  modelResourceId: "/selected/resource", deploymentName: "exact-deployment",
  baselineVersion: "fixture-v1", baselineChecksum: "a".repeat(64),
};
const state = {
  schemaVersion: "2.0.0", overallResult: "PASS", monitorRunId: "fixture-run",
  monitorReleaseSha: "b".repeat(40), correlationIds: ["fixture-invocation"],
  baselineVersion: expected.baselineVersion, baselineChecksum: expected.baselineChecksum,
  runtimeIdentityId: expected.principalId,
  bindings: { runtimeAppId: expected.appId, runtimePrincipalId: expected.principalId,
    targetSiteId: expected.siteId, grantId: expected.grantId, modelResourceId: expected.modelResourceId,
    deploymentName: expected.deploymentName },
  results: { sharepoint: "PASS", entra: "PASS", azureRbac: "PASS", dataverse: "PASS", model: "PASS", monitorSelf: "PASS" },
  sharepoint: { runtimeAppId: expected.appId, targetSiteId: expected.siteId, grantId: expected.grantId,
    role: "read", tenantWideSharePointAccess: false, unrelatedSiteGrants: 0,
    siteEnumerationComplete: true, personalSiteIds: [] },
  observedAt: new Date(now).toISOString(), validUntil: new Date(now + MAX_AGE_MS).toISOString(),
};

test("fresh all-surface verdict returns correlation and effective-probe inputs", () => {
  const result = validatePermissionState(state, expected, now);
  assert.deepEqual(result.personalSiteIds, []);
  assert.equal(result.verdict.monitorRunId, state.monitorRunId);
});

for (const surface of Object.keys(state.results)) {
  test(`missing, drifted or unverified ${surface} denies`, () => {
    for (const result of [undefined, "DRIFTED", "UNVERIFIED", "ERROR"]) {
      assert.throws(() => validatePermissionState({ ...state, results: { ...state.results, [surface]: result } }, expected, now));
    }
  });
}

for (const change of [
  { schemaVersion: "1.0.0" }, { overallResult: "UNVERIFIED" }, { baselineChecksum: "c".repeat(64) },
  { runtimeIdentityId: "other-identity" }, { monitorRunId: null }, { monitorReleaseSha: null },
  { correlationIds: [] }, { validUntil: null },
  { validUntil: new Date(now + MAX_AGE_MS + 1).toISOString() },
  { observedAt: new Date(now + 1).toISOString() },
  { observedAt: new Date(now - MAX_AGE_MS - 1).toISOString() },
]) {
  test(`denies malformed or stale verdict ${JSON.stringify(change)}`, () => {
    assert.throws(() => validatePermissionState({ ...state, ...change }, expected, now));
  });
}

test("same alias on wrong resource denies", () => {
  assert.throws(() => validatePermissionState({ ...state,
    bindings: { ...state.bindings, modelResourceId: "/other/resource" } }, expected, now));
});

test("personal sites remain inputs for separate effective runtime denial", () => {
  const result = validatePermissionState({ ...state,
    sharepoint: { ...state.sharepoint, personalSiteIds: ["personal-site-fixture"] } }, expected, now);
  assert.equal(result.personalSiteIds.length, 1);
});

test("brand grant suppression or site-write authority denies", () => {
  for (const change of [{ role: "write" }, { tenantWideSharePointAccess: true },
    { unrelatedSiteGrants: 1 }, { siteEnumerationComplete: false }, { grantId: "different" }]) {
    assert.throws(() => validatePermissionState({ ...state, sharepoint: { ...state.sharepoint, ...change } }, expected, now));
  }
});
