"use strict";

const { app } = require("@azure/functions");
const { runEditorialPackageHandoffConsumer } = require("../editorial/editorialPackageHandoffConsumer");

app.timer("run-editorial-package-handoff-consumer", {
  schedule: "0 */10 * * * *",
  handler: async (_timer, context) => {
    const result = await runEditorialPackageHandoffConsumer({
      correlationId: `EDITORIAL-PACKAGE-HANDOFF-TIMER-${new Date().toISOString()}`,
      maxOutputs: Number(process.env.JM1_EDITORIAL_PACKAGE_HANDOFF_MAX_OUTPUTS || 20)
    });
    context.info(
      `Editorial-to-Package handoff completed; examined=${result.examined}; completed=${result.completed}; blocked=${result.blocked}; idempotent=${result.idempotent}; correlation=${result.correlationId}`
    );
  }
});

module.exports = {};
