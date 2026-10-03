"use strict";

const { createHash } = require("node:crypto");
const { DefaultAzureCredential } = require("@azure/identity");

const CATEGORIES = ["Hate", "SelfHarm", "Sexual", "Violence"];
const TOKEN_SCOPE = "https://cognitiveservices.azure.com/.default";
const API_VERSION = "2024-09-01";

function endpointOrigin(input) {
  const url = new URL(input);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
      !url.hostname.endsWith(".cognitiveservices.azure.com")) {
    throw new Error("COVER_SAFETY_ENDPOINT_INVALID");
  }
  return url.origin;
}

function createCoverSafetyAssessment(config = {}, deps = {}) {
  const endpoint = endpointOrigin(config.endpoint || process.env.JM1_COVER_SAFETY_ENDPOINT || "");
  if (typeof deps.persistEvidence !== "function") throw new Error("COVER_SAFETY_EVIDENCE_STORE_NOT_CONFIGURED");
  const credential = deps.credential || new DefaultAzureCredential();
  const http = deps.fetch || fetch;

  return async function assessSafety(input) {
    if (!Buffer.isBuffer(input?.bytes) || input.bytes.length === 0 || input.bytes.length > 4 * 1024 * 1024 ||
        !/^[a-f0-9]{64}$/i.test(input.sha256 || "") || !input.titleId ||
        createHash("sha256").update(input.bytes).digest("hex") !== input.sha256) {
      throw new Error("COVER_SAFETY_INPUT_INVALID");
    }
    const token = await credential.getToken(TOKEN_SCOPE);
    if (!token?.token) throw new Error("COVER_SAFETY_IDENTITY_UNAVAILABLE");
    const response = await http(`${endpoint}/contentsafety/image:analyze?api-version=${API_VERSION}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ image: { content: input.bytes.toString("base64") },
        categories: CATEGORIES, outputType: "FourSeverityLevels" })
    });
    if (!response.ok) throw new Error("COVER_SAFETY_PROVIDER_FAILED");
    const body = await response.json();
    const scores = body?.categoriesAnalysis;
    if (!Array.isArray(scores) || scores.length !== CATEGORIES.length ||
        new Set(scores.map((row) => row.category)).size !== CATEGORIES.length ||
        scores.some((row) => !CATEGORIES.includes(row.category) || !Number.isInteger(row.severity) || row.severity < 0)) {
      throw new Error("COVER_SAFETY_RESULT_INVALID");
    }
    const passed = scores.every((row) => row.severity === 0);
    const evidence = {
      titleId: input.titleId, imageSha256: input.sha256, provider: "AZURE_AI_CONTENT_SAFETY",
      apiVersion: API_VERSION, categoriesAnalysis: scores, passed, assessedAt: new Date().toISOString()
    };
    const persisted = await deps.persistEvidence(evidence);
    if (!persisted?.evidenceId || persisted.imageSha256 !== input.sha256 || persisted.passed !== passed) {
      throw new Error("COVER_SAFETY_EVIDENCE_NOT_PERSISTED");
    }
    return { passed, evidenceId: persisted.evidenceId };
  };
}

module.exports = { createCoverSafetyAssessment };
