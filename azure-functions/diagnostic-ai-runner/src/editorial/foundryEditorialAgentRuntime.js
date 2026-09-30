"use strict";

const crypto = require("node:crypto");
const { DefaultAzureCredential } = require("@azure/identity");
const mammoth = require("mammoth");
const { AGENT_ID, validateAuthorityBundle, validateAgentEditPlan } = require("./editorialAgentContract");

const TOKEN_SCOPE = "https://ai.azure.com/.default";
const API_VERSION = "v1";

function fail(code) {
  throw Object.assign(new Error(code), { safeCode: code });
}

function responseText(body) {
  if (typeof body?.output_text === "string") return body.output_text;
  const parts = (body?.output || []).flatMap((item) => item?.content || []);
  return parts.filter((part) => part?.type === "output_text" && typeof part.text === "string")
    .map((part) => part.text).join("\n");
}

function parseEditPlan(body) {
  const raw = responseText(body).trim();
  if (!raw) fail("EDITORIAL_AGENT_RESPONSE_EMPTY");
  try {
    return JSON.parse(raw);
  } catch {
    fail("EDITORIAL_AGENT_RESPONSE_NOT_JSON");
  }
}

function createFoundryEditorialAgentRuntime(options = {}) {
  const endpoint = options.projectEndpoint || process.env.JM1_EDITORIAL_FOUNDRY_PROJECT_ENDPOINT;
  const expectedVersion = options.agentVersion || process.env.JM1_EDITORIAL_FOUNDRY_AGENT_VERSION;
  if (!endpoint || !/^https:\/\/[a-z0-9.-]+\.services\.ai\.azure\.com\/api\/projects\/[a-z0-9-]+$/i.test(endpoint)) {
    fail("EDITORIAL_AGENT_PROJECT_ENDPOINT_INVALID");
  }
  if (!/^\d+$/.test(expectedVersion || "")) fail("EDITORIAL_AGENT_VERSION_REQUIRED");
  const credential = options.credential || new DefaultAzureCredential();
  const request = options.fetch || fetch;
  const extractText = options.extractText || ((buffer) => mammoth.extractRawText({ buffer }));
  const url = `${endpoint}/agents/${AGENT_ID}/endpoint/protocols/openai/responses?api-version=${API_VERSION}`;

  return {
    agentId: AGENT_ID,
    async prepareEditPlan(input) {
      const { snapshot, snapshotSha256 } = validateAuthorityBundle(input.authority);
      if (!Buffer.isBuffer(input.sourceBuffer) || !input.authoritySnapshotRecordId ||
          input.authoritySnapshotSha256 !== snapshotSha256) fail("EDITORIAL_AGENT_AUTHORITY_BINDING_INVALID");
      const sourceSha256 = crypto.createHash("sha256").update(input.sourceBuffer).digest("hex");
      if (sourceSha256 !== snapshot.sourceSha256) fail("EDITORIAL_AGENT_SOURCE_CHECKSUM_MISMATCH");
      const manuscript = (await extractText(input.sourceBuffer)).value;
      if (typeof manuscript !== "string" || !manuscript.trim()) fail("EDITORIAL_AGENT_SOURCE_TEXT_EMPTY");
      const token = await credential.getToken(TOKEN_SCOPE);
      if (!token?.token) fail("EDITORIAL_AGENT_IDENTITY_UNAVAILABLE");
      const response = await request(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          input: JSON.stringify({
            task: "Prepare a structured editorial edit plan only. Do not execute edits or effects. Return one JSON object.",
            binding: { ...snapshot, authoritySnapshotRecordId: input.authoritySnapshotRecordId, authoritySnapshotSha256: snapshotSha256 },
            authority: Object.fromEntries(
              Object.entries(snapshot.sources).map(([name, source]) => [name, { ...source, content: input.authority[name].content }])
            ),
            manuscript
          }),
          store: false
        })
      });
      if (!response.ok) fail(`EDITORIAL_AGENT_HTTP_${response.status}`);
      const body = await response.json();
      const messages = (body?.output || []).filter((item) => item?.type === "message" && item?.role === "assistant");
      if (body?.status !== "completed" || messages.length !== 1 ||
          messages[0]?.agent_reference?.name !== AGENT_ID ||
          String(messages[0]?.agent_reference?.version) !== expectedVersion) {
        fail("EDITORIAL_AGENT_RESPONSE_IDENTITY_MISMATCH");
      }
      const plan = parseEditPlan(body);
      validateAgentEditPlan(plan, input.authority);
      return plan;
    }
  };
}

module.exports = { createFoundryEditorialAgentRuntime, parseEditPlan };
