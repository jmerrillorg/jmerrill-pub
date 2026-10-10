"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { coverAdapterAcceptanceHandler, runScheduledCoverAdapterAcceptance } = require("../src/production/coverAdapterAcceptanceHandler");

test("disabled acceptance never reads a body, storage or credentials", async () => {
  const result = await coverAdapterAcceptanceHandler({ json: () => { throw new Error("must not read"); } }, { env: {} });
  assert.equal(result.status, 403);
  assert.deepEqual(await runScheduledCoverAdapterAcceptance({ env: {} }), { enabled: false, results: [] });
});

test("acceptance rejects caller title, URL, approval and arbitrary actions before storage", async () => {
  for (const body of [{ action: "SEED", titleId: "real-title" }, { action: "READ", url: "https://example.com" },
    { action: "DISPATCH", approval: true }, { action: "GENERATE" }, null]) {
    const result = await coverAdapterAcceptanceHandler({ json: async () => body, headers: { get: () => "fixture-key" } },
      { env: { JM1_COVER_ADAPTER_ACCEPTANCE_ENABLED: "true", JM1_DIAGNOSTIC_RUNNER_KEY: "fixture-key" } });
    assert.equal(result.status, 400);
  }
});

test("acceptance requires the existing internal runner key before parsing or storage", async () => {
  const result = await coverAdapterAcceptanceHandler({ headers: { get: () => "wrong" }, json: () => { throw new Error("must not read"); } },
    { env: { JM1_COVER_ADAPTER_ACCEPTANCE_ENABLED: "true", JM1_DIAGNOSTIC_RUNNER_KEY: "fixture-key" } });
  assert.equal(result.status, 403);
});
