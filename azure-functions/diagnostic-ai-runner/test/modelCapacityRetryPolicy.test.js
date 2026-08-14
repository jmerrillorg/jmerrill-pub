"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  classifyModelFailureForWorkflow,
  isTransientCapacityFailure,
  calculateNextAttemptAt,
  calculateProviderRetryAttemptAt
} = require("../src/model/modelCapacityRetryPolicy");

describe("modelCapacityRetryPolicy", () => {
  test("classifies Azure OpenAI HTTP 429 as system-owned transient capacity", () => {
    const result = classifyModelFailureForWorkflow(
      { ok: false, httpStatus: 429, error: "AZURE_OPENAI_HTTP_429: Requests to the ChatCompletions_Create Operation have exceeded rate limit" },
      {
        attemptCount: 0,
        now: new Date("2026-08-13T12:00:00.000Z"),
        env: {
          JM1_STAGE0_MODEL_CAPACITY_MAX_RETRIES: "5",
          JM1_STAGE0_MODEL_CAPACITY_RETRY_BASE_MINUTES: "15",
          JM1_STAGE0_MODEL_CAPACITY_RETRY_MAX_MINUTES: "240"
        }
      }
    );

    assert.equal(result.retryable, true);
    assert.equal(result.code, "MODEL_CAPACITY_RETRY_SCHEDULED");
    assert.equal(result.reason, "TRANSIENT_MODEL_CAPACITY");
    assert.equal(result.waitingOn, "System");
    assert.equal(result.notificationRequired, false);
    assert.equal(result.retryCount, 1);
    assert.equal(result.nextAttemptAt, "2026-08-13T12:15:00.000Z");
  });

  test("does not classify non-capacity model errors as retry-scheduled", () => {
    const result = classifyModelFailureForWorkflow({ ok: false, httpStatus: 400, error: "BAD_REQUEST" });
    assert.equal(result.retryable, false);
    assert.equal(result.notificationRequired, true);
  });

  test("marks persistent 429 as fallback-evaluation required after threshold", () => {
    const result = classifyModelFailureForWorkflow(
      { ok: false, httpStatus: 429, error: "AZURE_OPENAI_HTTP_429" },
      { attemptCount: 5, env: { JM1_STAGE0_MODEL_CAPACITY_MAX_RETRIES: "5" } }
    );
    assert.equal(result.retryable, false);
    assert.equal(result.code, "MODEL_CAPACITY_RETRY_THRESHOLD_REACHED");
    assert.equal(result.fallbackEvaluationRequired, true);
    assert.equal(result.notificationRequired, false);
  });

  test("supports equivalent rate-limit wording even when httpStatus is absent", () => {
    assert.equal(isTransientCapacityFailure({ error: "rate limit exceeded" }), true);
  });

  test("uses exponential backoff bounded by max delay", () => {
    const result = calculateNextAttemptAt({
      attemptCount: 4,
      now: new Date("2026-08-13T12:00:00.000Z"),
      config: { baseDelayMinutes: 15, maxDelayMinutes: 60, maxRetries: 5 }
    });
    assert.equal(result.delayMinutes, 60);
    assert.equal(result.nextAttemptAt, "2026-08-13T13:00:00.000Z");
  });

  test("honors provider retry-after when scheduling workflow retry", () => {
    const result = classifyModelFailureForWorkflow(
      {
        ok: false,
        httpStatus: 429,
        error: "AZURE_OPENAI_HTTP_429",
        rateLimit: { retryAfterMs: 120000 }
      },
      {
        attemptCount: 0,
        now: new Date("2026-08-13T12:00:00.000Z"),
        env: {
          JM1_STAGE0_MODEL_CAPACITY_MAX_RETRIES: "5",
          JM1_STAGE0_MODEL_CAPACITY_RETRY_BASE_MINUTES: "15",
          JM1_STAGE0_MODEL_CAPACITY_RETRY_MAX_MINUTES: "240"
        }
      }
    );

    assert.equal(result.retryable, true);
    assert.equal(result.retryAfterHonored, true);
    assert.equal(result.delayMinutes, 2);
    assert.equal(result.nextAttemptAt, "2026-08-13T12:02:00.000Z");
  });

  test("bounds provider retry-after by configured max delay", () => {
    const result = calculateProviderRetryAttemptAt({
      retryAfterMs: 10 * 60 * 1000,
      now: new Date("2026-08-13T12:00:00.000Z"),
      maxDelayMinutes: 3
    });

    assert.equal(result.delayMinutes, 3);
    assert.equal(result.nextAttemptAt, "2026-08-13T12:03:00.000Z");
  });
});
