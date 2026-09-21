"use strict";

const { app } = require("@azure/functions");
const { sendAttaTitleDecision } = require("../editorial/attaTitleDecisionSender");

app.http("run-atta-title-decision-send", {
  methods: ["POST"], authLevel: "anonymous", route: "run-atta-title-decision-send",
  handler: async (request, context) => {
    const expected = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
    if (!expected || request.headers.get("x-jm1-diagnostic-runner-key") !== expected) {
      context.warn("Atta title decision send rejected: invalid runner key.");
      return { status: 401, jsonBody: { ok: false, status: "BLOCKED", code: "UNAUTHORIZED" } };
    }
    const result = await sendAttaTitleDecision(await request.json().catch(() => ({})));
    return { status: result.ok ? 200 : 422, jsonBody: result };
  }
});

module.exports = {};
