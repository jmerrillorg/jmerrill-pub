"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const {
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
});
