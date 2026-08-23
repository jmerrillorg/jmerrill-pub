"use strict";

const { app } = require("@azure/functions");

/**
 * Anonymous, read-only health/version endpoint. Returns only safe,
 * non-sensitive process/deployment metadata — no manuscript content, no
 * Dataverse data, no secrets. Exists so operations can answer "what commit
 * is running in func-jm1-diagnostic-ai-runner?" without reconstructing
 * deployment timestamps, mirroring the existing JM1_RELEASE_SHA / health
 * pattern already used elsewhere in the JMP estate (e.g. the Next.js
 * app-jm1-pub-prod /api/health route).
 */
async function healthHandler() {
  return {
    status: 200,
    jsonBody: {
      status: "ready",
      release: process.env.JM1_RELEASE_SHA || null,
      productionRelease: process.env.JM1_PRODUCTION_RELEASE_SHA || null,
      node: process.version
    }
  };
}

app.http("health", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "health",
  handler: healthHandler
});

module.exports = { healthHandler };
