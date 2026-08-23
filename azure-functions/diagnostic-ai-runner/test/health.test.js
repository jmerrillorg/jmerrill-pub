"use strict";

const { afterEach, describe, mock, test } = require("node:test");
const assert = require("node:assert/strict");
const functionsSdk = require("@azure/functions");

const healthModulePath = require.resolve("../src/functions/health");

describe("health endpoint module", () => {
  afterEach(() => {
    delete require.cache[healthModulePath];
    mock.restoreAll();
  });

  test("registers the read-only GET health contract", async () => {
    let registration;
    mock.method(functionsSdk.app, "http", (name, options) => {
      registration = { name, options };
    });

    const { healthHandler } = require(healthModulePath);

    assert.equal(registration.name, "health");
    assert.deepEqual(registration.options.methods, ["GET"]);
    assert.equal(registration.options.authLevel, "anonymous");
    assert.equal(registration.options.route, "health");
    assert.equal(typeof registration.options.handler, "function");
    assert.equal(registration.options.handler, healthHandler);

    const response = await healthHandler();
    assert.equal(response.status, 200);
    assert.deepEqual(Object.keys(response.jsonBody).sort(), [
      "node",
      "productionRelease",
      "release",
      "status"
    ]);
    assert.equal(response.jsonBody.status, "ready");
    assert.equal(response.jsonBody.release, null);
    assert.equal(response.jsonBody.productionRelease, null);
    assert.equal(response.jsonBody.node, process.version);
    assert.equal(healthHandler.length, 0);
  });
});
