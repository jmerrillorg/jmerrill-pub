"use strict";

// Compatibility shim — provider abstraction moved to src/model/.
// New code should import from ../model/modelCaller.
const { callModel } = require("../model/modelCaller");
const { checkConfig: checkModelConfig, REQUIRED_VARS: REQUIRED_ENV_VARS } = require("../model/providers/azureOpenAiProvider");

module.exports = { callModel, checkModelConfig, REQUIRED_ENV_VARS };
