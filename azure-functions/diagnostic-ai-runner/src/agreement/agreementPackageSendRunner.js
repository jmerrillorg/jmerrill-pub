"use strict";

/**
 * Governed agreement-package send.
 *
 * Sends the prepared, governed agreement package (Publishing Agreement,
 * Publishing Package Addendum, Audiobook Addendum, Schedule A) to the
 * author for review and signature, using the approved publishing
 * identity. This is the FIRST author-facing send in the agreement
 * lifecycle — it never includes a payment link, never implies
 * production has started, and never exposes editorial scoring,
 * manuscript text, or raw AI/model output (this module has no access
 * to any of those).
 *
 * Safety boundaries:
 *   - Recipient is always confirmed from Dataverse (the Opportunity's
 *     linked Contact), never trusted from a caller-supplied value alone.
 *   - Sender, Reply-To, and Cc/internal-visibility are fixed constants
 *     matching the approved publishing identity — never caller-supplied.
 *   - Every attachment is validated as a structurally real .docx before
 *     being sent.
 *   - The actual ACS send happens via the acs-email-relay Function App's
 *     dedicated, relay-key-gated endpoint — this module never holds ACS
 *     credentials directly.
 *   - Writes one safe execution-log evidence record, and updates the
 *     Opportunity's existing jm1pub_contractstatus (Sent for Signature)
 *     and jm1_m6agreementpreparationstatus fields — no new Dataverse
 *     schema is created.
 *
 * Requires JM1_AGREEMENT_PACKAGE_SEND_ENABLED="true", checked fresh on
 * every call.
 */

const { readOpportunityAuthorContact } = require("../dataverse/opportunityContactReader");
const { isValidDocxBuffer, DOCX_MIME_TYPE } = require("./agreementDocxValidator");
const { buildAgreementSendEmailContent } = require("./agreementSendEmailBuilder");
const { patchDataverseRecord, getDataverseToken } = require("../dataverse/authorDraftPersistenceClient");
const { DIAGNOSTIC_ID_PATTERN, INTAKE_REFERENCE_PATTERN } = require("../queue/diagnosticQueueSelector");
const { AGENT_NAME, BAND_LEVEL, EXECUTION_STATUS, SOURCE_ENTITY } = require("../dataverse/metadataWriter");
const { classifyDataverseWriteError } = require("../author/milestone6OpportunityWriter");

const GATE_NAME = "JM1_AGREEMENT_PACKAGE_SEND_ENABLED";
const OPPORTUNITY_ENTITY_SET = "opportunities";
const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const EVENT_TYPE = "AGREEMENT_PACKAGE_SEND_PERFORMED";
const AGENT_MODEL_NAME = "agreement-package-send-runner";

// Approved publishing identity — fixed, never caller-supplied.
const SENDER_DISPLAY_NAME = "J Merrill Publishing";
const INTERNAL_VISIBILITY_MAILBOX = "publishing@jmerrill.one";

// Confirmed against live Dataverse picklist metadata for
// opportunity.jm1pub_contractstatus, 2026-06-22.
const CONTRACT_STATUS = Object.freeze({
  NOT_GENERATED: 196650000,
  GENERATED: 196650001,
  SENT_FOR_SIGNATURE: 196650002,
  SIGNED: 196650003,
  DECLINED: 196650004
});

const REQUIRED_DOCUMENT_NAMES = Object.freeze([
  "JMP_Publishing_Agreement_FILLED",
  "JMP_Publishing_Package_Addendum_FILLED",
  "JMP_Audiobook_Addendum_FILLED",
  "JMP_Schedule_A_Payment_Schedule"
]);

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isGateOpen() {
  return normalizeString(process.env[GATE_NAME]).toLowerCase() === "true";
}

function blocked(reason, extra = {}) {
  return { ok: false, code: "AGREEMENT_PACKAGE_SEND_BLOCKED", reason, ...extra };
}

async function postExecutionLogRecord(apiBase, token, payload) {
  const url = `${apiBase.replace(/\/$/, "")}/${EXECUTION_LOG_ENTITY_SET}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      "Prefer": "return=representation"
    },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = body?.error?.code || response.status;
    const msg = body?.error?.message || `HTTP ${response.status}`;
    throw Object.assign(new Error(`Dataverse POST failed (${EXECUTION_LOG_ENTITY_SET}): ${msg}`), {
      safeCode: "DATAVERSE_WRITE_FAILED",
      httpStatus: response.status,
      dvCode: code
    });
  }
  return { id: typeof body.jm1_executionlogid === "string" ? body.jm1_executionlogid : null };
}

function buildAgreementSendExecutionLogPayload({ diagnosticId, intakeReferenceCode, opportunityId, authorEmail, emailContent, sendResult, completedAt }) {
  const actionDescription = [
    `Agreement package send performed for intake ${intakeReferenceCode}, Opportunity ${opportunityId}.`,
    `Recipient confirmed from Dataverse Contact: ${authorEmail}.`,
    `Sender: publishing@email.jmerrill.one. Reply-To/Cc: ${INTERNAL_VISIBILITY_MAILBOX}.`,
    `Subject: ${emailContent.subject}.`,
    "Attachments: Publishing Agreement, Publishing Package Addendum, Audiobook Addendum, Schedule A (4 documents).",
    "No payment link included. No editorial scoring, manuscript text, or raw AI/model output included.",
    sendResult ? `Send accepted by relay; providerMessageId=${sendResult.providerMessageId || "unknown"}.` : null,
    "No Stripe/payment/production/distribution/launch/royalty/marketing action occurred."
  ].filter(Boolean).join(" ");

  return {
    jm1_name: `AGREEMENT-PACKAGE-SEND-${diagnosticId}`,
    jm1_actiondescription: actionDescription.slice(0, 1000),
    jm1_actiontype: EVENT_TYPE,
    jm1_agentname: AGENT_NAME,
    jm1_agentmodel: AGENT_MODEL_NAME,
    jm1_bandlevel: BAND_LEVEL.BAND_1,
    jm1_executionstatus: EXECUTION_STATUS.SUCCESS,
    jm1_startedon: completedAt,
    jm1_completedon: completedAt,
    jm1_sourceentity: SOURCE_ENTITY,
    jm1_sourcerecordid: diagnosticId
  };
}

/**
 * Sends the prepared agreement package to the author.
 *
 * @param {{
 *   diagnosticId: string, intakeReferenceCode: string, opportunityId: string,
 *   title: string, packageLabel: string,
 *   paymentSchedule: { installments: number, perInstallmentUsd: number, totalUsd: number },
 *   expectedAuthorEmail?: string
 * }} input
 * @param {{
 *   getToken?: Function,
 *   readGeneratedDocument: (name: string) => Promise<Buffer>,
 *   sendEmail: (message: object) => Promise<{ providerMessageId: string|null }>,
 *   readAuthorContact?: Function
 * }} deps
 * @returns {Promise<object>}
 */
async function sendAgreementPackage(input = {}, deps = {}) {
  if (!isPlainObject(input)) return blocked("INVALID_INPUT");
  if (typeof deps.readGeneratedDocument !== "function" || typeof deps.sendEmail !== "function") {
    return blocked("DEPS_MISSING_REQUIRED_FUNCTIONS");
  }
  const resolveToken = deps.getToken || getDataverseToken;
  const resolveContact = deps.readAuthorContact || readOpportunityAuthorContact;

  const diagnosticId = normalizeString(input.diagnosticId);
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode);
  const opportunityId = normalizeString(input.opportunityId);
  const title = normalizeString(input.title);
  const packageLabel = normalizeString(input.packageLabel);
  const expectedAuthorEmail = normalizeString(input.expectedAuthorEmail).toLowerCase();

  if (!diagnosticId || !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) return blocked("DIAGNOSTIC_ID_INVALID");
  if (!intakeReferenceCode || !INTAKE_REFERENCE_PATTERN.test(intakeReferenceCode)) return blocked("INTAKE_REFERENCE_CODE_INVALID");
  if (!opportunityId) return blocked("OPPORTUNITY_ID_MISSING");
  if (!title) return blocked("TITLE_REQUIRED");
  if (!isPlainObject(input.paymentSchedule)) return blocked("PAYMENT_SCHEDULE_REQUIRED");

  if (!isGateOpen()) return blocked("GATE_CLOSED", { gate: GATE_NAME });

  // Step 1: confirm recipient from source of truth — never trust a
  // caller-supplied email alone for an actual send.
  const contact = await resolveContact(opportunityId, { getToken: resolveToken });
  if (!contact.ok) {
    return blocked("RECIPIENT_CONFIRMATION_FAILED", { detail: contact.code });
  }
  if (expectedAuthorEmail && contact.authorEmail !== expectedAuthorEmail) {
    return blocked("RECIPIENT_MISMATCH", { expected: null, confirmed: null });
  }

  // Step 2: confirm the generated package exists and every document is
  // a structurally valid .docx.
  const attachments = [];
  for (const baseName of REQUIRED_DOCUMENT_NAMES) {
    const fileName = `${baseName}_${diagnosticId}.docx`;
    let buffer;
    try {
      buffer = await deps.readGeneratedDocument(fileName);
    } catch (err) {
      return blocked("GENERATED_DOCUMENT_READ_FAILED", { file: fileName, detail: err.safeCode || null });
    }
    const validation = await isValidDocxBuffer(buffer);
    if (!validation.valid) {
      return blocked("GENERATED_DOCUMENT_INVALID", { file: fileName, detail: validation.reason });
    }
    attachments.push({
      name: fileName,
      contentType: DOCX_MIME_TYPE,
      contentInBase64: buffer.toString("base64")
    });
  }
  if (attachments.length !== 4) {
    return blocked("ATTACHMENT_COUNT_INVALID", { count: attachments.length });
  }

  // Step 3: build the email content — never a payment link, never
  // editorial scoring, never manuscript/AI output.
  const emailContent = buildAgreementSendEmailContent({
    authorFirstName: (contact.authorName || "").split(" ")[0] || contact.authorName,
    title,
    packageLabel,
    paymentSchedule: input.paymentSchedule
  });

  // Step 4: send via the ACS relay's dedicated, relay-key-gated endpoint.
  let sendResult;
  try {
    sendResult = await deps.sendEmail({
      senderDisplayName: SENDER_DISPLAY_NAME,
      to: contact.authorEmail,
      toDisplayName: contact.authorName || contact.authorEmail,
      cc: INTERNAL_VISIBILITY_MAILBOX,
      replyTo: INTERNAL_VISIBILITY_MAILBOX,
      subject: emailContent.subject,
      bodyText: emailContent.bodyText,
      attachments,
      diagnosticId,
      intakeReferenceCode
    });
  } catch (err) {
    return blocked("SEND_FAILED", { detail: err.safeCode || null });
  }

  // Step 5: update existing Opportunity status fields — no new schema.
  const apiBase = process.env.DATAVERSE_WEB_API_BASE_URL;
  const resourceUrl = process.env.DATAVERSE_RESOURCE_URL;
  let opportunityUpdate = { updated: false, error: null };
  if (apiBase && resourceUrl) {
    try {
      const token = await resolveToken(resourceUrl);
      await patchDataverseRecord(apiBase, token, OPPORTUNITY_ENTITY_SET, opportunityId, {
        jm1pub_contractstatus: CONTRACT_STATUS.SENT_FOR_SIGNATURE,
        jm1_m6agreementpreparationstatus: "AGREEMENT_SENT_FOR_SIGNATURE"
      });
      opportunityUpdate = { updated: true, error: null };
    } catch (err) {
      opportunityUpdate = { updated: false, error: err.safeCode || "DATAVERSE_WRITE_FAILED" };
    }
  } else {
    opportunityUpdate = { updated: false, error: "DATAVERSE_CONFIG_MISSING" };
  }

  // Step 6: safe execution-log evidence.
  const completedAt = new Date().toISOString();
  let executionLog;
  if (!apiBase || !resourceUrl) {
    executionLog = { created: false, id: null, error: "DATAVERSE_CONFIG_MISSING", diagnostics: null };
  } else {
    try {
      const token = await resolveToken(resourceUrl);
      const payload = buildAgreementSendExecutionLogPayload({
        diagnosticId, intakeReferenceCode, opportunityId, authorEmail: contact.authorEmail, emailContent, sendResult, completedAt
      });
      const result = await postExecutionLogRecord(apiBase, token, payload);
      executionLog = { created: true, id: result.id, error: null, diagnostics: null };
    } catch (err) {
      executionLog = { created: false, id: null, error: err.safeCode || "DATAVERSE_WRITE_FAILED", diagnostics: classifyDataverseWriteError(err) };
    }
  }

  return {
    ok: true,
    code: "AGREEMENT_PACKAGE_SEND_COMPLETE",
    diagnosticId,
    intakeReferenceCode,
    opportunityId,
    recipient: contact.authorEmail,
    sender: "publishing@email.jmerrill.one",
    replyTo: INTERNAL_VISIBILITY_MAILBOX,
    cc: INTERNAL_VISIBILITY_MAILBOX,
    subject: emailContent.subject,
    attachmentNames: attachments.map((a) => a.name),
    providerMessageId: sendResult.providerMessageId || null,
    opportunityUpdate,
    executionLog,
    gateUsed: GATE_NAME,
    liveActions: {
      sentAuthorFacingOutput: true,
      includedPaymentLink: false,
      createsPaymentLink: false,
      startsProduction: false,
      activatesFlowD: false,
      submitsDistribution: false,
      updatedOpportunity: opportunityUpdate.updated
    }
  };
}

module.exports = {
  sendAgreementPackage,
  buildAgreementSendExecutionLogPayload,
  REQUIRED_DOCUMENT_NAMES,
  CONTRACT_STATUS,
  GATE_NAME,
  EVENT_TYPE,
  INTERNAL_VISIBILITY_MAILBOX,
  SENDER_DISPLAY_NAME
};
