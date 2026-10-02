"use strict";

const { app } = require("@azure/functions");
const { runPortfolioMailboxReconciliation } = require("../mail/portfolioMailboxReconciliationReader");

app.http("run-portfolio-mailbox-reconciliation", {
  methods: ["POST"],
  authLevel: "function",
  route: "run-portfolio-mailbox-reconciliation",
  handler: async (_request, context) => {
    if ((process.env.JM1_PORTFOLIO_MAIL_RECONCILIATION_ENABLED || "").toLowerCase() !== "true") {
      return { status: 403, jsonBody: { status: "DISABLED" } };
    }
    try {
      const result = await runPortfolioMailboxReconciliation();
      context.info(`Portfolio mailbox reconciliation complete; run=${result.runId}; rows=${result.rawRowCountBeforeSameMailboxDeduplication}.`);
      return { status: 200, jsonBody: result };
    } catch (error) {
      context.error(`Portfolio mailbox reconciliation incomplete: ${error.safeCode || "UNEXPECTED_FAILURE"}.`);
      return { status: 503, jsonBody: { status: "INCOMPLETE", code: error.safeCode || "UNEXPECTED_FAILURE" } };
    }
  }
});

module.exports = {};
