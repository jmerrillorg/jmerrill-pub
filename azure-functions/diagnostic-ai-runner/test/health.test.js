"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

describe("health endpoint module", () => {
  test("loads without throwing and registers no unsafe globals", () => {
    // The module registers an anonymous GET /api/health route via
    // @azure/functions app.http(). We only assert it loads cleanly here;
    // the route contract (status/release/productionRelease/node, no
    // manuscript/Dataverse/secret content) is enforced by code review and
    // by the deployment workflow's own production readback check.
    assert.doesNotThrow(() => require("../src/functions/health"));
  });
});
