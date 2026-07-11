"use strict";

const DEFAULT_API_TIMEOUT_MS = 45000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_BASE_DELAY_MS = 750;
const DEFAULT_JITTER_RATIO = 0.2;

function normalizePositiveInt(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : fallback;
}

function getProviderRuntimeOptions(prefix) {
  return {
    timeoutMs: normalizePositiveInt(
      process.env[`${prefix}_TIMEOUT_MS`] || process.env.JM1_AI_PROVIDER_TIMEOUT_MS,
      DEFAULT_API_TIMEOUT_MS
    ),
    maxRetries: normalizePositiveInt(
      process.env[`${prefix}_MAX_RETRIES`] || process.env.JM1_AI_PROVIDER_MAX_RETRIES,
      DEFAULT_MAX_RETRIES
    ),
    baseDelayMs: normalizePositiveInt(
      process.env[`${prefix}_BASE_DELAY_MS`] || process.env.JM1_AI_PROVIDER_BASE_DELAY_MS,
      DEFAULT_BASE_DELAY_MS
    ),
    jitterRatio: Number(process.env[`${prefix}_JITTER_RATIO`] || process.env.JM1_AI_PROVIDER_JITTER_RATIO || DEFAULT_JITTER_RATIO)
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(headers) {
  if (!headers || typeof headers.get !== "function") {
    return null;
  }

  const retryAfter = headers.get("retry-after");
  if (!retryAfter) {
    return null;
  }

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000);
  }

  const retryDateMs = Date.parse(retryAfter);
  if (Number.isFinite(retryDateMs)) {
    return Math.max(0, retryDateMs - Date.now());
  }

  return null;
}

function computeBackoffDelayMs({ attempt, baseDelayMs, jitterRatio, retryAfterMs }) {
  if (Number.isFinite(retryAfterMs) && retryAfterMs >= 0) {
    return retryAfterMs;
  }

  const exponential = baseDelayMs * Math.pow(2, Math.max(0, attempt - 1));
  const jitter = exponential * (Number.isFinite(jitterRatio) ? jitterRatio : DEFAULT_JITTER_RATIO) * Math.random();
  return Math.round(exponential + jitter);
}

async function fetchWithRetry({
  requestFn,
  timeoutMs,
  maxRetries,
  baseDelayMs,
  jitterRatio,
  shouldRetry
}) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort("REQUEST_TIMEOUT"), timeoutMs);

    try {
      const response = await requestFn({ signal: controller.signal, attempt });
      clearTimeout(timeoutHandle);

      if (attempt <= maxRetries && shouldRetry(response)) {
        const delayMs = computeBackoffDelayMs({
          attempt,
          baseDelayMs,
          jitterRatio,
          retryAfterMs: parseRetryAfterMs(response.headers)
        });
        await sleep(delayMs);
        continue;
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutHandle);
      lastError = error;

      const timedOut = error?.name === "AbortError" || error === "REQUEST_TIMEOUT";
      if (attempt > maxRetries || !timedOut) {
        throw error;
      }

      const delayMs = computeBackoffDelayMs({ attempt, baseDelayMs, jitterRatio, retryAfterMs: null });
      await sleep(delayMs);
    }
  }

  throw lastError || new Error("REQUEST_RETRY_EXHAUSTED");
}

function parseStructuredJsonObject(content) {
  if (typeof content !== "string") {
    return {
      ok: false,
      error: "MODEL_RESPONSE_NOT_STRING",
      repaired: false,
      classification: "non-string"
    };
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: "MODEL_RESPONSE_EMPTY",
      repaired: false,
      classification: "empty"
    };
  }

  const attempts = [trimmed];
  if (trimmed.startsWith("```")) {
    const repaired = trimmed
      .replace(/^```[a-zA-Z0-9_-]*\s*/u, "")
      .replace(/\s*```$/u, "")
      .trim();
    attempts.push(repaired);
  }

  for (let index = 0; index < attempts.length; index += 1) {
    const candidate = attempts[index];
    try {
      const parsed = JSON.parse(candidate);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        return {
          ok: false,
          error: "MODEL_RESPONSE_JSON_NOT_OBJECT",
          repaired: index > 0,
          classification: index > 0 ? "fenced-non-object" : "non-object"
        };
      }
      return {
        ok: true,
        value: parsed,
        repaired: index > 0,
        classification: index > 0 ? "fenced-repaired" : "direct-json"
      };
    } catch {
      // try the bounded repair candidate once
    }
  }

  return {
    ok: false,
    error: attempts.length > 1 ? "MODEL_RESPONSE_FENCED_JSON_INVALID" : "MODEL_RESPONSE_NOT_JSON",
    repaired: false,
    classification: attempts.length > 1 ? "fenced-invalid" : "invalid-json"
  };
}

module.exports = {
  DEFAULT_API_TIMEOUT_MS,
  DEFAULT_BASE_DELAY_MS,
  DEFAULT_MAX_RETRIES,
  computeBackoffDelayMs,
  fetchWithRetry,
  getProviderRuntimeOptions,
  parseRetryAfterMs,
  parseStructuredJsonObject
};
