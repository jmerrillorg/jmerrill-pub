"use strict";

const { app } = require("@azure/functions");
const { createDataverseClient } = require("../orchestration/authorReviewResponseConsumer");
const { processStageEvent } = require("../lifecycle/stageRuntimeProcessor");
const { readStageAuthority } = require("../lifecycle/stageRuntimeAuthority");
const { resumePublishingWait } = require("../lifecycle/publishingWaitContract");
const { createPublishingWaitResumeAdapter } = require("../lifecycle/publishingWaitResumeAdapter");

const QUEUE = "jm1-publishing-stage-events";

function parseEvent(message) {
  if (Buffer.isBuffer(message)) return parseEvent(message.toString("utf8"));
  if (typeof message === "string") return JSON.parse(message);
  if (message && typeof message === "object" && message.eventType) return message;
  throw Object.assign(new Error("PUBLISHING_STAGE_QUEUE_MESSAGE_INVALID"), {
    safeCode: "PUBLISHING_STAGE_QUEUE_MESSAGE_INVALID"
  });
}

async function processPublishingStageMessage(message, deps = {}) {
  const event = parseEvent(message);
  if (event.eventType === "WAIT_RESOLVED") {
    const adapters = deps.waitAdapters || (deps.waitRuntime && createPublishingWaitResumeAdapter(deps.waitRuntime));
    return resumePublishingWait(event, adapters);
  }
  const client = deps.client || createDataverseClient({
    apiBase: process.env.DATAVERSE_WEB_API_BASE_URL,
    resourceUrl: process.env.DATAVERSE_RESOURCE_URL
  });
  return processStageEvent(event, {
    ...deps,
    authorize: deps.authorize || ((item) => readStageAuthority(item, client))
  });
}

if ((process.env.JM1_PUBLISHING_STAGE_RUNTIME_ENABLED || "").toLowerCase() === "true") {
  app.storageQueue("run-publishing-stage-runtime-worker", {
    queueName: process.env.JM1_PUBLISHING_STAGE_EVENT_QUEUE_NAME || QUEUE,
    connection: "AzureWebJobsStorage",
    handler: async (message, context) => {
      const result = await processPublishingStageMessage(message);
      context.info(`Publishing stage event ${result.status}; phase=${result.phase || "WAIT_RESUME"}.`);
    }
  });
}

module.exports = { parseEvent, processPublishingStageMessage };
