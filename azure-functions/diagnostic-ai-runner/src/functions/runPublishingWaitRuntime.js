"use strict";

const { app } = require("@azure/functions");
const { createPublishingWaitRuntime, SIGNAL_QUEUE } = require("../lifecycle/publishingWaitRuntime");
const { dispatchPublishingWait, reconcilePublishingWaits } = require("../lifecycle/publishingWaitCoordinator");

async function runWaitReconciliation(runtime, { observationOnly = false } = {}) {
  if (observationOnly) {
    const health = await runtime.publishHealth([], [], { observationOnly: true });
    return { registered: 0, observationOnly: true, health, results: [] };
  }
  let produced;
  try { produced = await runtime.produceAuthorWaits(); }
  catch (error) { produced = { registered: 0, failures: [{ code: error.safeCode || "PUBLISHING_WAIT_PRODUCER_FAILED" }] }; }
  const results = await reconcilePublishingWaits(runtime);
  const health = await runtime.publishHealth(results, produced.failures);
  return { ...produced, health, results };
}
if (process.env.JM1_PUBLISHING_WAIT_RUNTIME_ENABLED === "true") {
  app.storageQueue("run-publishing-wait-resume", {
    queueName: SIGNAL_QUEUE, connection: "AzureWebJobsStorage",
    handler: async (message, context) => {
      const signal = typeof message === "string" ? JSON.parse(message) : message;
      const result = await dispatchPublishingWait(signal, createPublishingWaitRuntime({ observe: (event) => context.info(JSON.stringify(event)) }));
      context.info(`Publishing wait resume: ${result.status}`);
    }
  });
}
if (process.env.JM1_PUBLISHING_WAIT_RUNTIME_ENABLED === "true" || process.env.JM1_PUBLISHING_WAIT_OBSERVATION_ENABLED === "true" || process.env.JM1_TITLE_COMMISSIONING_INTAKE_ENABLED === "true") {
  app.timer("reconcile-publishing-waits", {
    schedule: "0 */5 * * * *", handler: async (_timer, context) => {
      let waitFailures = [];
      if (process.env.JM1_PUBLISHING_WAIT_RUNTIME_ENABLED === "true" || process.env.JM1_PUBLISHING_WAIT_OBSERVATION_ENABLED === "true") {
        try {
          const result = await runWaitReconciliation(createPublishingWaitRuntime({ observe: (event) => context.info(JSON.stringify(event)) }),
            { observationOnly: process.env.JM1_PUBLISHING_WAIT_RUNTIME_ENABLED !== "true" });
          context.info(`Publishing wait health: ${JSON.stringify(result.health)}`);
          waitFailures = result.health.failures;
        } catch {
          waitFailures = [{ code: "PUBLISHING_WAIT_OBSERVATION_UNAVAILABLE" }];
          context.info("Publishing wait health: PUBLISHING_WAIT_OBSERVATION_UNAVAILABLE");
        }
      }
      const intake = await require("../lifecycle/titleCommissioningIntakeRuntime").runTitleCommissioningIntakeRuntime();
      if (intake.enabled) context.info(`Publishing commissioning intake: ${JSON.stringify(intake)}`);
      if (waitFailures.length || intake.failures.length) throw Object.assign(new Error("Publishing runtime requires owner review"), { safeCode: "PUBLISHING_WAIT_FAILURES" });
    }
  });
}
module.exports = { runWaitReconciliation };
