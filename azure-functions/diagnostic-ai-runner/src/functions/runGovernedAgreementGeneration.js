"use strict";

/**
 * HTTP wiring for governed agreement generation.
 *
 * This route selects the approved agreement template from Publishing
 * Track, fills existing placeholders only, generates DOCX/PDF outputs,
 * stores them as governed publishing artifacts, and records safe
 * execution-log evidence when Dataverse configuration is available.
 *
 * It never sends an author communication, never requests signature,
 * never changes schema, never touches Business Central, and never
 * activates client-title automation.
 */

const path = require("node:path");
const fs = require("node:fs/promises");
const { app } = require("@azure/functions");
const { BlobServiceClient } = require("@azure/storage-blob");
const { DefaultAzureCredential } = require("@azure/identity");
const { generateGovernedAgreement } = require("../agreement/governedAgreementPipelineRunner");
const { DEFAULT_BLOB_CONTAINER } = require("../agreement/agreementTemplateSource");

const STORAGE_ACCOUNT = "stjm1diagrunner";
const GENERATED_AGREEMENT_PREFIX = "governed-publishing-artifacts/agreements/";

function safeTrim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function verifyRunnerKey(request) {
  const expected = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
  const actual = request.headers.get("x-jm1-diagnostic-runner-key");
  return Boolean(expected && actual && actual === expected);
}

function unauthorized() {
  return { status: 401, jsonBody: { status: "error", code: "UNAUTHORIZED" } };
}

function repoRoot() {
  return path.resolve(__dirname, "../../../..");
}

function safeBlobSegment(value) {
  return safeTrim(value).replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "agreement";
}

function getBlobContainerClient() {
  const credential = new DefaultAzureCredential();
  const blobServiceClient = new BlobServiceClient(`https://${STORAGE_ACCOUNT}.blob.core.windows.net`, credential);
  return blobServiceClient.getContainerClient(DEFAULT_BLOB_CONTAINER);
}

async function readGovernedTemplate(template) {
  return fs.readFile(path.join(repoRoot(), template.governedPath));
}

async function outputExists(containerClient, blobName) {
  return containerClient.getBlockBlobClient(blobName).exists();
}

async function uploadImmutableOutput(containerClient, titleId, correlationId, name, buffer) {
  const blobName = [
    GENERATED_AGREEMENT_PREFIX.replace(/\/$/, ""),
    safeBlobSegment(titleId),
    safeBlobSegment(correlationId),
    safeBlobSegment(name)
  ].join("/");
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  if (await blockBlobClient.exists()) {
    throw Object.assign(new Error(`Generated agreement already exists: ${blobName}`), { safeCode: "GENERATED_AGREEMENT_ALREADY_EXISTS" });
  }
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: {
      blobContentType: name.endsWith(".pdf")
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    },
    metadata: {
      immutableAfterExecution: "true",
      authorFacingOutputSent: "false",
      clientTitleAutomation: "FROZEN"
    }
  });
  return blobName;
}

app.http("run-governed-agreement-generation", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "run-governed-agreement-generation",
  handler: async (request, context) => {
    if (!verifyRunnerKey(request)) {
      context.warn("Governed agreement generation rejected: invalid or missing runner key.");
      return unauthorized();
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { status: "error", code: "INVALID_JSON" } };
    }

    const titleId = safeTrim(body.titleId);
    const correlationId = safeTrim(body.correlationId);
    const containerClient = getBlobContainerClient();
    const result = await generateGovernedAgreement(body, {
      readTemplate: readGovernedTemplate,
      outputExists: (name) => outputExists(containerClient, [
        GENERATED_AGREEMENT_PREFIX.replace(/\/$/, ""),
        safeBlobSegment(titleId),
        safeBlobSegment(correlationId),
        safeBlobSegment(name)
      ].join("/")),
      writeOutput: (name, buffer) => uploadImmutableOutput(containerClient, titleId, correlationId, name, buffer)
    });

    context.info(`Governed agreement generation attempted; titleId=${titleId}; ok=${result.ok}; code=${result.code || result.reason}`);

    const status = result.ok ? 200 : (result.reason === "GATE_CLOSED" ? 503 : 422);
    return { status, jsonBody: result };
  }
});

module.exports = {};
