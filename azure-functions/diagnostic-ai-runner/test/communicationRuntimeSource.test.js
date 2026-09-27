"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
test("runtime presentation remains compiled from the single canonical source", () => {
  const directory = path.resolve(__dirname, "../src/generated/communications");
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, "source-manifest.json")));
  const hash = value => createHash("sha256").update(value).digest("hex");
  for (const [name, expected] of Object.entries(manifest.files)) {
    assert.equal(hash(fs.readFileSync(path.resolve(__dirname, "../../../lib/server", `${name}.ts`))), expected.sourceSha256);
    assert.equal(hash(fs.readFileSync(path.join(directory, `${name}.js`))), expected.runtimeSha256);
  }
});
