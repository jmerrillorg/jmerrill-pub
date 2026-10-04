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
