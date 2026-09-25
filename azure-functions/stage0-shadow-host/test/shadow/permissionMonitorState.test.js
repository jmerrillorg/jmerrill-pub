"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { validatePermissionState, MAX_AGE_MS } = require("../../src/shadow/permissionMonitorState");

const now = Date.parse("2026-09-25T12:00:00Z");
const expected = { appId: "runtime-app", siteId: "publishing-site", grantId: "grant-1" };
const state = {
  schemaVersion: "1.0.0",
  status: "PASS",
  runtimeAppId: expected.appId,
  targetSiteId: expected.siteId,
  grantId: expected.grantId,
  role: "read",
  tenantWideSharePointAccess: false,
  unrelatedSiteGrants: 0,
  effectiveProbe: "PASS",
  observedAt: new Date(now).toISOString(),
};

test("accepts only fresh independent exact-site read authority", () => {
  assert.equal(validatePermissionState(state, expected, now), true);
  assert.throws(() => validatePermissionState({ ...state, grantId: undefined },
    { ...expected, grantId: undefined }, now));
});

for (const change of [
  { status: "DRIFTED" }, { role: "write" }, { grantId: "other" },
  { tenantWideSharePointAccess: true }, { unrelatedSiteGrants: 1 },
  { effectiveProbe: "FAIL" }, { observedAt: new Date(now - MAX_AGE_MS - 1).toISOString() },
]) {
  test(`denies permission state ${JSON.stringify(change)}`, () => {
    assert.throws(() => validatePermissionState({ ...state, ...change }, expected, now));
  });
}
