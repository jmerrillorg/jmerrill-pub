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
  assert.doesNotMatch(output, /run-stage0-diagnostic|run-agreement|signnow-webhook/i);
});

test("both Azure Functions timers register callable handlers", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../src/shadow/host.js"), "utf8");
  assert.equal((source.match(/app\.timer\(/g) || []).length, 2);
  assert.equal((source.match(/handler: async \(/g) || []).length, 2);
  assert.doesNotMatch(source, /\brun: async \(/);
});
