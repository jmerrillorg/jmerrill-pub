"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");
const { OWNER_BY_TYPE } = require("../src/lifecycle/publishingWaitResumeAdapter");

for (const type of ["AUTHOR_REVIEW_RESPONSE", "PROVIDER_READBACK"]) {
  test(`${type}: failure, crash after owner effect, recovery and replay across separate processes`, () => {
    const directory = fs.mkdtempSync(path.join(process.platform === "darwin" ? "/private/tmp" : os.tmpdir(), "publishing-wait-restart-"));
    const run = (phase, expectedExit = 0) => {
      const result = spawnSync(process.execPath, [path.join(__dirname, "helpers/publishingWaitRestart.cjs"), directory, phase, type],
        { encoding: "utf8", timeout: 60000 });
      assert.equal(result.status, expectedExit, result.stderr || String(result.error || ""));
      return expectedExit === 0 ? JSON.parse(result.stdout) : null;
    };
    try {
      assert.equal(run("produce").result[0].status, "READY_PROJECTED");
      const failed = run("fail");
      assert.equal(failed.wait.attempts, 1);
      assert.equal(failed.wait.lastFailure.code, "FIXTURE_OWNER_UNAVAILABLE");
      assert.equal(run("backoff").result.status, "BACKOFF");
      run("crash", 23);
      const interrupted = JSON.parse(fs.readFileSync(path.join(directory, "blob.json"))).body;
      assert.equal(interrupted.status, "READY_TO_RESUME");
      assert.equal(interrupted.resumeResult, undefined);
      const recovered = run("recover");
      assert.equal(recovered.wait.status, "RESUMED");
      assert.equal(recovered.wait.attempts, 3);
      assert.equal(recovered.wait.resumeResult.owningRuntime, OWNER_BY_TYPE[type]);
      assert.equal(recovered.wait.resumeResult.evidenceId, "persisted-owner-evidence");
      assert.notEqual(recovered.wait.resumeResult.claimId, interrupted.resume.claimId);
      const replay = run("replay");
      assert.equal(replay.result.status, "IDEMPOTENT");
      assert.deepEqual(replay.wait.resumeResult, recovered.wait.resumeResult);
      assert.equal(JSON.parse(fs.readFileSync(path.join(directory, "owner.json"))).effectCount, 1);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
}
