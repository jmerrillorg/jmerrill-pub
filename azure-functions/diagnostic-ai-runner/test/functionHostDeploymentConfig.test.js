"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "..");

test("host.json declares the Azure Functions extension bundle required by queue triggers", () => {
  const host = JSON.parse(fs.readFileSync(path.join(projectRoot, "host.json"), "utf8"));

  assert.deepEqual(host.extensionBundle, {
    id: "Microsoft.Azure.Functions.ExtensionBundle",
    version: "[4.*, 5.0.0)"
  });
});

test("package.json declares the storage queue dependency exactly once", () => {
  const packageJsonText = fs.readFileSync(path.join(projectRoot, "package.json"), "utf8");
  const queueDependencyOccurrences = packageJsonText.match(/"@azure\/storage-queue"/g) || [];
  const packageJson = JSON.parse(packageJsonText);

  assert.equal(queueDependencyOccurrences.length, 1);
  assert.equal(packageJson.dependencies["@azure/storage-queue"], "^12.31.0");
});
