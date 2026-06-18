"use strict";

/**
 * Internal diagnostic review payload builder for INT-PUB-005.
 *
 * This module is pure preparation logic. It does not send email, draft
 * author-facing messages, create Opportunities, activate Flow D, call AI,
 * read manuscripts, write Dataverse, or open execution gates.
 */

const { DIAGNOSTIC_ID_PATTERN, INTAKE_REFERENCE_PATTERN } = require("../queue/diagnosticQueueSelector");

const REVIEW_STATUS = {
  PENDING_HUMAN_REVIEW: "PENDING_HUMAN_REVIEW",
  APPROVED_FOR_AUTHOR_DRAFT: "APPROVED_FOR_AUTHOR_DRAFT",
  REJECTED: "REJECTED",
  NEEDS_REVISION: "NEEDS_REVISION",
  BLOCKED: "BLOCKED"
};

const APPROVAL_STATUS = {
  PENDING_HUMAN_REVIEW: "PENDING_HUMAN_REVIEW"
};

const SAFE_METADATA_FIELDS = [
  "provider",
  "model",
  "modelDeploymentAlias",
  "promptKey",
  "promptVersion",
  "correlationId",
  "tokenCounts"
];

const FORBIDDEN_PAYLOAD_FIELDS = [
  "manuscriptText",
  "manuscriptContent",
  "extractedManuscriptContent",
  "extractedContent",
  "promptBody",
  "rawPrompt",
  "rawModelOutput",
  "rawModelResponse",
  "authorEmailBody",
  "emailBody",
  "emailTo",
  "emailSubject",
  "opportunityId",
  "opportunityPayload",
  "flowDTrigger",
  "headers",
  "tokens",
  "apiKey",
  "secret"
];

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function safeFailure(code, details = {}) {
  return {
    ok: false,
    code,
    missingFields: details.missingFields || [],
    blockingConditions: details.blockingConditions || [],
    diagnosticId: details.diagnosticId || null,
    intakeReferenceCode: details.intakeReferenceCode || null
  };
}

function hasForbiddenField(source) {
  if (source == null || typeof source !== "object") return false;
  return FORBIDDEN_PAYLOAD_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(source, field));
}

function pickSafeMetadata(metadata) {
  if (metadata == null || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  const safe = {};

  for (const field of SAFE_METADATA_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(metadata, field)) continue;

    if (field === "tokenCounts") {
      const tokenCounts = metadata.tokenCounts;
      if (tokenCounts && typeof tokenCounts === "object" && !Array.isArray(tokenCounts)) {
        safe.tokenCounts = {
          input: typeof tokenCounts.input === "number" && Number.isFinite(tokenCounts.input) ? tokenCounts.input : 0,
          output: typeof tokenCounts.output === "number" && Number.isFinite(tokenCounts.output) ? tokenCounts.output : 0,
          total: typeof tokenCounts.total === "number" && Number.isFinite(tokenCounts.total) ? tokenCounts.total : 0
        };
      }
      continue;
    }

    if (typeof metadata[field] === "string" || typeof metadata[field] === "number" || typeof metadata[field] === "boolean") {
      safe[field] = metadata[field];
    }
  }

  return safe;
}

function normalizeRoutingDecision(routingResult) {
  if (routingResult == null || typeof routingResult !== "object" || Array.isArray(routingResult)) {
    return null;
  }

  const status = routingResult.status;
  const statusLabel = normalizeString(routingResult.statusLabel);
  const routingBasis = normalizeString(routingResult.routingBasis);

  if (!statusLabel || !routingBasis) {
    return null;
  }

  return {
    status: typeof status === "number" || typeof status === "string" ? status : null,
    statusLabel,
    routingBasis,
    requiresHumanReview: routingResult.requiresHumanReview === true
  };
}

/**
 * Builds a safe internal review payload from already-validated diagnostic
 * output and routing metadata.
 *
 * @param {{
 *   diagnosticId: string,
 *   intakeReferenceCode: string,
 *   aiOutput: object,
 *   routingResult: object,
 *   metadata?: object,
 *   preparedAt?: string
 * }} input
 * @returns {{ok: true, payload: object}|{ok: false, code: string, missingFields: string[], blockingConditions: string[], diagnosticId: string|null, intakeReferenceCode: string|null}}
 */
function buildInternalDiagnosticReviewPayload(input) {
  if (input == null || typeof input !== "object" || Array.isArray(input)) {
    return safeFailure("INVALID_REVIEW_INPUT", {
      missingFields: ["input"],
      blockingConditions: ["INVALID_REVIEW_INPUT"]
    });
  }

  const diagnosticId = normalizeString(input.diagnosticId);
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode);
  const aiOutput = input.aiOutput;
  const routingResult = input.routingResult;
  const metadata = input.metadata;
  const missingFields = [];
  const blockingConditions = [];

  if (!diagnosticId) missingFields.push("diagnosticId");
  if (diagnosticId && !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) {
    blockingConditions.push("DIAGNOSTIC_ID_MALFORMED");
  }

  if (!intakeReferenceCode) missingFields.push("intakeReferenceCode");
  if (intakeReferenceCode && !INTAKE_REFERENCE_PATTERN.test(intakeReferenceCode)) {
    blockingConditions.push("INTAKE_REFERENCE_CODE_MALFORMED");
  }

  if (aiOutput == null || typeof aiOutput !== "object" || Array.isArray(aiOutput)) {
    missingFields.push("aiOutput");
    blockingConditions.push("AI_OUTPUT_INVALID");
  }

  const summary = normalizeString(aiOutput?.jm1_diagnosticoutputsummary);
  const riskFlags = normalizeString(aiOutput?.jm1_diagnosticriskflags);
  const confidence = aiOutput?.jm1_confidence;
  const requiresHumanReview = aiOutput?.jm1_requireshumanreview;

  if (!summary) missingFields.push("jm1_diagnosticoutputsummary");
  if (!riskFlags) missingFields.push("jm1_diagnosticriskflags");

  if (typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    missingFields.push("jm1_confidence");
    blockingConditions.push("CONFIDENCE_INVALID");
  }

  if (requiresHumanReview !== true) {
    blockingConditions.push("HUMAN_REVIEW_REQUIRED_NOT_TRUE");
  }

  const routingDecision = normalizeRoutingDecision(routingResult);
  if (!routingDecision) {
    missingFields.push("routingResult");
    blockingConditions.push("ROUTING_RESULT_INVALID");
  } else if (routingDecision.requiresHumanReview !== true) {
    blockingConditions.push("ROUTING_REQUIRES_HUMAN_REVIEW_NOT_TRUE");
  }

  if (hasForbiddenField(input) || hasForbiddenField(aiOutput) || hasForbiddenField(metadata)) {
    blockingConditions.push("UNSAFE_FIELD_PRESENT");
  }

  const uniqueMissingFields = [...new Set(missingFields)];
  const uniqueBlockingConditions = [...new Set(blockingConditions)];

  if (uniqueMissingFields.length > 0 || uniqueBlockingConditions.length > 0) {
    return safeFailure("REVIEW_PAYLOAD_BLOCKED", {
      missingFields: uniqueMissingFields,
      blockingConditions: uniqueBlockingConditions,
      diagnosticId,
      intakeReferenceCode
    });
  }

  const safeMetadata = pickSafeMetadata(metadata);
  const preparedAt = normalizeString(input.preparedAt) || new Date().toISOString();

  return {
    ok: true,
    payload: {
      diagnosticId,
      intakeReferenceCode,
      diagnosticOutputSummary: summary,
      diagnosticRiskFlags: riskFlags,
      confidence,
      requiresHumanReview: true,
      routingDecision,
      reviewStatus: REVIEW_STATUS.PENDING_HUMAN_REVIEW,
      reviewedBy: null,
      reviewedOn: null,
      approvalStatus: APPROVAL_STATUS.PENDING_HUMAN_REVIEW,
      preparedAt,
      metadata: safeMetadata
    }
  };
}

module.exports = {
  buildInternalDiagnosticReviewPayload,
  REVIEW_STATUS,
  APPROVAL_STATUS,
  SAFE_METADATA_FIELDS,
  FORBIDDEN_PAYLOAD_FIELDS
};
