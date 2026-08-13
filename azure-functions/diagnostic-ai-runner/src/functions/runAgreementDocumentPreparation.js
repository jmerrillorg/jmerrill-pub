"use strict";

/**
 * HTTP wiring for governed pre-contract agreement document preparation.
 *
 * This route fills the canonical agreement stack and writes generated
 * artifacts to generated-agreements/{diagnosticId}/. It does not send
 * agreements, create payment links, update Opportunities, post to Business
 * Central, or start production.
 */

const { app } = require("@azure/functions");
const { BlobServiceClient } = require("@azure/storage-blob");
const { DefaultAzureCredential } = require("@azure/identity");
const { prepareAgreementDocumentPackage } = require("../agreement/agreementPreparationRunner");
const { DEFAULT_BLOB_CONTAINER } = require("../agreement/agreementTemplateSource");

const STORAGE_ACCOUNT = "stjm1diagrunner";

function verifyRunnerKey(request) {
  const expected = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
  const actual = request.headers.get("x-jm1-diagnostic-runner-key");
  return Boolean(expected && actual && actual === expected);
}

function unauthorized() {
  return { status: 401, jsonBody: { status: "error", code: "UNAUTHORIZED" } };
}

function getBlobContainerClient() {
  const credential = new DefaultAzureCredential();
  const blobServiceClient = new BlobServiceClient(`https://${STORAGE_ACCOUNT}.blob.core.windows.net`, credential);
  return blobServiceClient.getContainerClient(DEFAULT_BLOB_CONTAINER);
}

async function downloadBlob(containerClient, blobName) {
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const exists = await blockBlobClient.exists();
  if (!exists) return null;
  return blockBlobClient.downloadToBuffer();
}

async function uploadBlob(containerClient, blobName, buffer) {
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: {
      blobContentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    }
  });
  return `${DEFAULT_BLOB_CONTAINER}/${blobName}`;
}

app.http("run-agreement-document-preparation", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "run-agreement-document-preparation",
  handler: async (request, context) => {
    if (!verifyRunnerKey(request)) {
      context.warn("Agreement document preparation rejected: invalid or missing runner key.");
      return unauthorized();
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { status: "error", code: "INVALID_JSON" } };
    }

    const containerClient = getBlobContainerClient();
    const result = await prepareAgreementDocumentPackage(body || {}, {
      blobClientDeps: {
        downloadBlob: (blobName) => downloadBlob(containerClient, blobName),
        uploadBlob: (blobName, buffer) => uploadBlob(containerClient, blobName, buffer)
      }
    });

    context.info(`Agreement document preparation attempted; diagnosticId=${body?.diagnosticId || "unknown"}; ok=${result.ok}; code=${result.code || result.reason}`);
    return { status: result.ok ? 200 : 422, jsonBody: result };
  }
});

module.exports = {};
