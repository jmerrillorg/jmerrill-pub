"use strict";

/**
 * Internal author response draft preparation for INT-PUB-005 Stage 0.
 *
 * This module prepares a draft only. It does not send email, call mail APIs,
 * create Opportunities, activate Flow D, call AI, run diagnostics, write
 * Dataverse, or open execution gates.
 */

const {
  REVIEW_STATUS,
  FORBIDDEN_PAYLOAD_FIELDS
} = require("../review/diagnosticReviewBuilder");
const { REVIEW_DECISION } = require("../review/humanReviewDecisionModel");
const { DIAGNOSTIC_ID_PATTERN, INTAKE_REFERENCE_PATTERN } = require("../queue/diagnosticQueueSelector");

const TEMPLATE_NAME = "INITIAL_DIAGNOSTIC_REVIEW_NEXT_STEP";
const INTERNAL_VISIBILITY_MAILBOX = "publishing@jmerrill.one";
const DRAFT_STATUS = "DRAFT_ONLY";
const DRAFT_APPROVAL_STATUS = "PENDING_HUMAN_APPROVAL";

const FORBIDDEN_DRAFT_FIELDS = [
  ...FORBIDDEN_PAYLOAD_FIELDS,
  "sendNow",
  "sendImmediately",
  "sentAt",
  "emailSent",
  "mailSent",
  "deliveryStatus",
  "sendStatusOverride",
  "opportunityCreate",
  "createOpportunity",
  "activateFlowD",
  "flowDActivation",
  "runDiagnostic",
  "productionActivation"
];

const SAFE_INPUT_FIELDS = [
  "diagnosticId",
  "intakeReferenceCode",
  "reviewDecision",
  "reviewPayload",
  "author",
  "project",
  "metadata"
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
    if (FORBIDDEN_DRAFT_FIELDS.includes(key)) return true;
    if (hasForbiddenFieldDeep(nestedValue)) return true;
  }

  return false;
}

function hasOnlySafeTopLevelFields(input) {
  return Object.keys(input).every((key) => SAFE_INPUT_FIELDS.includes(key));
}

function safeFailure(reason, input = null) {
  return {
    ok: false,
    code: "AUTHOR_RESPONSE_DRAFT_BLOCKED",
    reason,
    diagnosticId: normalizeString(input?.diagnosticId) || null,
    intakeReferenceCode: normalizeString(input?.intakeReferenceCode) || null
  };
}

function normalizeAuthor(author) {
  if (!isPlainObject(author)) return { name: "", email: "" };
  return {
    name: normalizeString(author.name || author.fullName || author.firstName),
    email: normalizeString(author.email)
  };
}

function normalizeProject(project) {
  if (!isPlainObject(project)) return { title: "" };
  return {
    title: normalizeString(project.title || project.projectTitle || project.bookTitle)
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

  return safe;
}

function validateDraftInput(input) {
  if (!isPlainObject(input)) {
    return safeFailure("INVALID_DRAFT_INPUT");
  }

  if (!hasOnlySafeTopLevelFields(input) || hasForbiddenFieldDeep(input)) {
    return safeFailure("UNSAFE_FIELD_PRESENT", input);
  }

  const diagnosticId = normalizeString(input.diagnosticId);
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode);
  const reviewDecision = normalizeString(input.reviewDecision);
  const reviewPayload = input.reviewPayload;
  const author = normalizeAuthor(input.author);
  const project = normalizeProject(input.project);

  if (reviewDecision !== REVIEW_DECISION.APPROVE_FOR_AUTHOR_DRAFT) {
    return safeFailure("REVIEW_DECISION_NOT_APPROVED_FOR_AUTHOR_DRAFT", input);
  }
  if (!diagnosticId || !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) {
    return safeFailure("DIAGNOSTIC_ID_INVALID", input);
  }
  if (!intakeReferenceCode || !INTAKE_REFERENCE_PATTERN.test(intakeReferenceCode)) {
    return safeFailure("INTAKE_REFERENCE_CODE_INVALID", input);
  }
  if (!isPlainObject(reviewPayload)) {
    return safeFailure("REVIEW_PAYLOAD_INVALID", input);
  }
  if (normalizeString(reviewPayload.reviewStatus) !== REVIEW_STATUS.APPROVED_FOR_AUTHOR_DRAFT) {
    return safeFailure("REVIEW_STATUS_NOT_APPROVED_FOR_AUTHOR_DRAFT", input);
  }
  if (!author.email) {
    return safeFailure("AUTHOR_EMAIL_MISSING", input);
  }
  if (!author.name) {
    return safeFailure("AUTHOR_NAME_MISSING", input);
  }
  if (!project.title) {
    return safeFailure("PROJECT_TITLE_MISSING", input);
  }

  const summary = normalizeString(reviewPayload.diagnosticOutputSummary);
  const riskFlags = normalizeString(reviewPayload.diagnosticRiskFlags);
  const confidence = reviewPayload.confidence;

  if (!summary) {
    return safeFailure("DIAGNOSTIC_SUMMARY_MISSING", input);
  }
  if (!riskFlags) {
    return safeFailure("DIAGNOSTIC_RISK_FLAGS_MISSING", input);
  }
  if (typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    return safeFailure("CONFIDENCE_INVALID", input);
  }
  if (reviewPayload.requiresHumanReview !== true) {
    return safeFailure("HUMAN_REVIEW_REQUIRED_NOT_TRUE", input);
  }

  return {
    ok: true,
    diagnosticId,
    intakeReferenceCode,
    reviewDecision,
    reviewPayload,
    author,
    project
  };
}

function buildDraftBody({ authorName, projectTitle, summary }) {
  return [
    `Hello ${authorName},`,
    "",
    `Thank you for submitting ${projectTitle} to J Merrill Publishing. We have received your project and have completed an initial internal editorial review.`,
    "",
    `Based on that review, our current internal characterization is: ${summary}`,
    "",
    "This is not a final acceptance decision, package recommendation, or pricing proposal. A human team member will review the next step before anything is sent or finalized.",
    "",
    "We would like to continue reviewing fit, readiness, and the best publishing path with care. A J Merrill Publishing team member can follow up with the appropriate next-step invitation after internal approval.",
    "",
    "Warmly,",
    "J Merrill Publishing"
  ].join("\n");
}

function buildAuthorResponseDraft(input) {
  const validation = validateDraftInput(input);
  if (!validation.ok) return validation;

  const preparedAt = new Date().toISOString();
  const metadata = pickSafeMetadata(input.metadata);
  const authorName = validation.author.name;
  const authorEmail = validation.author.email;
  const projectTitle = validation.project.title;
  const summary = normalizeString(validation.reviewPayload.diagnosticOutputSummary);
  const riskFlags = normalizeString(validation.reviewPayload.diagnosticRiskFlags);

  return {
    ok: true,
    draft: {
      diagnosticId: validation.diagnosticId,
      intakeReferenceCode: validation.intakeReferenceCode,
      authorName,
      authorEmail,
      projectTitle,
      draftTemplate: TEMPLATE_NAME,
      draftSubject: "Next step for your J Merrill Publishing submission",
      draftBody: buildDraftBody({ authorName, projectTitle, summary }),
      internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX,
      sendStatus: DRAFT_STATUS,
      approvalStatus: DRAFT_APPROVAL_STATUS,
      preparedAt,
      preparedBy: "system/internal",
      diagnosticOutputSummary: summary,
      diagnosticRiskFlags: riskFlags,
      confidence: validation.reviewPayload.confidence,
      reviewDecision: validation.reviewDecision,
      reviewStatus: validation.reviewPayload.reviewStatus,
      requiresHumanReview: true,
      metadata,
      visibilityRule: {
        internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX,
        futureSendMustCopyOrMirror: true,
        futureSendEventMustBeLoggedInDataverse: true
      }
    }
  };
}

module.exports = {
  buildAuthorResponseDraft,
  validateDraftInput,
  TEMPLATE_NAME,
  INTERNAL_VISIBILITY_MAILBOX,
  DRAFT_STATUS,
  DRAFT_APPROVAL_STATUS
};
