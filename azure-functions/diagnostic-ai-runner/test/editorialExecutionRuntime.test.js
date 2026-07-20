"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  EXECUTOR_POLICIES,
  buildExactBlocker,
  findSourceArtifact,
  normalizeStageCode,
  runEditorialExecutionRuntime
} = require("../src/editorial/editorialExecutionRuntime");

test("editorial execution runtime defines reusable executors for all required editorial stages", () => {
  assert.deepEqual(Object.keys(EXECUTOR_POLICIES).sort(), [
    "COPYEDITING",
    "DEVELOPMENTAL_EDITING",
    "EDITORIAL_INTERNAL_QA",
    "EDITORIAL_REVIEW",
    "LINE_EDITING",
    "PROOFREADING"
  ]);
  assert.equal(EXECUTOR_POLICIES.DEVELOPMENTAL_EDITING.outputRoles.includes("developmentalMemo"), true);
  assert.equal(EXECUTOR_POLICIES.PROOFREADING.outputRoles.includes("proofreadManuscript"), true);
});

test("stage names normalize to canonical executor codes", () => {
  assert.equal(normalizeStageCode({ jm1pub_name: "Developmental Editing - Before You Were Born" }), "DEVELOPMENTAL_EDITING");
  assert.equal(normalizeStageCode({ jm1pub_name: "Editorial Review - The Long Watch" }), "EDITORIAL_REVIEW");
  assert.equal(normalizeStageCode({ jm1pub_name: "Proofreading - The Intentional Leader" }), "PROOFREADING");
});

test("missing source artifact becomes an exact stage-specific blocker", () => {
  assert.equal(buildExactBlocker("EDITORIAL_REVIEW", null), "EDITORIAL_REVIEW_BLOCKED — SOURCE_ARTIFACT_MISSING");
  assert.equal(buildExactBlocker("DEVELOPMENTAL_EDITING", null), "DEVELOPMENTAL_EDITING_BLOCKED — SOURCE_ARTIFACT_MISSING");
});

test("runtime claims active tasks and records exact blockers instead of generic runtime holds", async () => {
  const logs = [];
  const patches = [];
  const client = {
    async list(entitySet, query) {
      if (entitySet === "jm1_executionlogs") return [];
      if (entitySet === "jm1pub_editorialartifacts") return [];
      throw new Error(`Unexpected list ${entitySet} ${JSON.stringify(query)}`);
    },
    async create(entitySet, payload) {
      assert.equal(entitySet, "jm1_executionlogs");
      logs.push(payload);
      return `log-${logs.length}`;
    },
    async patch(entitySet, id, payload) {
      patches.push({ entitySet, id, payload });
    }
  };
  const result = await runEditorialExecutionRuntime(
    { correlationId: "test-correlation", maxTasks: 1 },
    {
      client,
      stages: [
        {
          jm1pub_editorialstageid: "stage-1",
          jm1pub_name: "Developmental Editing - Test",
          jm1pub_stagetype: 100000001,
          jm1pub_stagestatus: 100000001,
          _jm1pub_titleid_value: "title-1"
        }
      ]
    }
  );

  assert.equal(result.ok, true);
  assert.equal(result.results[0].status, "EXCEPTION");
  assert.equal(result.results[0].exactBlocker, "DEVELOPMENTAL_EDITING_BLOCKED — SOURCE_ARTIFACT_MISSING");
  assert.equal(logs.some((log) => log.jm1_actiontype === "ACTIVE_EDITORIAL_TASK_CLAIMED"), true);
  assert.equal(logs.some((log) => log.jm1_actiontype === "ACTIVE_EDITORIAL_OUTPUT_BLOCKED"), true);
  assert.equal(patches[0].payload.jm1pub_internaloperationalsummary.includes("SOURCE_ARTIFACT_MISSING"), true);
});

test("source selection ignores generated runtime output artifacts", async () => {
  const client = {
    async list(entitySet) {
      assert.equal(entitySet, "jm1pub_editorialartifacts");
      return [
        {
          jm1pub_editorialartifactid: "qa-output",
          jm1pub_editorialartifactname: "Editorial Review QA Evidence - The Long Watch",
          jm1pub_filename: "2026-07-20-The-Long-Watch-Editorial-Review-QA-Evidence.md",
          jm1pub_repositoryitemid: "output-item",
          jm1pub_iscurrentapproved: false
        },
        {
          jm1pub_editorialartifactid: "source-manuscript",
          jm1pub_editorialartifactname: "Governed Source Manuscript - The Long Watch",
          jm1pub_filename: "The Long Watch.docx",
          jm1pub_repositoryitemid: "source-item",
          jm1pub_iscurrentapproved: true
        }
      ];
    }
  };
  const selected = await findSourceArtifact(client, {
    jm1pub_editorialstageid: "stage-1",
    _jm1pub_titleid_value: "title-1"
  });
  assert.equal(selected.jm1pub_editorialartifactid, "source-manuscript");
});
