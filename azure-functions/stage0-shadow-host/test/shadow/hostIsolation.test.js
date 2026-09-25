"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

test("shadow host indexes its timer without registering Publishing effect routes", () => {
  const result = spawnSync(process.execPath, ["-e", "require('./src/index.js')"], {
    cwd: path.resolve(__dirname, "../.."),
    env: { ...process.env, JM1_SHADOW_HOST: "true", JM1_SHADOW_ENABLED: "false" },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  const output = result.stdout + result.stderr;
  assert.match(output, /stage0-shadow-poll/);
  assert.match(output, /stage0-shadow-authority-probe/);
  assert.match(output, /stage0-shadow-commissioning-canary/);
  assert.doesNotMatch(output, /run-stage0-diagnostic|run-agreement|signnow-webhook/i);
});

test("all three isolated Azure Functions timers register callable handlers", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../src/shadow/host.js"), "utf8");
  assert.equal((source.match(/app\.timer\(/g) || []).length, 3);
  assert.equal((source.match(/handler: async \(/g) || []).length, 3);
  assert.doesNotMatch(source, /\brun: async \(/);
});

test("runtime route projection requires exact control-plane identities", () => {
  const { routeFromEnvironment } = require("../../src/shadow/host");
  const env = {
    JM1_SHADOW_MODEL_REGISTER_ID: "AZURE:OAI-JM1-DIAGNOSTIC:JM1-PUB-DIAGNOSTIC-PRIMARY",
    JM1_SHADOW_RISK_REGISTER_ID: "JM1-AI-RISK-STAGE0-SHADOW-001",
    JM1_SHADOW_ROUTE_POLICY_VERSION: "STAGE0-SHADOW-C11-v1",
    JM1_SHADOW_ROUTE_EXPIRES_AT: "2099-01-01T00:00:00Z",
    JM1_SHADOW_ROUTE_STATUS: "CANARY_ONLY",
  };
  assert.equal(routeFromEnvironment(env).status, "CANARY_ONLY");
  assert.throws(() => routeFromEnvironment({ ...env, JM1_SHADOW_RISK_REGISTER_ID: "wrong" }),
    /SHADOW_ROUTE_AUTHORITY_MISSING/);
  assert.throws(() => routeFromEnvironment({ ...env, JM1_SHADOW_ROUTE_POLICY_VERSION: "wrong" }),
    /SHADOW_ROUTE_AUTHORITY_MISSING/);
});
