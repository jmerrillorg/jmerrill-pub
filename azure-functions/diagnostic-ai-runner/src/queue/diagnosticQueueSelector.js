"use strict";

/**
 * Controlled diagnostic queue selection for INT-PUB-005.
 *
 * This module is intentionally pure selection logic. It does not read
 * Dataverse, fetch manuscript assets, call AI providers, write logs, send
 * email, create Opportunities, activate Flow D, or open execution gates.
 */

const { STATUS } = require("../routing/confidenceRouter");
const { normalizeFileTypeHint } = require("../dataverse/diagnosticRecordReader");

const QUEUE_STATUS = {
  READY_FOR_DIAGNOSTIC: "READY_FOR_DIAGNOSTIC",
  PROCESSING: 835500001,
  DIAGNOSTIC_COMPLETE: STATUS.COMPLETED,
  DIAGNOSTIC_FAILED: STATUS.EXCEPTION,
  HUMAN_REVIEW_REQUIRED: STATUS.NEEDS_HUMAN_REVIEW,
  BLOCKED: "BLOCKED"
};

const QUEUE_STATUS_LABEL = {
  [QUEUE_STATUS.READY_FOR_DIAGNOSTIC]: "Ready for Diagnostic",
  [QUEUE_STATUS.PROCESSING]: "Processing",
  [QUEUE_STATUS.DIAGNOSTIC_COMPLETE]: "Diagnostic Complete",
  [QUEUE_STATUS.DIAGNOSTIC_FAILED]: "Diagnostic Failed",
  [QUEUE_STATUS.HUMAN_REVIEW_REQUIRED]: "Human Review Required",
  [QUEUE_STATUS.BLOCKED]: "Blocked"
};

const DEFAULT_MAX_ATTEMPTS = 3;
const SUPPORTED_FILE_TYPES = new Set([".docx", ".txt"]);
const DIAGNOSTIC_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INTAKE_REFERENCE_PATTERN = /^JMP-INT-\d{6}-[A-Z0-9-]+$/i;
const APPROVED_ASSET_STATUS_VALUES = new Set([
  3,
  "3",
  "approved",
  "ready",
  "ready_for_diagnostic",
  "ready for diagnostic"
]);

const FIELD_ALIASES = {
  diagnosticId: [
    "diagnosticId",
    "jm1pub_editorialdiagnosticid",
    "jm1_editorialdiagnosticid",
    "jm1_diagnosticid"
  ],
  intakeReferenceCode: [
    "intakeReferenceCode",
    "jm1_intakereferencecode",
    "jm1pub_intakereferencecode"
  ],
  manuscriptAssetUrl: [
    "manuscriptAssetUrl",
    "manuscriptUrl",
    "jm1_manuscriptasseturl"
  ],
  manuscriptAssetStatus: [
    "manuscriptAssetStatus",
    "assetStatus",
    "jm1_manuscriptassetstatus"
  ],
  approvedForDiagnostic: [
    "approvedForDiagnostic",
    "manuscriptApprovedForDiagnostic",
    "jm1_manuscriptapprovedfordiagnostic"
  ],
  manuscriptFileType: [
    "manuscriptFileType",
    "fileType",
    "fileTypeHint",
    "jm1_manuscriptfiletype"
  ],
  diagnosticExecutionStatus: [
    "diagnosticExecutionStatus",
    "executionStatus",
    "status",
    "jm1_diagnosticexecutionstatus"
  ],
  diagnosticAttemptCount: [
    "diagnosticAttemptCount",
    "attemptCount",
    "retryCount",
    "failureCount",
    "jm1_diagnosticattemptcount"
  ],
  manuallyBlocked: [
    "manuallyBlocked",
    "manualBlocked",
    "blocked",
    "jm1_diagnosticmanuallyblocked",
    "jm1_diagnosticblocked",
    "jm1_manualblockdiagnostic"
  ]
};

function pick(record, aliases) {
  for (const key of aliases) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return record[key];
    }
  }
  return undefined;
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value) {
  if (value === QUEUE_STATUS.PROCESSING || value === QUEUE_STATUS.DIAGNOSTIC_COMPLETE ||
      value === QUEUE_STATUS.DIAGNOSTIC_FAILED || value === QUEUE_STATUS.HUMAN_REVIEW_REQUIRED) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
    if (normalized === "READY" || normalized === "READY_FOR_DIAGNOSTIC") return QUEUE_STATUS.READY_FOR_DIAGNOSTIC;
    if (normalized === "PROCESSING") return QUEUE_STATUS.PROCESSING;
    if (normalized === "COMPLETED" || normalized === "COMPLETE" || normalized === "DIAGNOSTIC_COMPLETE") return QUEUE_STATUS.DIAGNOSTIC_COMPLETE;
    if (normalized === "FAILED" || normalized === "EXCEPTION" || normalized === "DIAGNOSTIC_FAILED") return QUEUE_STATUS.DIAGNOSTIC_FAILED;
    if (normalized === "NEEDS_HUMAN_REVIEW" || normalized === "HUMAN_REVIEW_REQUIRED") return QUEUE_STATUS.HUMAN_REVIEW_REQUIRED;
    if (normalized === "BLOCKED") return QUEUE_STATUS.BLOCKED;
  }

  return null;
}

function normalizeAttemptCount(value) {
  if (value === undefined || value === null || value === "") return 0;
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number.parseInt(value.trim(), 10);
  return null;
}

function isApprovedAssetStatus(value) {
  if (typeof value === "number") return APPROVED_ASSET_STATUS_VALUES.has(value);
  if (typeof value === "string") {
    return APPROVED_ASSET_STATUS_VALUES.has(value.trim().toLowerCase());
  }
  return false;
}

function isValidManuscriptUrl(value) {
  if (typeof value !== "string" || value.trim() === "") return false;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function safeResult({ eligible, reason, missingFields, blockingConditions, diagnosticId, intakeReferenceCode }) {
  return {
    eligible,
    reason,
    missingFields,
    blockingConditions,
    diagnosticId: diagnosticId || null,
    intakeReferenceCode: intakeReferenceCode || null
  };
}

/**
 * Evaluates whether a diagnostic record is eligible for controlled queue
 * selection. Returned fields are safe for logs and PR evidence records.
 *
 * @param {object} record
 * @param {{maxAttempts?: number}} [options]
 * @returns {{
 *   eligible: boolean,
 *   reason: string,
 *   missingFields: string[],
 *   blockingConditions: string[],
 *   diagnosticId: string|null,
 *   intakeReferenceCode: string|null
 * }}
 */
function evaluateDiagnosticQueueEligibility(record, options = {}) {
  const missingFields = [];
  const blockingConditions = [];
  const maxAttempts = Number.isInteger(options.maxAttempts) && options.maxAttempts > 0
    ? options.maxAttempts
    : DEFAULT_MAX_ATTEMPTS;

  if (record == null || typeof record !== "object" || Array.isArray(record)) {
    return safeResult({
      eligible: false,
      reason: "INVALID_RECORD",
      missingFields: ["record"],
      blockingConditions: ["INVALID_RECORD"],
      diagnosticId: null,
      intakeReferenceCode: null
    });
  }

  const diagnosticId = normalizeString(pick(record, FIELD_ALIASES.diagnosticId));
  const intakeReferenceCode = normalizeString(pick(record, FIELD_ALIASES.intakeReferenceCode));
  const manuscriptAssetUrl = pick(record, FIELD_ALIASES.manuscriptAssetUrl);
  const manuscriptAssetStatus = pick(record, FIELD_ALIASES.manuscriptAssetStatus);
  const approvedForDiagnostic = pick(record, FIELD_ALIASES.approvedForDiagnostic);
  const fileType = normalizeFileTypeHint(pick(record, FIELD_ALIASES.manuscriptFileType));
  const status = normalizeStatus(pick(record, FIELD_ALIASES.diagnosticExecutionStatus));
  const attemptCount = normalizeAttemptCount(pick(record, FIELD_ALIASES.diagnosticAttemptCount));
  const manuallyBlocked = pick(record, FIELD_ALIASES.manuallyBlocked) === true;

  if (!diagnosticId) missingFields.push("diagnosticId");
  if (!intakeReferenceCode) missingFields.push("intakeReferenceCode");
  if (!isValidManuscriptUrl(manuscriptAssetUrl)) missingFields.push("manuscriptAssetUrl");
  if (manuscriptAssetStatus === undefined || manuscriptAssetStatus === null || manuscriptAssetStatus === "") {
    missingFields.push("manuscriptAssetStatus");
  }
  if (approvedForDiagnostic !== true) missingFields.push("approvedForDiagnostic");
  if (!fileType) missingFields.push("manuscriptFileType");
  if (status == null) missingFields.push("diagnosticExecutionStatus");
  if (attemptCount == null) missingFields.push("diagnosticAttemptCount");

  if (manuscriptAssetStatus !== undefined && manuscriptAssetStatus !== null && manuscriptAssetStatus !== "" &&
      !isApprovedAssetStatus(manuscriptAssetStatus)) {
    blockingConditions.push("MANUSCRIPT_ASSET_NOT_APPROVED");
  }

  if (diagnosticId && !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) {
    blockingConditions.push("DIAGNOSTIC_ID_MALFORMED");
  }

  if (intakeReferenceCode && !INTAKE_REFERENCE_PATTERN.test(intakeReferenceCode)) {
    blockingConditions.push("INTAKE_REFERENCE_CODE_MALFORMED");
  }

  if (approvedForDiagnostic !== true) {
    blockingConditions.push("MANUSCRIPT_NOT_APPROVED_FOR_DIAGNOSTIC");
  }

  if (fileType == null && pick(record, FIELD_ALIASES.manuscriptFileType) !== undefined) {
    blockingConditions.push("UNSUPPORTED_FILE_TYPE");
  } else if (fileType != null && !SUPPORTED_FILE_TYPES.has(fileType)) {
    blockingConditions.push("UNSUPPORTED_FILE_TYPE");
  }

  if (status === QUEUE_STATUS.DIAGNOSTIC_COMPLETE) {
    blockingConditions.push("DIAGNOSTIC_ALREADY_COMPLETE");
  } else if (status === QUEUE_STATUS.PROCESSING) {
    blockingConditions.push("DIAGNOSTIC_CURRENTLY_PROCESSING");
  } else if (status === QUEUE_STATUS.HUMAN_REVIEW_REQUIRED) {
    blockingConditions.push("DIAGNOSTIC_ALREADY_REQUIRES_HUMAN_REVIEW");
  } else if (status === QUEUE_STATUS.BLOCKED) {
    blockingConditions.push("DIAGNOSTIC_MANUALLY_BLOCKED");
  } else if (status == null && pick(record, FIELD_ALIASES.diagnosticExecutionStatus) !== undefined) {
    blockingConditions.push("DIAGNOSTIC_STATUS_MALFORMED");
  }

  if (attemptCount != null && attemptCount >= maxAttempts) {
    blockingConditions.push("DIAGNOSTIC_RETRY_LIMIT_EXCEEDED");
  } else if (attemptCount == null && pick(record, FIELD_ALIASES.diagnosticAttemptCount) !== undefined) {
    blockingConditions.push("DIAGNOSTIC_ATTEMPT_COUNT_MALFORMED");
  }

  if (manuallyBlocked) {
    blockingConditions.push("DIAGNOSTIC_MANUALLY_BLOCKED");
  }

  const uniqueMissingFields = [...new Set(missingFields)];
  const uniqueBlockingConditions = [...new Set(blockingConditions)];

  if (uniqueMissingFields.length > 0 || uniqueBlockingConditions.length > 0) {
    return safeResult({
      eligible: false,
      reason: "BLOCKED",
      missingFields: uniqueMissingFields,
      blockingConditions: uniqueBlockingConditions,
      diagnosticId,
      intakeReferenceCode
    });
  }

  return safeResult({
    eligible: true,
    reason: "ELIGIBLE",
    missingFields: [],
    blockingConditions: [],
    diagnosticId,
    intakeReferenceCode
  });
}

function selectEligibleDiagnostics(records, options = {}) {
  if (!Array.isArray(records)) {
    return {
      eligible: [],
      rejected: [evaluateDiagnosticQueueEligibility(records, options)]
    };
  }

  const eligible = [];
  const rejected = [];

  for (const record of records) {
    const result = evaluateDiagnosticQueueEligibility(record, options);
    if (result.eligible) {
      eligible.push(result);
    } else {
      rejected.push(result);
    }
  }

  return { eligible, rejected };
}

module.exports = {
  evaluateDiagnosticQueueEligibility,
  selectEligibleDiagnostics,
  QUEUE_STATUS,
  QUEUE_STATUS_LABEL,
  DEFAULT_MAX_ATTEMPTS,
  SUPPORTED_FILE_TYPES,
  DIAGNOSTIC_ID_PATTERN,
  INTAKE_REFERENCE_PATTERN
};
