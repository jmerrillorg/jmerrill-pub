"use strict";

const { app } = require("@azure/functions");
const { runEditorialCadenceReleaseConsumer } = require("../editorial/editorialCadenceReleaseConsumer");

app.timer("run-editorial-cadence-release-consumer", {
  schedule: "0 */10 * * * *",
  handler: async (_timer, context) => {
    const result = await runEditorialCadenceReleaseConsumer({
      correlationId: `EDITORIAL-CADENCE-RELEASE-TIMER-${new Date().toISOString()}`,
      maxSchedules: Number(process.env.JM1_EDITORIAL_CADENCE_RELEASE_MAX_SCHEDULES || 40)
    });
    context.info(
      `Editorial cadence release refreshed; examined=${result.examined}; scheduled=${result.scheduled}; dueSystemAttention=${result.dueSystemAttention}; alreadyReleased=${result.alreadyReleased}; correlation=${result.correlationId}`
    );
  }
});

module.exports = {};
