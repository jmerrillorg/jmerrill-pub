"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { runPublishingIntakeAutostartRecovery } = require("../src/functions/runPublishingIntakeAutostartRecovery");

function context() {
  const messages = { info: [], warn: [], error: [] };
  return {
    messages,
    info: (value) => messages.info.push(value),
    warn: (value) => messages.warn.push(value),
    error: (value) => messages.error.push(value)
  };
}

test("existing timer observes receipt recovery independently of title autostart", async () => {
  const prior = { receipt: process.env.JM1_INTAKE_RECEIPT_RECOVERY_ENABLED, title: process.env.JM1_PUBLISHING_INTAKE_AUTOSTART_RECOVERY_ENABLED };
  process.env.JM1_INTAKE_RECEIPT_RECOVERY_ENABLED = "true";
  process.env.JM1_PUBLISHING_INTAKE_AUTOSTART_RECOVERY_ENABLED = "false";
  try {
    const log = context(); let calls = 0;
    await runPublishingIntakeAutostartRecovery(null, log, {
      callReceiptRecovery: async () => { calls++; return { examined: 1, results: [{ phase: "COMPLETED" }], observedAt: "fixture", releaseSha: "fixture" }; },
      listReadyIntakes: async () => assert.fail("must not scan title processing"),
    });
    assert.equal(calls, 1);
    assert.match(log.messages.info[0], /receipt recovery observed/);
    await assert.rejects(runPublishingIntakeAutostartRecovery(null, log, {
      callReceiptRecovery: async () => ({ examined: 1, results: [{ error: "DEPENDENCY_UNAVAILABLE" }] }),
    }), /INTAKE_RECEIPT_MONITOR_FAILURE/);
  } finally {
    for (const [name, value] of [["JM1_INTAKE_RECEIPT_RECOVERY_ENABLED", prior.receipt], ["JM1_PUBLISHING_INTAKE_AUTOSTART_RECOVERY_ENABLED", prior.title]]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});

test("autostart recovery surfaces scan failures to the durable timer runtime", async () => {
  const prior = process.env.JM1_PUBLISHING_INTAKE_AUTOSTART_RECOVERY_ENABLED;
  process.env.JM1_PUBLISHING_INTAKE_AUTOSTART_RECOVERY_ENABLED = "true";
  try {
    const log = context();
    await assert.rejects(runPublishingIntakeAutostartRecovery(null, log, {
      listReadyIntakes: async () => { throw new Error("read unavailable"); }
    }), /read unavailable/);
    assert.equal(log.messages.error.length, 1);
  } finally {
    if (prior === undefined) delete process.env.JM1_PUBLISHING_INTAKE_AUTOSTART_RECOVERY_ENABLED;
    else process.env.JM1_PUBLISHING_INTAKE_AUTOSTART_RECOVERY_ENABLED = prior;
  }
});

test("autostart recovery continues independent intakes but fails the timer run if one dispatch fails", async () => {
  const prior = process.env.JM1_PUBLISHING_INTAKE_AUTOSTART_RECOVERY_ENABLED;
  process.env.JM1_PUBLISHING_INTAKE_AUTOSTART_RECOVERY_ENABLED = "true";
  try {
    const called = [];
    const log = context();
    await assert.rejects(runPublishingIntakeAutostartRecovery(null, log, {
      listReadyIntakes: async () => [
        { jm1_publishingintakeid: "intake-1" },
        { jm1_publishingintakeid: "intake-2" }
      ],
      hasDispatchSuccessLog: async () => false,
      callAutostart: async (intake) => {
        called.push(intake.jm1_publishingintakeid);
        return { ok: intake.jm1_publishingintakeid === "intake-2", status: 200, code: "test" };
      }
    }), /PUBLISHING_INTAKE_AUTOSTART_RECOVERY_INCOMPLETE/);
    assert.deepEqual(called, ["intake-1", "intake-2"]);
    assert.match(log.messages.info.at(-1), /dispatched=1; skipped=0; failed=1/);
  } finally {
    if (prior === undefined) delete process.env.JM1_PUBLISHING_INTAKE_AUTOSTART_RECOVERY_ENABLED;
    else process.env.JM1_PUBLISHING_INTAKE_AUTOSTART_RECOVERY_ENABLED = prior;
  }
});
