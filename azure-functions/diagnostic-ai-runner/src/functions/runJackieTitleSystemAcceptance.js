"use strict";

const { app } = require("@azure/functions");
const { createDataverseClient } = require("../orchestration/authorReviewResponseConsumer");
const { runJackieTitleSystemAcceptance } = require("../author/jackieTitleSystemAcceptance");

async function handleJackieTitleSystemAcceptance(request, deps = {}) {
  const expected = deps.expectedKey ?? process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
  const actual = request.headers.get("x-jm1-diagnostic-runner-key");
  if (!expected || !actual || actual !== expected) {
    return { status: 401, jsonBody: { error: "UNAUTHORIZED" } };
  }
  try {
    const client = deps.client || createDataverseClient({
      apiBase: process.env.DATAVERSE_WEB_API_BASE_URL,
      resourceUrl: process.env.DATAVERSE_RESOURCE_URL,
    });
    return await runJackieTitleSystemAcceptance({
      list: (...args) => client.list(...args),
      first: (...args) => client.first(...args),
    });
  } catch {
    return { status: 503, jsonBody: { error: "AUTHORITATIVE_READ_FAILED" } };
  }
}

app.http("publishing-jackie-title-system-acceptance", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "publishing/authority/jackie-title-acceptance",
  handler: (request) => handleJackieTitleSystemAcceptance(request),
});

module.exports = { handleJackieTitleSystemAcceptance };
