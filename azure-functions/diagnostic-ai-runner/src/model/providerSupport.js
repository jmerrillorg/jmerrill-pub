"use strict";

const DEFAULT_API_TIMEOUT_MS = 45000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_BASE_DELAY_MS = 750;
const DEFAULT_MIN_RETRY_DELAY_MS = 5000;
const DEFAULT_MAX_RETRY_DELAY_MS = 120000;
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
    minRetryDelayMs: normalizePositiveInt(
      process.env[`${prefix}_MIN_RETRY_DELAY_MS`] || process.env.JM1_AI_PROVIDER_MIN_RETRY_DELAY_MS,
      DEFAULT_MIN_RETRY_DELAY_MS
    ),
    maxRetryDelayMs: normalizePositiveInt(
      process.env[`${prefix}_MAX_RETRY_DELAY_MS`] || process.env.JM1_AI_PROVIDER_MAX_RETRY_DELAY_MS,
      DEFAULT_MAX_RETRY_DELAY_MS
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

const SAFE_RATE_LIMIT_HEADERS = Object.freeze([
  "retry-after",
  "retry-after-ms",
  "x-ratelimit-limit-requests",
  "x-ratelimit-limit-tokens",
  "x-ratelimit-remaining-requests",
  "x-ratelimit-remaining-tokens",
  "x-ratelimit-reset-requests",
  "x-ratelimit-reset-tokens",
  "x-request-id",
  "apim-request-id"
]);

function collectSafeRateLimitHeaders(headers) {
  if (!headers || typeof headers.get !== "function") {
    return {};
  }

  const safeHeaders = {};
  for (const name of SAFE_RATE_LIMIT_HEADERS) {
    const value = headers.get(name);
    if (typeof value === "string" && value.trim()) {
      safeHeaders[name] = value.trim().slice(0, 200);
    }
  }
  return safeHeaders;
}

function classifyRateLimit(headers, responseBody = null) {
  const safeHeaders = collectSafeRateLimitHeaders(headers);
  const text = [
    responseBody?.error?.code,
    responseBody?.error?.message,
    ...Object.entries(safeHeaders).map(([key, value]) => `${key}:${value}`)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/outputtokens|output.tokens|output token/.test(text)) return "OUTPUT_TOKENS";
  if (/uncachedinputtokens|uncached.input|inputtokens|input.tokens|input token/.test(text)) return "UNCACHED_INPUT_TOKENS";
  if (/requests|request/.test(text)) return "REQUESTS";
  if (/token/.test(text)) return "TOKENS";
  return "UNKNOWN";
}

function buildRateLimitMetadata(headers, responseBody = null) {
  const safeHeaders = collectSafeRateLimitHeaders(headers);
  const retryAfterMs = parseRetryAfterMs(headers);
  return {
    classification: classifyRateLimit(headers, responseBody),
    retryAfterMs,
    retryAfterSeconds: Number.isFinite(retryAfterMs) ? Math.ceil(retryAfterMs / 1000) : null,
    headers: safeHeaders
  };
}

function computeBackoffDelayMs({
  attempt,
  baseDelayMs,
  jitterRatio,
  retryAfterMs,
  minRetryDelayMs = DEFAULT_MIN_RETRY_DELAY_MS,
  maxRetryDelayMs = DEFAULT_MAX_RETRY_DELAY_MS
}) {
  const minDelay = normalizePositiveInt(minRetryDelayMs, DEFAULT_MIN_RETRY_DELAY_MS);
  const maxDelay = Math.max(minDelay, normalizePositiveInt(maxRetryDelayMs, DEFAULT_MAX_RETRY_DELAY_MS));
  if (Number.isFinite(retryAfterMs) && retryAfterMs >= 0) {
    return Math.min(maxDelay, Math.max(minDelay, retryAfterMs));
  }

  const exponential = baseDelayMs * Math.pow(2, Math.max(0, attempt - 1));
  const jitter = exponential * (Number.isFinite(jitterRatio) ? jitterRatio : DEFAULT_JITTER_RATIO) * Math.random();
  return Math.min(maxDelay, Math.max(minDelay, Math.round(exponential + jitter)));
}

async function fetchWithRetry({
  requestFn,
  timeoutMs,
  maxRetries,
  baseDelayMs,
  minRetryDelayMs,
  maxRetryDelayMs,
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
          minRetryDelayMs,
          maxRetryDelayMs,
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

      const delayMs = computeBackoffDelayMs({
        attempt,
        baseDelayMs,
        minRetryDelayMs,
        maxRetryDelayMs,
        jitterRatio,
        retryAfterMs: null
      });
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

  const attempts = [{ candidate: trimmed, classification: "direct-json" }];
  if (trimmed.startsWith("```")) {
    const repaired = trimmed
      .replace(/^```[a-zA-Z0-9_-]*\s*/u, "")
      .replace(/\s*```$/u, "")
      .trim();
    attempts.push({ candidate: repaired, classification: "fenced-repaired" });
  }
  const extracted = extractFirstJsonObject(trimmed);
  if (extracted && !attempts.some((attempt) => attempt.candidate === extracted)) {
    attempts.push({ candidate: extracted, classification: "extracted-json" });
  }

  for (let index = 0; index < attempts.length; index += 1) {
    const { candidate, classification } = attempts[index];
    try {
      const parsed = JSON.parse(candidate);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        return {
          ok: false,
          error: "MODEL_RESPONSE_JSON_NOT_OBJECT",
          repaired: index > 0,
          classification: classification === "direct-json" ? "non-object" : `${classification}-non-object`
        };
      }
      return {
        ok: true,
        value: parsed,
        repaired: index > 0,
        classification
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

function extractFirstJsonObject(text) {
  const start = text.indexOf("{");
  if (start < 0) return "";
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === "\"") {
        inString = false;
      }
      continue;
    }
    if (character === "\"") {
      inString = true;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1).trim();
    }
  }
  return "";
}

module.exports = {
  buildRateLimitMetadata,
  classifyRateLimit,
  collectSafeRateLimitHeaders,
  DEFAULT_API_TIMEOUT_MS,
  DEFAULT_BASE_DELAY_MS,
  DEFAULT_MAX_RETRY_DELAY_MS,
  DEFAULT_MAX_RETRIES,
  DEFAULT_MIN_RETRY_DELAY_MS,
  computeBackoffDelayMs,
  extractFirstJsonObject,
  fetchWithRetry,
  getProviderRuntimeOptions,
  parseRetryAfterMs,
  parseStructuredJsonObject
};
