"use strict";

/**
 * Internal author-response draft persistence adapter for INT-PUB-005.
 *
 * This module persists only the safe draft payload prepared by
 * authorResponseDraftBuilder. It does not send email, call mail APIs, create
 * send events, create Opportunities, activate Flow D, run diagnostics, or open
 * execution gates.
 */

const {
  TEMPLATE_NAME,
  INTERNAL_VISIBILITY_MAILBOX,
  DRAFT_STATUS,
  DRAFT_APPROVAL_STATUS
} = require("./authorResponseDraftBuilder");
const {
  TABLE_LOGICAL_NAME,
  ENTITY_SET,
  ROW_IDENTITY,
  AUTHOR_DRAFT_FIELD_MAP,
  AUTHOR_DRAFT_UNMAPPED_UNSAFE_FIELDS
} = require("./authorDraftFieldMap");
const { DIAGNOSTIC_ID_PATTERN, INTAKE_REFERENCE_PATTERN } = require("../queue/diagnosticQueueSelector");

const PERSISTENCE_ERROR_CODE = "AUTHOR_DRAFT_PERSISTENCE_FAILED";
const WRITE_ERROR_CODE = "AUTHOR_DRAFT_PERSISTENCE_FAILED";

const FORBIDDEN_DRAFT_PERSISTENCE_FIELDS = [
  ...AUTHOR_DRAFT_UNMAPPED_UNSAFE_FIELDS
];

const SAFE_DRAFT_FIELDS = [
  "diagnosticId",
  "intakeReferenceCode",
  "authorName",
  "authorEmail",
  "projectTitle",
  "draftTemplate",
  "templateName",
  "draftSubject",
  "draftBody",
  "internalVisibilityMailbox",
  "sendStatus",
  "approvalStatus",
  "preparedAt",
  "preparedBy",
  "diagnosticOutputSummary",
  "diagnosticRiskFlags",
  "confidence",
  "reviewDecision",
  "reviewStatus",
  "requiresHumanReview",
  "metadata",
  "visibilityRule",
  "futureSendRequiresInternalCopy",
  "futureSendRequiresDataverseLog"
];

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function hasForbiddenFieldDeep(value) {
  if (!isPlainObject(value) && !Array.isArray(value)) return false;

  if (Array.isArray(value)) {
    return value.some((item) => hasForbiddenFieldDeep(item));
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (FORBIDDEN_DRAFT_PERSISTENCE_FIELDS.includes(key)) return true;
    if (hasForbiddenFieldDeep(nestedValue)) return true;
  }

  return false;
}

function hasOnlySafeTopLevelFields(draftPayload) {
  return Object.keys(draftPayload).every((key) => SAFE_DRAFT_FIELDS.includes(key));
}

function safeFailure(code, reason, draftPayload = null) {
  return {
    persisted: false,
    code,
    reason,
    diagnosticId: normalizeString(draftPayload?.diagnosticId) || null,
    intakeReferenceCode: normalizeString(draftPayload?.intakeReferenceCode) || null
  };
}

function normalizeTokenCounts(tokenCounts) {
  if (!isPlainObject(tokenCounts)) return null;
  return {
    input: typeof tokenCounts.input === "number" && Number.isFinite(tokenCounts.input) ? tokenCounts.input : 0,
    output: typeof tokenCounts.output === "number" && Number.isFinite(tokenCounts.output) ? tokenCounts.output : 0,
    total: typeof tokenCounts.total === "number" && Number.isFinite(tokenCounts.total) ? tokenCounts.total : 0
  };
}

function pickSafeMetadata(metadata) {
  if (!isPlainObject(metadata)) return {};

  const safe = {};
  for (const field of ["correlationId", "executionId"]) {
    if (typeof metadata[field] === "string" || typeof metadata[field] === "number" || typeof metadata[field] === "boolean") {
      safe[field] = metadata[field];
    }
  }

  const tokenCounts = normalizeTokenCounts(metadata.tokenCounts);
  if (tokenCounts) safe.tokenCounts = tokenCounts;

  return safe;
}

function futureCopyRequired(draftPayload) {
  return draftPayload.futureSendRequiresInternalCopy === true ||
    draftPayload.visibilityRule?.futureSendMustCopyOrMirror === true;
}

function futureLogRequired(draftPayload) {
  return draftPayload.futureSendRequiresDataverseLog === true ||
    draftPayload.visibilityRule?.futureSendEventMustBeLoggedInDataverse === true;
}

function normalizeTemplateName(draftPayload) {
  return normalizeString(draftPayload.templateName || draftPayload.draftTemplate);
}

function validateAuthorDraftPayload(draftPayload) {
  if (!isPlainObject(draftPayload)) {
    return { ok: false, reason: "MISSING_DRAFT_PAYLOAD" };
  }

  const diagnosticId = normalizeString(draftPayload.diagnosticId);
  const intakeReferenceCode = normalizeString(draftPayload.intakeReferenceCode);
  const templateName = normalizeTemplateName(draftPayload);
  const authorEmail = normalizeString(draftPayload.authorEmail);
  const draftSubject = normalizeString(draftPayload.draftSubject);
  const draftBody = normalizeString(draftPayload.draftBody);
  const internalVisibilityMailbox = normalizeString(draftPayload.internalVisibilityMailbox);

  if (!hasOnlySafeTopLevelFields(draftPayload) || hasForbiddenFieldDeep(draftPayload)) {
    return { ok: false, reason: "UNSAFE_FIELD_PRESENT" };
  }
  if (!diagnosticId || !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) {
    return { ok: false, reason: "DIAGNOSTIC_ID_INVALID" };
  }
  if (!intakeReferenceCode || !INTAKE_REFERENCE_PATTERN.test(intakeReferenceCode)) {
    return { ok: false, reason: "INTAKE_REFERENCE_CODE_INVALID" };
  }
  if (!authorEmail) {
    return { ok: false, reason: "AUTHOR_EMAIL_MISSING" };
  }
  if (!draftSubject) {
    return { ok: false, reason: "DRAFT_SUBJECT_MISSING" };
  }
  if (!draftBody) {
    return { ok: false, reason: "DRAFT_BODY_MISSING" };
  }
  if (templateName !== TEMPLATE_NAME) {
    return { ok: false, reason: "TEMPLATE_NAME_INVALID" };
  }
  if (draftPayload.sendStatus !== DRAFT_STATUS) {
    return { ok: false, reason: "SEND_STATUS_NOT_DRAFT_ONLY" };
  }
  if (draftPayload.approvalStatus !== DRAFT_APPROVAL_STATUS) {
    return { ok: false, reason: "APPROVAL_STATUS_NOT_PENDING_HUMAN_APPROVAL" };
  }
  if (internalVisibilityMailbox !== INTERNAL_VISIBILITY_MAILBOX) {
    return { ok: false, reason: "INTERNAL_VISIBILITY_MAILBOX_INVALID" };
  }
  if (!futureCopyRequired(draftPayload)) {
    return { ok: false, reason: "FUTURE_INTERNAL_COPY_REQUIRED" };
  }
  if (!futureLogRequired(draftPayload)) {
    return { ok: false, reason: "FUTURE_DATAVERSE_SEND_LOG_REQUIRED" };
  }

  return { ok: true };
}

function buildAuthorDraftRecord(draftPayload) {
  return {
    diagnosticId: normalizeString(draftPayload.diagnosticId),
    intakeReferenceCode: normalizeString(draftPayload.intakeReferenceCode),
    authorName: normalizeString(draftPayload.authorName),
    authorEmail: normalizeString(draftPayload.authorEmail),
    projectTitle: normalizeString(draftPayload.projectTitle),
    draftSubject: normalizeString(draftPayload.draftSubject),
    draftBody: normalizeString(draftPayload.draftBody),
    templateName: normalizeTemplateName(draftPayload),
    sendStatus: DRAFT_STATUS,
    approvalStatus: DRAFT_APPROVAL_STATUS,
    internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX,
    preparedAt: normalizeString(draftPayload.preparedAt) || null,
    preparedBy: normalizeString(draftPayload.preparedBy) || "system/internal",
    diagnosticOutputSummary: normalizeString(draftPayload.diagnosticOutputSummary),
    diagnosticRiskFlags: normalizeString(draftPayload.diagnosticRiskFlags),
    confidence: typeof draftPayload.confidence === "number" && Number.isFinite(draftPayload.confidence)
      ? draftPayload.confidence
      : null,
    reviewDecision: normalizeString(draftPayload.reviewDecision),
    reviewStatus: normalizeString(draftPayload.reviewStatus),
    requiresHumanReview: draftPayload.requiresHumanReview === true,
    metadata: pickSafeMetadata(draftPayload.metadata),
    futureSendRequiresInternalCopy: true,
    futureSendRequiresDataverseLog: true
  };
}

function buildDataverseUpdatePayload(draftRecord) {
  return {
    [AUTHOR_DRAFT_FIELD_MAP.draftSubject]: draftRecord.draftSubject,
    [AUTHOR_DRAFT_FIELD_MAP.draftBody]: draftRecord.draftBody,
    [AUTHOR_DRAFT_FIELD_MAP.draftTemplate]: draftRecord.templateName,
    [AUTHOR_DRAFT_FIELD_MAP.draftSendStatus]: DRAFT_STATUS,
    [AUTHOR_DRAFT_FIELD_MAP.draftApprovalStatus]: DRAFT_APPROVAL_STATUS,
    [AUTHOR_DRAFT_FIELD_MAP.internalVisibilityMailbox]: INTERNAL_VISIBILITY_MAILBOX,
    [AUTHOR_DRAFT_FIELD_MAP.futureSendRequiresInternalCopy]: true,
    [AUTHOR_DRAFT_FIELD_MAP.futureSendRequiresDataverseLog]: true,
    [AUTHOR_DRAFT_FIELD_MAP.draftPreparedAt]: draftRecord.preparedAt,
    [AUTHOR_DRAFT_FIELD_MAP.draftPreparedBy]: draftRecord.preparedBy,
    [AUTHOR_DRAFT_FIELD_MAP.draftApprovedBy]: null,
    [AUTHOR_DRAFT_FIELD_MAP.draftApprovedOn]: null,
    [AUTHOR_DRAFT_FIELD_MAP.draftApprovalNotes]: "Pending human approval. Draft only; no author-facing email sent."
  };
}

function validateDataverseClient(dataverseClient) {
  return isPlainObject(dataverseClient) && typeof dataverseClient.persistAuthorDraft === "function";
}

async function persistAuthorResponseDraft(input = {}) {
  const draftPayload = input.draftPayload;
  const validation = validateAuthorDraftPayload(draftPayload);
  if (!validation.ok) {
    return safeFailure(PERSISTENCE_ERROR_CODE, validation.reason, draftPayload);
  }

  if (!validateDataverseClient(input.dataverseClient)) {
    return safeFailure(PERSISTENCE_ERROR_CODE, "DATAVERSE_CLIENT_INVALID", draftPayload);
  }

  const draftRecord = buildAuthorDraftRecord(draftPayload);
  const dataverseUpdatePayload = buildDataverseUpdatePayload(draftRecord);
  const persistedAt = new Date().toISOString();

  try {
    const writeResult = await input.dataverseClient.persistAuthorDraft({
      tableLogicalName: TABLE_LOGICAL_NAME,
      entitySet: ENTITY_SET,
      rowIdentity: ROW_IDENTITY,
      diagnosticId: draftRecord.diagnosticId,
      intakeReferenceCode: draftRecord.intakeReferenceCode,
      fieldMap: AUTHOR_DRAFT_FIELD_MAP,
      draftRecord,
      dataverseUpdatePayload,
      persistedAt
    });

    return {
      persisted: true,
      diagnosticId: draftRecord.diagnosticId,
      intakeReferenceCode: draftRecord.intakeReferenceCode,
      templateName: TEMPLATE_NAME,
      sendStatus: DRAFT_STATUS,
      approvalStatus: DRAFT_APPROVAL_STATUS,
      internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX,
      dataverseRecordId: normalizeString(writeResult?.dataverseRecordId) || normalizeString(writeResult?.id) || draftRecord.diagnosticId,
      persistedAt
    };
  } catch {
    return safeFailure(WRITE_ERROR_CODE, "DATAVERSE_WRITE_FAILED", draftPayload);
  }
}

module.exports = {
  persistAuthorResponseDraft,
  buildAuthorDraftRecord,
  buildDataverseUpdatePayload,
  validateAuthorDraftPayload,
  TABLE_LOGICAL_NAME,
  ENTITY_SET,
  ROW_IDENTITY,
  AUTHOR_DRAFT_FIELD_MAP,
  SAFE_DRAFT_FIELDS,
  FORBIDDEN_DRAFT_PERSISTENCE_FIELDS,
  PERSISTENCE_ERROR_CODE,
  WRITE_ERROR_CODE
};
