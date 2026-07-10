"use strict";

const CONTROLLED_EXECUTION_TYPE = "CONTROLLED_SYNTHETIC_DIAGNOSTIC";
const CONTROLLED_PROMPT_FALLBACK_ALLOWED_ENV = "JM1_ALLOW_CONTROLLED_PROMPT_FALLBACK";
const CONTROLLED_PROMPT_INACTIVE_ALLOWED_ENV = "JM1_ALLOW_INACTIVE_CONTROLLED_PROMPT";
const CONTROLLED_SYNTHETIC_EXECUTION_ENABLED_ENV = "JM1_CONTROLLED_SYNTHETIC_DIAGNOSTIC_ENABLED";

function isEnvTrue(name) {
  return process.env[name] === "true";
}

function authorizeControlledSyntheticExecution({ fixtureType, runnerKeyVerified }) {
  if (!runnerKeyVerified) {
    return { permitted: false, code: "UNAUTHORIZED" };
  }

  if (!isEnvTrue(CONTROLLED_SYNTHETIC_EXECUTION_ENABLED_ENV)) {
    return {
      permitted: false,
      code: "CONTROLLED_SYNTHETIC_NOT_AUTHORIZED",
      reason: "CONTROLLED_SYNTHETIC_DIAGNOSTIC_DISABLED"
    };
  }

  if (!fixtureType) {
    return {
      permitted: false,
      code: "INVALID_SYNTHETIC_FIXTURE",
      reason: "CONTROLLED_SYNTHETIC_FIXTURE_REQUIRED"
    };
  }

  return {
    permitted: true,
    executionType: CONTROLLED_EXECUTION_TYPE
  };
}

module.exports = {
  CONTROLLED_EXECUTION_TYPE,
  CONTROLLED_PROMPT_FALLBACK_ALLOWED_ENV,
  CONTROLLED_PROMPT_INACTIVE_ALLOWED_ENV,
  CONTROLLED_SYNTHETIC_EXECUTION_ENABLED_ENV,
  authorizeControlledSyntheticExecution
};
