"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { REQUIRED, validateAuthorityProbe } = require("../../src/shadow/authorityProbeState");

const now = Date.parse("2026-09-25T12:00:00Z");
const state = { schemaVersion: "1.0.0", observedAt: new Date(now).toISOString(),
  states: Object.fromEntries(REQUIRED.map((name) => [name, "PASS"])) };

test("recent positive and negative access probes pass", () => {
  assert.equal(validateAuthorityProbe(state, now), true);
});

test("missing, failed, and stale probes deny inference", () => {
  assert.throws(() => validateAuthorityProbe({ ...state, states: { ...state.states, targetSiteRead: "FAIL" } }, now));
  assert.throws(() => validateAuthorityProbe({ ...state, states: {} }, now));
  assert.throws(() => validateAuthorityProbe({ ...state, observedAt: new Date(now - 11 * 60_000).toISOString() }, now));
});
