"use strict";

const { app } = require("@azure/functions");
const { Stage0DataverseSource } = require("./stage0DataverseSource");

app.timer("stage0-shadow-poll", {
  schedule: "0 */5 * * * *",
  run: async (_timer, context) => {
    if (process.env.JM1_SHADOW_ENABLED !== "true") {
      context.log("stage0_shadow_disabled");
      return;
    }
    if (process.env.JM1_SHADOW_ROUTE_STATUS !== "ACTIVE") {
      context.error("stage0_shadow_route_not_active");
      return;
    }
    // Real-data execution stays closed until the site-scoped asset read and
    // independent-evaluation ports pass their production proofs.
    if (process.env.JM1_SHADOW_EXECUTION_CERTIFIED !== "true") {
      context.error("stage0_shadow_execution_not_certified");
      return;
    }
    const source = new Stage0DataverseSource({
      apiBase: process.env.DATAVERSE_WEB_API_BASE_URL,
      resourceUrl: process.env.DATAVERSE_RESOURCE_URL,
      clientId: process.env.JM1_SHADOW_MANAGED_IDENTITY_CLIENT_ID,
      activationUtc: process.env.JM1_SHADOW_ACTIVATION_UTC,
    });
    const events = await source.listNaturalCompletedEvents();
    context.log(`stage0_shadow_natural_events_observed=${events.length}`);
    throw new Error("STAGE0_SHADOW_EXECUTOR_NOT_BOUND");
  },
});
