"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const authorReviewConsumer = require("../src/orchestration/authorReviewResponseConsumer");
const approvalEventConsumer = require("../src/orchestration/approvalEventConsumer");

test("Dataverse credential selection ignores placeholder app settings", () => {
  for (const mod of [authorReviewConsumer, approvalEventConsumer]) {
    assert.equal(mod.normalizeConfiguredSecret("(set-before-use)"), "");
    assert.equal(mod.normalizeConfiguredSecret("set-before-use"), "");
    assert.equal(mod.normalizeConfiguredSecret("  (set-before-use)  "), "");
    assert.equal(mod.normalizeConfiguredSecret("00000000-0000-0000-0000-000000000000"), "00000000-0000-0000-0000-000000000000");
  }
});
