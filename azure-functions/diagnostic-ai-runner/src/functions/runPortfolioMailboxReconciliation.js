"use strict";

const { app } = require("@azure/functions");
const { runPortfolioMailboxReconciliation } = require("../mail/portfolioMailboxReconciliationReader");

async function handler(request, context) {
    if ((process.env.JM1_PORTFOLIO_MAIL_RECONCILIATION_ENABLED || "").toLowerCase() !== "true") {
      return { status: 403, jsonBody: { status: "DISABLED" } };
    }
    let body;
    try { body = await request.json(); } catch {
      return { status: 400, jsonBody: { code: "INVALID_RECONCILIATION_REQUEST" } };
    }
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        Object.keys(body).some((key) => key !== "runId") ||
        typeof body.runId !== "string" || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(body.runId)) {
      return { status: 400, jsonBody: { code: "INVALID_RECONCILIATION_REQUEST" } };
    }
    try {
      const result = await runPortfolioMailboxReconciliation({ runId: body.runId });
      context.info(`Portfolio mailbox reconciliation complete; run=${result.runId}; rows=${result.rawRowCountBeforeSameMailboxDeduplication}.`);
      return { status: 200, jsonBody: result };
    } catch (error) {
      context.error(`Portfolio mailbox reconciliation incomplete: ${error.safeCode || "UNEXPECTED_FAILURE"}.`);
      return { status: 503, jsonBody: { status: "INCOMPLETE", code: error.safeCode || "UNEXPECTED_FAILURE",
        runId: error.runId || body.runId.toLowerCase(), failureReceiptUnavailable: error.failureReceiptUnavailable !== false } };
    }
}
app.http("run-portfolio-mailbox-reconciliation", {
  methods: ["POST"],
  authLevel: "function",
  route: "run-portfolio-mailbox-reconciliation",
  handler
});

module.exports = { handler };
