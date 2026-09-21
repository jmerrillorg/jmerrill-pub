"use strict";

const { app } = require("@azure/functions");
const { isNoonEastern, runPublishingPaymentTimer } = require("../payment/publishingPaymentTimer");

app.timer("run-publishing-payment-timer", {
  schedule: "0 0 * * * *",
  handler: async (_timer, context) => {
    if (!isNoonEastern()) {
      context.info("Publishing payment timer skipped outside the governed noon ET window.");
      return;
    }
    const result = await runPublishingPaymentTimer();
    context.info(`PUBLISHING_PAYMENT_TIMER status=${result.status} code=${result.code} mode=${result.mode} candidates=${result.candidates || 0} financialEffects=0`);
    if (result.status === "ATTENTION_REQUIRED") throw Object.assign(new Error(result.code), { safeCode: result.code });
  },
});

app.http("run-publishing-payment-timer-certification", {
  methods: ["POST"],
  authLevel: "function",
  route: "run-publishing-payment-timer-certification",
  handler: async (request, context) => {
    const body = await request.json().catch(() => ({}));
    const mode = body.mode === "LIVE_READ_ONLY" ? "DRY_RUN" : "DISABLED";
    const result = await runPublishingPaymentTimer({ mode, asOf: body.asOf });
    context.info(`PUBLISHING_PAYMENT_TIMER_CERTIFICATION status=${result.status} mode=${mode} financialEffects=0`);
    return { status: result.status === "ATTENTION_REQUIRED" ? 503 : 200, jsonBody: result };
  },
});
