"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { classifySystemIncidentClosure } = require("../src/governance/systemIncidentClosure");

test("client recovery alone does not close a system defect", () => {
  assert.deepEqual(classifySystemIncidentClosure({ clientRecovered: true }), {
    status: "CLIENT_RECOVERED_SYSTEM_NOT_REPAIRED",
    closed: false
  });
});

test("source repair without deployment and replay is not commissioned", () => {
  assert.deepEqual(classifySystemIncidentClosure({
    rootCauseRepaired: true,
    canonicalSourceUpdated: true,
    regressionProof: true,
    systemReplay: true,
    deploymentRequired: true,
    deployed: false
  }), { status: "SYSTEM_REPAIRED_NOT_COMMISSIONED", closed: false });
});

test("closure requires client recovery, source repair, regression proof, deployment, and replay", () => {
  assert.deepEqual(classifySystemIncidentClosure({
    clientRecovered: true,
    rootCauseRepaired: true,
    canonicalSourceUpdated: true,
    regressionProof: true,
    systemReplay: true,
    deploymentRequired: true,
    deployed: true
  }), { status: "FULLY_CLOSED", closed: true });
});
