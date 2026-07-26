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

  test("repairs prose-wrapped JSON by extracting the first object", () => {
    const result = parseStructuredJsonObject("Here is the structured response:\n{\"ok\":true,\"provider\":\"foundry\"}\nThanks.");
    assert.equal(result.ok, true);
    assert.equal(result.value.ok, true);
    assert.equal(result.value.provider, "foundry");
    assert.equal(result.classification, "embedded-repaired");
  });

  test("does not misclassify prose-wrapped non-object JSON as valid", () => {
    const result = parseStructuredJsonObject("Result:\n[1,2,3]");
    assert.equal(result.ok, false);
    assert.equal(result.error, "MODEL_RESPONSE_NOT_JSON");
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
