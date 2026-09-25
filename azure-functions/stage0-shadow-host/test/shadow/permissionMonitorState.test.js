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
  siteEnumerationComplete: true,
  personalSiteIds: [],
  observedAt: new Date(now).toISOString(),
};

test("accepts only fresh independent exact-site read authority", () => {
  assert.deepEqual(validatePermissionState(state, expected, now), []);
  assert.throws(() => validatePermissionState({ ...state, grantId: undefined },
    { ...expected, grantId: undefined }, now));
});

for (const change of [
  { status: "DRIFTED" }, { role: "write" }, { grantId: "other" },
  { tenantWideSharePointAccess: true }, { unrelatedSiteGrants: 1 },
  { siteEnumerationComplete: false }, { personalSiteIds: ["personal"] },
  { observedAt: new Date(now - MAX_AGE_MS - 1).toISOString() },
]) {
  test(`denies permission state ${JSON.stringify(change)}`, () => {
    assert.throws(() => validatePermissionState({ ...state, ...change }, expected, now));
  });
}

test("personal-site state requires runtime denial probes", () => {
  assert.deepEqual(validatePermissionState({ ...state,
    status: "CONTROL_PLANE_PASS_RUNTIME_PERSONAL_PROBE_REQUIRED",
    personalSiteIds: ["tenant-my.sharepoint.com,00000000-0000-4000-8000-000000000001,00000000-0000-4000-8000-000000000002"],
  }, expected, now).length, 1);
});
