"use strict";

const { app } = require("@azure/functions");
const { createPublishingWaitRuntime, SIGNAL_QUEUE } = require("../lifecycle/publishingWaitRuntime");
const { dispatchPublishingWait, reconcilePublishingWaits } = require("../lifecycle/publishingWaitCoordinator");

async function runWaitReconciliation(runtime) {
  const produced = await runtime.produceAuthorWaits();
  const results = await reconcilePublishingWaits(runtime);
  const health = await runtime.publishHealth(results);
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
  app.timer("reconcile-publishing-waits", {
    schedule: "0 */5 * * * *", handler: async (_timer, context) => {
      const result = await runWaitReconciliation(createPublishingWaitRuntime({ observe: (event) => context.info(JSON.stringify(event)) }));
      context.info(`Publishing wait health: ${JSON.stringify(result.health)}`);
      if (result.health.failures.length) throw Object.assign(new Error("Publishing waits require owner review"), { safeCode: "PUBLISHING_WAIT_FAILURES" });
    }
  });
}
module.exports = { runWaitReconciliation };
