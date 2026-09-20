"use strict";

const { app } = require("@azure/functions");
const { runConnectReminderRuntime } = require("../stripe/connectReminderRuntime");

function isNoonEastern(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", hour12: false }).formatToParts(now);
  return Number(parts.find((part) => part.type === "hour")?.value) === 12;
}

app.timer("run-stripe-connect-reminder-monitor", {
  schedule: "0 0 * * * *",
  handler: async (_timer, context) => {
    if (!isNoonEastern()) {
      context.info("Stripe Connect reminder monitor skipped outside the governed noon ET window.");
      return;
    }
    try {
      const result = await runConnectReminderRuntime();
      context.info(`STRIPE_CONNECT_MONITOR ${JSON.stringify(result)}`);
    } catch (error) {
      context.error(`STRIPE_CONNECT_MONITOR_FAILURE code=${error?.safeCode || error?.message || "UNKNOWN"}`);
      throw error;
    }
  }
});

app.http("run-stripe-connect-reminder-monitor-certification", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "run-stripe-connect-reminder-monitor-certification",
  handler: async (request, context) => {
    const expected = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
    if (!expected || request.headers.get("x-jm1-diagnostic-runner-key") !== expected) {
      context.warn("Stripe Connect monitor certification rejected invalid authority.");
      return { status: 401, jsonBody: { status: "DENIED", code: "UNAUTHORIZED" } };
    }
    const body = await request.json().catch(() => ({}));
    const mode = body.mode === "LIVE_READ_ONLY" ? "READ_ONLY" : "FIXTURE";
    const result = await runConnectReminderRuntime({ mode, now: body.now });
    context.info(`STRIPE_CONNECT_MONITOR_CERTIFICATION mode=${mode} status=${result.status} effects=0`);
    return { status: 200, jsonBody: { ...result, certificationMode: mode, effects: 0 } };
  }
});

module.exports = { isNoonEastern };
