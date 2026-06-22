"use strict";

/**
 * HTTP wiring for the agreement-package send.
 *
 * Thin wrapper only. All recipient confirmation, document validation,
 * email content, and Dataverse update logic lives in
 * agreementPackageSendRunner.js (independently tested).
 *
 * Resolves the generated-document reader against Blob Storage
 * (generated-agreements/{diagnosticId}/, never the template path) and
 * the email sender against the ACS relay's dedicated, relay-key-gated
 * send-agreement-package endpoint.
 */

const { app } = require("@azure/functions");
const { BlobServiceClient } = require("@azure/storage-blob");
const { DefaultAzureCredential } = require("@azure/identity");
const { sendAgreementPackage } = require("../agreement/agreementPackageSendRunner");
const { createGeneratedOutputBlobReader, DEFAULT_BLOB_CONTAINER } = require("../agreement/agreementTemplateSource");

const AUTHORIZED_DIAGNOSTIC_ID = "64e387e0-7e6a-f111-a826-00224820105b";
const AUTHORIZED_INTAKE_REFERENCE_CODE = "JMP-INT-202606-UFYG60";
const AUTHORIZED_OPPORTUNITY_ID = "2653fca9-eacd-4c44-b3ed-1764dd5d35aa";
const STORAGE_ACCOUNT = "stjm1diagrunner";

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

function recordNotAuthorized() {
  return { status: 403, jsonBody: { status: "error", code: "AGREEMENT_PACKAGE_SEND_RECORD_NOT_AUTHORIZED" } };
}

function confirmationRequired() {
  return { status: 400, jsonBody: { status: "error", code: "CONFIRM_AGREEMENT_PACKAGE_SEND_FLAG_REQUIRED" } };
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

async function sendEmailViaRelay(message) {
  const relayUrl = process.env.JM1_AUTHOR_RESPONSE_SEND_RELAY_URL;
  const relayKey = process.env.JM1_AUTHOR_RESPONSE_SEND_RELAY_KEY;
  if (!relayUrl || !relayKey) {
    throw Object.assign(new Error("Agreement package send relay configuration is missing."), { safeCode: "RELAY_CONFIG_MISSING" });
  }

  const response = await fetch(`${relayUrl.replace(/\/$/, "")}/api/send-agreement-package`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-jm1-relay-key": relayKey },
    body: JSON.stringify({
      diagnosticId: message.diagnosticId,
      intakeReferenceCode: message.intakeReferenceCode,
      to: message.to,
      toDisplayName: message.toDisplayName,
      cc: message.cc,
      replyTo: message.replyTo,
      subject: message.subject,
      bodyText: message.bodyText,
      attachments: message.attachments
    })
  });

  const body = await response.json().catch(() => ({}));
  if (response.status !== 202 || !body.accepted) {
    throw Object.assign(new Error("Agreement package send relay rejected the request."), { safeCode: body.code || `RELAY_HTTP_${response.status}` });
  }

  return { providerMessageId: body.providerMessageId || null };
}

app.http("run-agreement-package-send", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "run-agreement-package-send",
  handler: async (request, context) => {
    if (!verifyRunnerKey(request)) {
      context.warn("Agreement package send rejected: invalid or missing runner key.");
      return unauthorized();
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { status: "error", code: "INVALID_JSON" } };
    }

    const diagnosticId = safeTrim(body.diagnosticId);
    const intakeReferenceCode = safeTrim(body.intakeReferenceCode);
    const opportunityId = safeTrim(body.opportunityId);
    const title = safeTrim(body.title);
    const packageLabel = safeTrim(body.packageLabel);
    const paymentSchedule = body.paymentSchedule;
    const expectedAuthorEmail = safeTrim(body.expectedAuthorEmail);
    const confirmSend = body.confirmSend === true;

    if (!confirmSend) {
      return confirmationRequired();
    }

    const matches =
      diagnosticId.toLowerCase() === AUTHORIZED_DIAGNOSTIC_ID.toLowerCase() &&
      intakeReferenceCode.toUpperCase() === AUTHORIZED_INTAKE_REFERENCE_CODE.toUpperCase() &&
      opportunityId.toLowerCase() === AUTHORIZED_OPPORTUNITY_ID.toLowerCase();

    if (!matches) {
      context.warn("Agreement package send rejected: record does not match the one authorized controlled record.");
      return recordNotAuthorized();
    }

    const containerClient = getBlobContainerClient();
    const readGeneratedDocument = createGeneratedOutputBlobReader({
      diagnosticId,
      downloadBlob: (blobName) => downloadBlob(containerClient, blobName)
    });

    const result = await sendAgreementPackage(
      { diagnosticId, intakeReferenceCode, opportunityId, title, packageLabel, paymentSchedule, expectedAuthorEmail },
      { readGeneratedDocument, sendEmail: sendEmailViaRelay }
    );

    context.info(`Agreement package send attempted; diagnosticId=${diagnosticId}; ok=${result.ok}; code=${result.code || result.reason}`);

    const status = result.ok ? 200 : (result.reason === "GATE_CLOSED" ? 503 : 422);
    return { status, jsonBody: result };
  }
});

module.exports = {};
