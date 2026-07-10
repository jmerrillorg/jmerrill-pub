"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const {
  CONTROLLED_EXECUTION_TYPE,
  CONTROLLED_PROMPT_FALLBACK_ALLOWED_ENV,
  CONTROLLED_PROMPT_INACTIVE_ALLOWED_ENV
} = require("../src/controlled/executionAuthorization");
const {
  buildFallbackPromptResolution,
  choosePromptTemplateRow,
  resolveGovernedPromptTemplate
} = require("../src/dataverse/promptTemplateReader");

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

async function withEnvAsync(vars, fn) {
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
    return await fn();
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

describe("prompt template reader", () => {
  test("active Dataverse row outranks inactive rows", () => {
    const chosen = choosePromptTemplateRow([
      { jm1pub_promptversion: "V1", jm1pub_active: false, statecode: 0 },
      { jm1pub_promptversion: "V2", jm1pub_active: true, statecode: 0 }
    ]);
    assert.equal(chosen.jm1pub_promptversion, "V2");
  });

  test("fallback remains closed unless explicitly allowed", () => {
    withEnv({ [CONTROLLED_PROMPT_FALLBACK_ALLOWED_ENV]: "false" }, () => {
      const result = buildFallbackPromptResolution(CONTROLLED_EXECUTION_TYPE);
      assert.equal(result.ok, false);
      assert.equal(result.error, "PROMPT_TEMPLATE_NOT_GOVERNED");
    });
  });

  test("controlled fallback can be opened explicitly for emergency governed use", () => {
    withEnv({ [CONTROLLED_PROMPT_FALLBACK_ALLOWED_ENV]: "true" }, () => {
      const result = buildFallbackPromptResolution(CONTROLLED_EXECUTION_TYPE);
      assert.equal(result.ok, true);
      assert.equal(result.source, "env-fallback");
      assert.equal(result.effectiveState, "controlled-fallback");
    });
  });

  test("controlled execution can resolve an inactive prompt only when explicitly allowed", async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        value: [{
          jm1pub_aiprompttemplateid: "11111111-1111-1111-1111-111111111111",
          jm1pub_promptkey: "jm1-prompt-pub-stage0-diagnostic",
          jm1pub_promptname: "Stage 0 Editorial Diagnostic",
          jm1pub_promptversion: "PUB-STAGE0-DIAGNOSTIC-V1",
          jm1pub_modeldeploymentalias: "jm1-pub-diagnostic-primary",
          jm1pub_active: false,
          statecode: 0
        }]
      })
    });

    try {
      await withEnvAsync({
        DATAVERSE_WEB_API_BASE_URL: "https://example.crm.dynamics.com/api/data/v9.2/",
        DATAVERSE_RESOURCE_URL: "https://example.crm.dynamics.com",
        [CONTROLLED_PROMPT_INACTIVE_ALLOWED_ENV]: "true"
      }, async () => {
        const identity = require("@azure/identity");
        const original = identity.DefaultAzureCredential.prototype.getToken;
        identity.DefaultAzureCredential.prototype.getToken = async () => ({ token: "token" });
        try {
          const result = await resolveGovernedPromptTemplate({
            executionType: CONTROLLED_EXECUTION_TYPE
          });
          assert.equal(result.ok, true);
          assert.equal(result.effectiveState, "controlled-inactive-allowed");
        } finally {
          identity.DefaultAzureCredential.prototype.getToken = original;
        }
      });
    } finally {
      global.fetch = originalFetch;
    }
  });

  test("Dataverse read failure stays visible when controlled fallback is closed", async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({
      ok: false,
      status: 403,
      json: async () => ({
        error: { code: "0x80040220" }
      })
    });

    try {
      await withEnvAsync({
        DATAVERSE_WEB_API_BASE_URL: "https://example.crm.dynamics.com/api/data/v9.2/",
        DATAVERSE_RESOURCE_URL: "https://example.crm.dynamics.com",
        [CONTROLLED_PROMPT_FALLBACK_ALLOWED_ENV]: "false"
      }, async () => {
        const identity = require("@azure/identity");
        const original = identity.DefaultAzureCredential.prototype.getToken;
        identity.DefaultAzureCredential.prototype.getToken = async () => ({ token: "token" });
        try {
          const result = await resolveGovernedPromptTemplate({
            executionType: CONTROLLED_EXECUTION_TYPE
          });
          assert.equal(result.ok, false);
          assert.equal(result.source, "dataverse");
          assert.equal(result.effectiveState, "read-failed");
          assert.equal(result.error, "0x80040220");
        } finally {
          identity.DefaultAzureCredential.prototype.getToken = original;
        }
      });
    } finally {
      global.fetch = originalFetch;
    }
  });

  test("missing prompt row does not imply fallback when fallback is closed", async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ value: [] })
    });

    try {
      await withEnvAsync({
        DATAVERSE_WEB_API_BASE_URL: "https://example.crm.dynamics.com/api/data/v9.2/",
        DATAVERSE_RESOURCE_URL: "https://example.crm.dynamics.com",
        [CONTROLLED_PROMPT_FALLBACK_ALLOWED_ENV]: "false"
      }, async () => {
        const identity = require("@azure/identity");
        const original = identity.DefaultAzureCredential.prototype.getToken;
        identity.DefaultAzureCredential.prototype.getToken = async () => ({ token: "token" });
        try {
          const result = await resolveGovernedPromptTemplate({
            executionType: CONTROLLED_EXECUTION_TYPE
          });
          assert.equal(result.ok, false);
          assert.equal(result.source, "dataverse");
          assert.equal(result.effectiveState, "missing");
          assert.equal(result.error, "PROMPT_TEMPLATE_NOT_FOUND");
        } finally {
          identity.DefaultAzureCredential.prototype.getToken = original;
        }
      });
    } finally {
      global.fetch = originalFetch;
    }
  });
});
