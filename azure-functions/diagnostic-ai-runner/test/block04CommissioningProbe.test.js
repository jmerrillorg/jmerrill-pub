"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildBlock04CommissioningProbe,
  runBlock04CommissioningProbeHandler
} = require("../src/functions/runBlock04CommissioningProbe");

test("Block 04 commissioning probe reports all required negative probes as PASS", () => {
  const result = buildBlock04CommissioningProbe();

  assert.equal(result.status, "ready");
  assert.equal(result.negativeFailures.length, 0);
  assert.equal(Object.keys(result.negative).length, 18);
  for (const [key, value] of Object.entries(result.negative)) {
    assert.equal(value, "PASS", key);
  }
});

test("Block 04 commissioning probe reports valid synthetic and alternate paths as PASS", () => {
  const result = buildBlock04CommissioningProbe();

  assert.equal(result.validPath.syntheticCommissioning, "PASS");
  assert.equal(result.validPath.finalCertification, "PASS");
  assert.equal(result.validPath.productionReady, "PASS");
  assert.equal(result.alternateFailures.length, 0);
  for (const [key, value] of Object.entries(result.alternates)) {
    assert.equal(value, "PASS", key);
  }
});

test("Block 04 commissioning probe handler is read-only and returns synthetic JSON", async () => {
  const response = await runBlock04CommissioningProbeHandler();

  assert.equal(response.status, 200);
  assert.equal(response.jsonBody.status, "ready");
  assert.equal(response.jsonBody.negativeFailures.length, 0);
});
