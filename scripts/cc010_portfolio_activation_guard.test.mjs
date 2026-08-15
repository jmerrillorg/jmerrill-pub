import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..");
const packageDir = path.join(
  repoRoot,
  "docs/operations/generated/CC010-PORTFOLIO-ACTIVATION-2026-08-14",
);

const read = (relativePath) =>
  readFileSync(path.join(packageDir, relativePath), "utf8");

test("CC-010 portfolio activation evidence package is complete and guarded", () => {
  assert.equal(existsSync(packageDir), true);

  const files = readdirSync(packageDir).filter((entry) => entry !== "checksums.sha256");
  assert.equal(files.length, 20);
  assert.equal(files.includes("00-executive-summary.md"), true);
  assert.equal(files.includes("19-final-portfolio-state.md"), true);

  const summary = read("00-executive-summary.md");
  assert.match(summary, /COMPLETE WITH GOVERNED HOLDS/);
  assert.match(summary, /Author communications \| 0/);
  assert.match(summary, /Manual stage progressions \| 0/);
  assert.match(summary, /first replay exposed and exercised real Developmental runtime work/i);
  assert.match(summary, /post-guard replay proved the narrowed selector/i);

  const resumeActions = read("06-system-resume-actions.csv");
  assert.match(resumeActions, /FIRST_REPLAY/);
  assert.match(resumeActions, /POST_GUARD_REPLAY/);
  assert.match(resumeActions, /SOURCE_ARTIFACT_MISSING/);

  const durability = read("17-runtime-durability.md");
  assert.match(durability, /fb9f4704c2573fcd718b388d560b5d0f870de2a1/);
  assert.match(durability, /Node\\\|22/);
  assert.match(durability, /RUNTIME_VERSION_DRIFT_OPEN/);

  const capacity = read("18-capacity-readiness.md");
  assert.match(capacity, /YES_WITH_IDENTIFIED_CAPACITY_GAPS/);
  assert.match(capacity, /live Copy\/Proof preferred OpenAI deployment is not proven/);
});

test("CC-010 runtime selectors retain live-title and author-gate protections", () => {
  const runtimeSource = readFileSync(
    path.join(
      repoRoot,
      "azure-functions/diagnostic-ai-runner/src/editorial/editorialExecutionRuntime.js",
    ),
    "utf8",
  );

  assert.match(runtimeSource, /function isLivePortfolioStage/);
  assert.match(runtimeSource, /function authorGateBlocksRuntime/);
  assert.match(runtimeSource, /AUTHOR_DECISION_APPROVE/);
  assert.match(runtimeSource, /GATE_STATUS_APPROVED/);
  assert.match(runtimeSource, /synthetic/i);
  assert.match(runtimeSource, /testament/i);
});
