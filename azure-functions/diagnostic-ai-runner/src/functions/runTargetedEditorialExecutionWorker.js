"use strict";

const { app } = require("@azure/functions");
const {
  DEFAULT_QUEUE_NAME,
  processQueuedTargetedEditorialExecution
} = require("../editorial/targetedEditorialExecutionQueue");

app.storageQueue("run-targeted-editorial-execution-worker", {
  queueName: process.env.JM1_TARGETED_EDITORIAL_EXECUTION_QUEUE_NAME || DEFAULT_QUEUE_NAME,
  connection: "AzureWebJobsStorage",
  handler: async (message, context) => {
    const result = await processQueuedTargetedEditorialExecution(message);
    context.info(
      `Targeted editorial execution worker completed; status=${result.status}; idempotency=${result.idempotencyKey || "n/a"}`
    );
  }
});

module.exports = {};
