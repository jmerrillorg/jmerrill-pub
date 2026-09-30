"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");
const { AGENT_ID, validateAuthorityBundle } = require("../src/editorial/editorialAgentContract");
const { createFoundryEditorialAgentRuntime } = require("../src/editorial/foundryEditorialAgentRuntime");

function authorityFor(buffer) {
  const authority = {
    agentId: AGENT_ID, titleId: "title", stageId: "stage", stageCode: "DEVELOPMENTAL_EDITING",
    sourceArtifactId: "artifact", sourceSha256: crypto.createHash("sha256").update(buffer).digest("hex")
  };
  for (const name of ["stageCanon", "styleGuide", "authorPreferences", "voiceProfile", "titleRulings", "priorAuthorDecisions"]) {
    const content = `Governed ${name}`;
    authority[name] = { id: name, version: "1", content, sha256: crypto.createHash("sha256").update(content).digest("hex") };
  }
  return authority;
}

test("dedicated Foundry endpoint receives exact authority and returns a validated plan without tools", async () => {
  const sourceBuffer = Buffer.from("docx fixture");
  const authority = authorityFor(sourceBuffer);
  const authoritySnapshotSha256 = validateAuthorityBundle(authority).snapshotSha256;
  let called = false;
  const runtime = createFoundryEditorialAgentRuntime({
    projectEndpoint: "https://ais-jm1-foundry.services.ai.azure.com/api/projects/jm1-editorial-foundry",
    agentVersion: "1",
    credential: { getToken: async (scope) => { assert.equal(scope, "https://ai.azure.com/.default"); return { token: "test-token" }; } },
    extractText: async () => ({ value: "Manuscript text." }),
    fetch: async (url, request) => {
      called = true;
      assert.match(url, /\/agents\/jm1-agent-pub-editorial-01\/endpoint\/protocols\/openai\/responses\?api-version=v1$/);
      const body = JSON.parse(request.body);
      assert.equal(body.store, false);
      assert.equal(body.tools, undefined);
      const input = JSON.parse(body.input);
      assert.equal(input.binding.sourceArtifactId, "artifact");
      assert.equal(input.authority.voiceProfile.content, "Governed voiceProfile");
      return { ok: true, json: async () => ({ status: "completed", output: [{
        type: "message", role: "assistant", agent_reference: { name: AGENT_ID, version: "1" },
        content: [{ type: "output_text", text: JSON.stringify({
        agentId: AGENT_ID, titleId: "title", stageId: "stage", stageCode: "DEVELOPMENTAL_EDITING",
        sourceArtifactId: "artifact", sourceSha256: authority.sourceSha256, authoritySnapshotSha256,
        edits: [{ editId: "e1", editClass: "NO_CHANGE", rationale: "Preserve source.", authorityClass: "SYSTEM_AUTHORIZED_EDIT", decisionRequired: false, authorVisibility: "INTERNAL" }]
      }) }]
      }] }) };
    }
  });
  const plan = await runtime.prepareEditPlan({ sourceBuffer, authority, authoritySnapshotRecordId: "snapshot", authoritySnapshotSha256 });
  assert.equal(called, true);
  assert.equal(plan.edits.length, 1);
});

test("source mismatch denies the request before acquiring identity", async () => {
  let called = false;
  const sourceBuffer = Buffer.from("source");
  const authority = authorityFor(sourceBuffer);
  const runtime = createFoundryEditorialAgentRuntime({
    projectEndpoint: "https://ais-jm1-foundry.services.ai.azure.com/api/projects/jm1-editorial-foundry",
    agentVersion: "1",
    credential: { getToken: async () => { called = true; return { token: "test-token" }; } },
    extractText: async () => ({ value: "Manuscript text." })
  });
  await assert.rejects(runtime.prepareEditPlan({
    sourceBuffer: Buffer.from("changed"), authority,
    authoritySnapshotRecordId: "snapshot", authoritySnapshotSha256: validateAuthorityBundle(authority).snapshotSha256
  }), /EDITORIAL_AGENT_SOURCE_CHECKSUM_MISMATCH/);
  assert.equal(called, false);
});

test("unbound or effect-bearing agent output is rejected", async () => {
  const sourceBuffer = Buffer.from("source");
  const authority = authorityFor(sourceBuffer);
  const authoritySnapshotSha256 = validateAuthorityBundle(authority).snapshotSha256;
  const runtime = createFoundryEditorialAgentRuntime({
    projectEndpoint: "https://ais-jm1-foundry.services.ai.azure.com/api/projects/jm1-editorial-foundry",
    agentVersion: "1",
    credential: { getToken: async () => ({ token: "test-token" }) },
    extractText: async () => ({ value: "Manuscript text." }),
    fetch: async () => ({ ok: true, json: async () => ({ status: "completed", output: [{
      type: "message", role: "assistant", agent_reference: { name: AGENT_ID, version: "1" },
      content: [{ type: "output_text", text: JSON.stringify({
      agentId: AGENT_ID, titleId: "wrong-title", stageId: "stage", stageCode: "DEVELOPMENTAL_EDITING",
      sourceArtifactId: "artifact", sourceSha256: authority.sourceSha256, authoritySnapshotSha256,
      send: true, edits: []
    }) }]
    }] }) })
  });
  await assert.rejects(runtime.prepareEditPlan({
    sourceBuffer, authority, authoritySnapshotRecordId: "snapshot", authoritySnapshotSha256
  }), /EDITORIAL_AGENT_OUTPUT_BINDING_MISMATCH/);
});

test("an unexpected agent version is denied before parsing its plan", async () => {
  const sourceBuffer = Buffer.from("source");
  const authority = authorityFor(sourceBuffer);
  const runtime = createFoundryEditorialAgentRuntime({
    projectEndpoint: "https://ais-jm1-foundry.services.ai.azure.com/api/projects/jm1-editorial-foundry",
    agentVersion: "1",
    credential: { getToken: async () => ({ token: "test-token" }) },
    extractText: async () => ({ value: "Manuscript text." }),
    fetch: async () => ({ ok: true, json: async () => ({ status: "completed", output: [{
      type: "message", role: "assistant", agent_reference: { name: AGENT_ID, version: "2" },
      content: [{ type: "output_text", text: "not JSON" }]
    }] }) })
  });
  await assert.rejects(runtime.prepareEditPlan({
    sourceBuffer, authority, authoritySnapshotRecordId: "snapshot",
    authoritySnapshotSha256: validateAuthorityBundle(authority).snapshotSha256
  }), /EDITORIAL_AGENT_RESPONSE_IDENTITY_MISMATCH/);
});
