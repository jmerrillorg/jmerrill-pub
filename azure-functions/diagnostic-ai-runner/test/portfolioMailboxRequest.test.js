"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { handler } = require("../src/functions/runPortfolioMailboxReconciliation");

test("disabled reader and invalid requests never initiate extraction", async () => {
  const previous = process.env.JM1_PORTFOLIO_MAIL_RECONCILIATION_ENABLED;
  try {
    process.env.JM1_PORTFOLIO_MAIL_RECONCILIATION_ENABLED = "false";
    assert.equal((await handler({ json: () => { throw Error("must not read"); } }, {})).status, 403);
    process.env.JM1_PORTFOLIO_MAIL_RECONCILIATION_ENABLED = "true";
    for (const body of [null, {}, [], { runId: 7 }, { runId: "bad" },
      { runId: "11111111-1111-4111-8111-111111111111", mailbox: "other@example.org" }]) {
      assert.equal((await handler({ json: async () => body }, {})).status, 400);
    }
    assert.equal((await handler({ json: async () => { throw Error("bad JSON"); } }, {})).status, 400);
  } finally {
    if (previous === undefined) delete process.env.JM1_PORTFOLIO_MAIL_RECONCILIATION_ENABLED;
    else process.env.JM1_PORTFOLIO_MAIL_RECONCILIATION_ENABLED = previous;
  }
});
