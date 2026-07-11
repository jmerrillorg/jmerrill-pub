"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const {
  assertCostCeiling,
  estimateCost,
  estimateDuration
} = require("../src/editorial/stage0HierarchicalBatchPlanner");

describe("stage0 cost and execution controls", () => {
  test("computes estimated cost when pricing inputs are available", () => {
    const plan = {
      estimatedInputTokens: 10000,
      estimatedOutputTokens: 4000,
      estimatedModelCalls: 3
    };

    const cost = estimateCost(plan, { inputPer1k: 0.01, outputPer1k: 0.03 });
    assert.equal(cost, 0.22);
  });

  test("enforces configured cost ceiling", () => {
    process.env.JM1_STAGE0_COST_CEILING_USD = "1.00";
    const result = assertCostCeiling({}, 1.25);
    assert.equal(result.allowed, false);
    assert.equal(result.ceilingUsd, 1);
    delete process.env.JM1_STAGE0_COST_CEILING_USD;
  });

  test("estimates duration from model call count", () => {
    const plan = { estimatedModelCalls: 5 };
    assert.equal(estimateDuration(plan, 2000), 10000);
  });
});
