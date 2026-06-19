"use strict";

/**
 * Safe Dataverse execution-log builder for author-facing response sends.
 */

const {
  AUTHOR_RESPONSE_SEND_STATUS
} = require("./authorResponseSendApprovalModel");
const {
  INTERNAL_VISIBILITY_MAILBOX
} = require("./authorResponseDraftBuilder");
const { AUTHOR_DRAFT_UNMAPPED_UNSAFE_FIELDS } = require("./authorDraftFieldMap");
const { DIAGNOSTIC_ID_PATTERN, INTAKE_REFERENCE_PATTERN } = require("../queue/diagnosticQueueSelector");
const {
  AGENT_NAME,
  BAND_LEVEL,
  EXECUTION_STATUS,
  SOURCE_ENTITY
} = require("../dataverse/metadataWriter");

const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const EVENT_TYPE = "AUTHOR_RESPONSE_SENT";

const SAFE_SEND_LOG_FIELDS = [
  "sendApproval",
  "deliveryResult",
  "persistedAt",
  "providerName",
  "providerMessageId"
];

const FORBIDDEN_SEND_LOG_FIELDS = [
  ...AUTHOR_DRAFT_UNMAPPED_UNSAFE_FIELDS.filter((field) => ![
    "deliveryStatus",
    "providerMessageId"
  ].includes(field)),
  "manuscriptText",
  "promptBody",
  "rawModelOutput",
  "rawModelResponse",
  "headers",
  "authorization",
  "token",
  "apiKey",
  "opportunityReady",
  "flowDReady",
  "productionReady",
  "autoSendReady"
];

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function hasForbiddenFieldDeep(value) {
  if (!isPlainObject(value) && !Array.isArray(value)) return false;
  if (Array.isArray(value)) return value.some((item) => hasForbiddenFieldDeep(item));
  for (const [key, nestedValue] of Object.entries(value)) {
    if (FORBIDDEN_SEND_LOG_FIELDS.includes(key)) return true;
    if (hasForbiddenFieldDeep(nestedValue)) return true;
  }
  return false;
}

function hasOnlySafeTopLevelFields(input) {
  return Object.keys(input).every((key) => SAFE_SEND_LOG_FIELDS.includes(key));
}

function safeFailure(reason, input = null) {
  const approval = input?.sendApproval || input;
  return {
    ok: false,
    code: "AUTHOR_RESPONSE_SEND_LOG_FAILED",
    reason,
    diagnosticId: normalizeString(approval?.diagnosticId) || null,
    intakeReferenceCode: normalizeString(approval?.intakeReferenceCode) || null
  };
}

function validateAuthorResponseSendLogInput(input = {}) {
  if (!isPlainObject(input)) return { ok: false, reason: "MISSING_AUTHOR_SEND_LOG_PAYLOAD" };
  if (!hasOnlySafeTopLevelFields(input) || hasForbiddenFieldDeep(input)) return { ok: false, reason: "UNSAFE_FIELD_PRESENT" };
  if (!isPlainObject(input.sendApproval)) return { ok: false, reason: "MISSING_AUTHOR_SEND_APPROVAL" };
  if (!isPlainObject(input.deliveryResult)) return { ok: false, reason: "MISSING_DELIVERY_RESULT" };

  const approval = input.sendApproval;
  if (!normalizeString(approval.diagnosticId) || !DIAGNOSTIC_ID_PATTERN.test(normalizeString(approval.diagnosticId))) return { ok: false, reason: "DIAGNOSTIC_ID_INVALID" };
  if (!normalizeString(approval.intakeReferenceCode) || !INTAKE_REFERENCE_PATTERN.test(normalizeString(approval.intakeReferenceCode))) return { ok: false, reason: "INTAKE_REFERENCE_CODE_INVALID" };
  if (approval.internalVisibilityMailbox !== INTERNAL_VISIBILITY_MAILBOX) return { ok: false, reason: "INTERNAL_VISIBILITY_MAILBOX_INVALID" };
  if (input.deliveryResult.deliveryStatus !== AUTHOR_RESPONSE_SEND_STATUS.SENT) return { ok: false, reason: "AUTHOR_RESPONSE_NOT_SENT" };
  if (input.deliveryResult.internalVisibilityStatus !== AUTHOR_RESPONSE_SEND_STATUS.INTERNAL_VISIBILITY_SATISFIED) return { ok: false, reason: "INTERNAL_VISIBILITY_NOT_SATISFIED" };

  return { ok: true };
}

function buildAuthorResponseSendLogRecord(input = {}) {
  const validation = validateAuthorResponseSendLogInput(input);
  if (!validation.ok) return safeFailure(validation.reason, input);

  const approval = input.sendApproval;
  const delivery = input.deliveryResult;
  const persistedAt = normalizeString(input.persistedAt) || new Date().toISOString();
  const providerName = normalizeString(input.providerName || delivery.providerName);
  const providerMessageId = normalizeString(input.providerMessageId || delivery.providerMessageId);
  const correlationId = normalizeString(approval.metadata?.correlationId);
  const actionDescription = [
    `${EVENT_TYPE} for intake ${approval.intakeReferenceCode}.`,
    `Author email ${normalizeString(approval.authorEmail)}.`,
    `Internal visibility ${INTERNAL_VISIBILITY_MAILBOX}.`,
    `Subject ${normalizeString(approval.draftSubject)}.`,
    `Template ${normalizeString(approval.templateName)}.`,
    `Send status ${AUTHOR_RESPONSE_SEND_STATUS.SENT}.`,
    `Delivery status ${delivery.deliveryStatus}.`,
    `Provider ${providerName || "not provided"}.`,
    providerMessageId ? `Provider message ID ${providerMessageId}.` : "",
    `Approved by ${normalizeString(approval.approvedBy)}.`,
    `Approved on ${normalizeString(approval.approvedOn)}.`,
    "No Opportunity created. No Flow D activation. No production activation. No manuscript text, prompt body, raw model output, or secrets stored."
  ].join(" ");

  const executionLogPayload = {
    jm1_name: `AUTHOR-RESPONSE-SEND-${approval.diagnosticId}`,
    jm1_actiondescription: actionDescription.slice(0, 1000),
    jm1_actiontype: EVENT_TYPE,
    jm1_agentname: AGENT_NAME,
    jm1_agentmodel: "author-response-send",
    jm1_bandlevel: BAND_LEVEL.BAND_1,
    jm1_executionstatus: EXECUTION_STATUS.SUCCESS,
    jm1_startedon: persistedAt,
    jm1_completedon: persistedAt,
    jm1_sourceentity: SOURCE_ENTITY,
    jm1_sourcerecordid: approval.diagnosticId
  };

  return {
    ok: true,
    entitySet: EXECUTION_LOG_ENTITY_SET,
    persistenceRecord: {
      eventType: EVENT_TYPE,
      diagnosticId: approval.diagnosticId,
      intakeReferenceCode: approval.intakeReferenceCode,
      authorEmail: approval.authorEmail,
      internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX,
      subject: approval.draftSubject,
      templateName: approval.templateName,
      sendStatus: AUTHOR_RESPONSE_SEND_STATUS.SENT,
      deliveryStatus: delivery.deliveryStatus,
      internalVisibilityStatus: AUTHOR_RESPONSE_SEND_STATUS.INTERNAL_VISIBILITY_SATISFIED,
      dataverseSendLogStatus: AUTHOR_RESPONSE_SEND_STATUS.DATAVERSE_SEND_LOG_CREATED,
      providerName: providerName || null,
      providerMessageId: providerMessageId || null,
      persistedAt,
      approvedBy: approval.approvedBy,
      approvedOn: approval.approvedOn,
      correlationId: correlationId || null,
      executionLogPayload
    }
  };
}

async function persistAuthorResponseSendLog(input = {}, dataverseClient = null) {
  const recordResult = buildAuthorResponseSendLogRecord(input);
  if (!recordResult.ok) return recordResult;
  if (!dataverseClient || typeof dataverseClient.createRecord !== "function") {
    return safeFailure("DATAVERSE_CLIENT_MISSING", input);
  }
  try {
    const result = await dataverseClient.createRecord(recordResult.entitySet, recordResult.persistenceRecord.executionLogPayload);
    return {
      ok: true,
      entitySet: recordResult.entitySet,
      id: normalizeString(result?.id) || null,
      sendStatus: recordResult.persistenceRecord.sendStatus,
      deliveryStatus: recordResult.persistenceRecord.deliveryStatus,
      dataverseSendLogStatus: recordResult.persistenceRecord.dataverseSendLogStatus,
      diagnosticId: recordResult.persistenceRecord.diagnosticId,
      intakeReferenceCode: recordResult.persistenceRecord.intakeReferenceCode
    };
  } catch (_err) {
    return safeFailure("DATAVERSE_WRITE_FAILED", input);
  }
}

module.exports = {
  buildAuthorResponseSendLogRecord,
  persistAuthorResponseSendLog,
  validateAuthorResponseSendLogInput,
  EXECUTION_LOG_ENTITY_SET,
  EVENT_TYPE,
  SAFE_SEND_LOG_FIELDS,
  FORBIDDEN_SEND_LOG_FIELDS
};
