"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const {
  buildRateLimitMetadata,
  collectSafeRateLimitHeaders,
  extractFirstJsonObject,
  parseStructuredJsonObject,
  parseRetryAfterMs
} = require("../src/model/providerSupport");

describe("provider support", () => {
  test("parses direct JSON object response", () => {
    const result = parseStructuredJsonObject("{\"ok\":true}");
    assert.equal(result.ok, true);
    assert.equal(result.value.ok, true);
    assert.equal(result.classification, "direct-json");
  });

  test("repairs fenced JSON once", () => {
    const result = parseStructuredJsonObject("```json\n{\"ok\":true}\n```");
    assert.equal(result.ok, true);
    assert.equal(result.value.ok, true);
    assert.equal(result.classification, "fenced-repaired");
  });

  test("extracts the first balanced JSON object from wrapped model text", () => {
    const content = "Here is the result:\n{\"editedManuscript\":\"text with } brace in string\",\"ok\":true}\nDone.";
    const extracted = extractFirstJsonObject(content);
    assert.equal(extracted, "{\"editedManuscript\":\"text with } brace in string\",\"ok\":true}");
    const result = parseStructuredJsonObject(content);
    assert.equal(result.ok, true);
    assert.equal(result.value.editedManuscript, "text with } brace in string");
    assert.equal(result.classification, "extracted-json");
  });

  test("classifies malformed fenced JSON", () => {
    const result = parseStructuredJsonObject("```json\nnot-json\n```");
    assert.equal(result.ok, false);
    assert.equal(result.error, "MODEL_RESPONSE_FENCED_JSON_INVALID");
  });

  test("parses Retry-After seconds header", () => {
    const headers = new Headers({ "retry-after": "3" });
    const ms = parseRetryAfterMs(headers);
    assert.equal(ms, 3000);
  });

  test("collects only safe rate-limit headers", () => {
    const headers = new Headers({
      "retry-after": "60",
      "x-ratelimit-remaining-tokens": "0",
      "apim-request-id": "request-123",
      "authorization": "Bearer secret"
    });

    const result = collectSafeRateLimitHeaders(headers);
    assert.deepEqual(result, {
      "retry-after": "60",
      "x-ratelimit-remaining-tokens": "0",
      "apim-request-id": "request-123"
    });
    assert.equal("authorization" in result, false);
  });

  test("builds retry-after metadata for workflow scheduling evidence", () => {
    const headers = new Headers({ "retry-after": "90" });
    const result = buildRateLimitMetadata(headers);
    assert.equal(result.retryAfterMs, 90000);
    assert.equal(result.retryAfterSeconds, 90);
    assert.equal(result.headers["retry-after"], "90");
  });
});
