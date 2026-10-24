import assert from "node:assert/strict";
import test from "node:test";
import { shouldSkipProductionDeployment } from "../scripts/diagnostic-manual-producer-deploy-classification.mjs";

const manualProducerFiles = [
  "azure-functions/diagnostic-ai-runner/scripts/refresh-publishing-internal-mail-attestation.cjs",
  "azure-functions/diagnostic-ai-runner/src/lifecycle/publishInternalMailAttestation.js",
  "azure-functions/diagnostic-ai-runner/test/publishInternalMailAttestation.test.js",
  "docs/operations/publishing-internal-mail-attestation.md",
];

test("exact manual-producer source set skips Function deployment", () => {
  assert.equal(shouldSkipProductionDeployment(manualProducerFiles), true);
});

test("isolated deployment-classification guard files skip Function deployment", () => {
  assert.equal(shouldSkipProductionDeployment([
    ".github/scripts/diagnostic-manual-producer-deploy-classification.mjs",
    ".github/tests/diagnostic-manual-producer-deploy-classification.test.mjs",
  ]), true);
});

test("workflow-only changes require the normal protected deployment path", () => {
  assert.equal(shouldSkipProductionDeployment([
    ".github/workflows/diagnostic-ai-runner.yml",
  ]), false);
});

test("producer or classifier edits cannot hide a deployment workflow change", () => {
  assert.equal(shouldSkipProductionDeployment([
    ...manualProducerFiles,
    ".github/scripts/diagnostic-manual-producer-deploy-classification.mjs",
    ".github/tests/diagnostic-manual-producer-deploy-classification.test.mjs",
    ".github/workflows/diagnostic-ai-runner.yml",
  ]), false);
});

test("any runtime or unrelated file keeps the normal deployment path", () => {
  assert.equal(shouldSkipProductionDeployment([
    ...manualProducerFiles,
    "azure-functions/diagnostic-ai-runner/src/functions/runStage0Diagnostic.js",
  ]), false);
  assert.equal(shouldSkipProductionDeployment([...manualProducerFiles, "README.md"]), false);
});

test("unknown, empty, or non-array comparisons never skip deployment", () => {
  assert.equal(shouldSkipProductionDeployment(manualProducerFiles, false), false);
  assert.equal(shouldSkipProductionDeployment([]), false);
  assert.equal(shouldSkipProductionDeployment(null), false);
});
