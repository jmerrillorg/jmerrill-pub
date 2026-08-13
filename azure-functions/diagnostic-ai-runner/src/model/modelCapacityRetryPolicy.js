"use strict";

const DEFAULT_MAX_WORKFLOW_RETRIES = 5;
const DEFAULT_BASE_DELAY_MINUTES = 15;
const DEFAULT_MAX_DELAY_MINUTES = 240;

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAttemptCount(value) {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number.parseInt(value.trim(), 10);
  return 0;
}

function isTransientCapacityFailure(modelResult = {}) {
  const error = normalizeString(modelResult.error).toLowerCase();
  const httpStatus = Number(modelResult.httpStatus);
  return httpStatus === 429 || error.includes("http_429") || error.includes("rate limit") || error.includes("too many requests");
}

function retryPolicyConfig(env = process.env) {
  const maxRetries = normalizeAttemptCount(env.JM1_STAGE0_MODEL_CAPACITY_MAX_RETRIES) || DEFAULT_MAX_WORKFLOW_RETRIES;
  const baseDelayMinutes = normalizeAttemptCount(env.JM1_STAGE0_MODEL_CAPACITY_RETRY_BASE_MINUTES) || DEFAULT_BASE_DELAY_MINUTES;
  const maxDelayMinutes = normalizeAttemptCount(env.JM1_STAGE0_MODEL_CAPACITY_RETRY_MAX_MINUTES) || DEFAULT_MAX_DELAY_MINUTES;
  return { maxRetries, baseDelayMinutes, maxDelayMinutes };
}

function calculateNextAttemptAt({ attemptCount = 0, now = new Date(), config = retryPolicyConfig() } = {}) {
  const nextAttemptNumber = normalizeAttemptCount(attemptCount) + 1;
  const exponent = Math.max(0, nextAttemptNumber - 1);
  const delayMinutes = Math.min(config.maxDelayMinutes, config.baseDelayMinutes * (2 ** exponent));
  return {
    nextAttemptNumber,
    delayMinutes,
    nextAttemptAt: new Date(now.getTime() + delayMinutes * 60 * 1000).toISOString()
  };
}

function classifyModelFailureForWorkflow(modelResult = {}, input = {}) {
  if (!isTransientCapacityFailure(modelResult)) {
    return {
      retryable: false,
      code: "MODEL_FAILURE_NOT_RETRYABLE",
      waitingOn: "Jackie",
      notificationRequired: true
    };
  }

  const config = retryPolicyConfig(input.env || process.env);
  const attemptCount = normalizeAttemptCount(input.attemptCount);
  if (attemptCount >= config.maxRetries) {
    return {
      retryable: false,
      code: "MODEL_CAPACITY_RETRY_THRESHOLD_REACHED",
      waitingOn: "System",
      notificationRequired: false,
      fallbackEvaluationRequired: true,
      attemptCount,
      maxRetries: config.maxRetries
    };
  }

  const schedule = calculateNextAttemptAt({ attemptCount, now: input.now || new Date(), config });
  return {
    retryable: true,
    code: "MODEL_CAPACITY_RETRY_SCHEDULED",
    reason: "TRANSIENT_MODEL_CAPACITY",
    waitingOn: "System",
    notificationRequired: false,
    attemptCount,
    retryCount: schedule.nextAttemptNumber,
    nextAttemptAt: schedule.nextAttemptAt,
    delayMinutes: schedule.delayMinutes,
    maxRetries: config.maxRetries
  };
}

module.exports = {
  classifyModelFailureForWorkflow,
  isTransientCapacityFailure,
  calculateNextAttemptAt,
  retryPolicyConfig,
  DEFAULT_MAX_WORKFLOW_RETRIES,
  DEFAULT_BASE_DELAY_MINUTES,
  DEFAULT_MAX_DELAY_MINUTES
};
