"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { projectMaximumCost, actualCostCents } = require("../../src/shadow/stage0ModelCost");

test("projection reserves before inference and covers bounded actual usage", () => {
  const input = { approvedExcerpt: "Synthetic test excerpt." };
  const projected = projectMaximumCost(input);
  assert.ok(projected >= actualCostCents({ input: 200, output: 100 }));
  assert.ok(projected > 0);
});

test("unknown, oversized, or out-of-envelope usage fails closed", () => {
  assert.throws(() => projectMaximumCost({ approvedExcerpt: "x".repeat(12001) }));
  assert.throws(() => actualCostCents({ input: undefined, output: 2 }));
  assert.throws(() => actualCostCents({ input: 2, output: 501 }));
});
