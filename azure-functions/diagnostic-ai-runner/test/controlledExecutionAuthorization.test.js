"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const {
  CONTROLLED_EXECUTION_TYPE,
  CONTROLLED_SYNTHETIC_EXECUTION_ENABLED_ENV,
  authorizeControlledSyntheticExecution
} = require("../src/controlled/executionAuthorization");

function withEnv(vars, fn) {
  const originals = {};
  for (const [k, v] of Object.entries(vars)) {
    originals[k] = process.env[k];
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(originals)) {
      if (v === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = v;
      }
    }
  }
}

describe("controlled synthetic execution authorization", () => {
  test("rejects when the controlled synthetic gate is closed", () => {
    withEnv({ [CONTROLLED_SYNTHETIC_EXECUTION_ENABLED_ENV]: "false" }, () => {
      const result = authorizeControlledSyntheticExecution({
        fixtureType: "txt",
        runnerKeyVerified: true
      });
      assert.equal(result.permitted, false);
      assert.equal(result.code, "CONTROLLED_SYNTHETIC_NOT_AUTHORIZED");
    });
  });

  test("rejects when fixture type is missing", () => {
    withEnv({ [CONTROLLED_SYNTHETIC_EXECUTION_ENABLED_ENV]: "true" }, () => {
      const result = authorizeControlledSyntheticExecution({
        fixtureType: "",
        runnerKeyVerified: true
      });
      assert.equal(result.permitted, false);
      assert.equal(result.code, "INVALID_SYNTHETIC_FIXTURE");
    });
  });

  test("permits a controlled synthetic run only when the explicit gate is open", () => {
    withEnv({ [CONTROLLED_SYNTHETIC_EXECUTION_ENABLED_ENV]: "true" }, () => {
      const result = authorizeControlledSyntheticExecution({
        fixtureType: "docx",
        runnerKeyVerified: true
      });
      assert.equal(result.permitted, true);
      assert.equal(result.executionType, CONTROLLED_EXECUTION_TYPE);
    });
  });
});
