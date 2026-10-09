"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { verifyCommissioningProductionGuards } = require("../src/lifecycle/commissioningProductionGuardProbe");

test("fixed production fixtures exercise canonical guards without network or real title effects", async () => {
  const fetch = globalThis.fetch;
  globalThis.fetch = async () => { throw Error("NO_EXTERNAL_NETWORK_ALLOWED"); };
  try {
    const first = await verifyCommissioningProductionGuards();
    const replay = await verifyCommissioningProductionGuards();
    assert.deepEqual(replay, first);
    assert.equal(Object.keys(first).length, 7);
    assert.ok(Object.values(first).every(value => value === true));
  } finally {
    globalThis.fetch = fetch;
  }
});
