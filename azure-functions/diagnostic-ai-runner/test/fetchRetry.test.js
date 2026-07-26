"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const { fetchWithRetry } = require("../src/model/providerSupport");

describe("fetchWithRetry", () => {
  test("retries retryable HTTP responses and succeeds on the next attempt", async () => {
    const attempts = [];

    const result = await fetchWithRetry({
      timeoutMs: 100,
      maxRetries: 2,
      baseDelayMs: 1,
      jitterRatio: 0,
      shouldRetry: (response) => response.status === 429,
      requestFn: async ({ attempt }) => {
        attempts.push(attempt);
        if (attempt === 1) {
          return {
            ok: false,
            status: 429,
            headers: new Headers({ "retry-after": "0" })
          };
        }

        return {
          ok: true,
          status: 200,
          headers: new Headers()
        };
      }
    });

    assert.equal(result.status, 200);
    assert.deepEqual(attempts, [1, 2]);
  });

  test("retries timeout aborts up to the configured bound", async () => {
    let attempts = 0;

    await assert.rejects(
      fetchWithRetry({
        timeoutMs: 10,
        maxRetries: 1,
        baseDelayMs: 1,
        jitterRatio: 0,
        shouldRetry: () => false,
        requestFn: async ({ signal }) => {
          attempts += 1;
          await new Promise((resolve, reject) => {
            signal.addEventListener("abort", () => reject(new DOMException("Timed out", "AbortError")));
            setTimeout(resolve, 30);
          });
          return { ok: true, status: 200, headers: new Headers() };
        }
      }),
      /Timed out/
    );

    assert.equal(attempts, 2);
  });
});
