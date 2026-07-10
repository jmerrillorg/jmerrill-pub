"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const modulePath = path.resolve(__dirname, "../src/observability/dependencyTelemetry.js");

function loadDependencyTelemetryWithStub(stub) {
  delete require.cache[modulePath];
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "applicationinsights") {
      return stub;
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  const loaded = require(modulePath);

  return {
    loaded,
    restore() {
      delete require.cache[modulePath];
      Module._load = originalLoad;
    }
  };
}

describe("dependency telemetry", () => {
  test("trackDependency waits for telemetry flush before resolving", async () => {
    let tracked = false;
    let flushed = false;

    const stub = {
      defaultClient: {
        trackDependency() {
          tracked = true;
        },
        flush(options) {
          setTimeout(() => {
            flushed = true;
            options.callback();
          }, 25);
        }
      }
    };

    const { loaded, restore } = loadDependencyTelemetryWithStub(stub);

    try {
      const startedAt = Date.now();
      await loaded.trackDependency(
        {},
        {
          name: "Dataverse Prompt Template Read",
          target: "https://jm1hq.crm.dynamics.com",
          dependencyTypeName: "Dataverse"
        },
        async () => ({ ok: true, status: 200 })
      );
      const elapsed = Date.now() - startedAt;

      assert.equal(tracked, true);
      assert.equal(flushed, true);
      assert.ok(elapsed >= 20);
    } finally {
      restore();
    }
  });
});
