"use strict";

/**
 * Milestone #7 governed production-readiness model.
 *
 * This module prepares production readiness, task, notification, and evidence
 * payloads only. It does not create tasks, activate Flow D, send email, assign
 * ISBN, start distribution/release, charge cards, or perform production work.
 */

const { DIAGNOSTIC_ID_PATTERN, INTAKE_REFERENCE_PATTERN } = require("../queue/diagnosticQueueSelector");
const {
  AGENT_NAME,
  BAND_LEVEL,
  EXECUTION_STATUS,
  SOURCE_ENTITY
} = require("../dataverse/metadataWriter");

const INTERNAL_VISIBILITY_MAILBOX = "publishing@jmerrill.one";
const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const PRODUCTION_TASK_ENTITY_SET = "jm1_publishingtasks";
const EVENT_TYPE = "MILESTONE_7_PRODUCTION_READINESS";

const PRODUCTION_GATE_NAME = "JM1_PRODUCTION_AUTHORIZATION_ENABLED";

const PRODUCTION_PATHS = Object.freeze({
  EDITORIAL: "EDITORIAL_PRODUCTION",
  DESIGN_COVER_LAYOUT: "DESIGN_COVER_LAYOUT",
  PROOFING: "PROOFING",
  FILE_READINESS: "FILE_READINESS"
});

const HUMAN_CHECKPOINTS = Object.freeze([
  "PRODUCTION_AUTHORIZATION_REVIEW",
  "EDITORIAL_PLAN_APPROVAL",
  "DESIGN_BRIEF_APPROVAL",
  "PROOF_REVIEW_APPROVAL",
  "FILE_READINESS_APPROVAL",
  "DISTRIBUTION_RELEASE_STOP_REVIEW"
]);

const TASK_TEMPLATES = Object.freeze([
  Object.freeze({
    path: PRODUCTION_PATHS.EDITORIAL,
    taskCode: "M7-EDITORIAL-PLAN",
    taskName: "Milestone 7 Editorial Production Plan",
    checkpoint: "EDITORIAL_PLAN_APPROVAL"
  }),
  Object.freeze({
    path: PRODUCTION_PATHS.DESIGN_COVER_LAYOUT,
    taskCode: "M7-DESIGN-BRIEF",
    taskName: "Milestone 7 Cover and Layout Design Brief",
    checkpoint: "DESIGN_BRIEF_APPROVAL"
  }),
  Object.freeze({
    path: PRODUCTION_PATHS.PROOFING,
    taskCode: "M7-PROOFING-PLAN",
    taskName: "Milestone 7 Proofing Plan",
    checkpoint: "PROOF_REVIEW_APPROVAL"
  }),
  Object.freeze({
    path: PRODUCTION_PATHS.FILE_READINESS,
    taskCode: "M7-FILE-READINESS",
    taskName: "Milestone 7 Print and Digital File Readiness Check",
    checkpoint: "FILE_READINESS_APPROVAL"
  })
]);

const SAFE_INPUT_FIELDS = Object.freeze([
  "diagnosticId",
  "intakeReferenceCode",
  "opportunity",
  "project",
  "author",
  "agreement",
  "onboarding",
  "payment",
  "productionAuthorization",
  "productionGateEnabled",
  "completedAt",
  "metadata"
]);

const FORBIDDEN_FIELDS = Object.freeze([
  "manuscriptText",
  "manuscriptContent",
  "extractedManuscriptContent",
  "promptBody",
  "rawPrompt",
  "rawModelOutput",
  "rawModelResponse",
  "stripeCheckoutUrl",
  "stripePaymentLink",
  "stripeInvoiceUrl",
  "stripeSubscriptionId",
  "invoiceUrl",
  "invoiceSent",
  "checkoutSessionId",
  "paymentLinkId",
  "paymentRequestSent",
  "contractSent",
  "contractUrlToSend",
  "startDistribution",
  "distributionStarted",
  "releaseDate",
  "releaseStarted",
  "royaltySetupStarted",
  "postReleaseManagement",
  "flowDTrigger",
  "activateFlowD",
  "qboInvoiceId",
  "quickBooksInvoiceId",
  "headers",
  "authorization",
  "cookies",
  "tokens",
  "apiKey",
  "secret"
]);

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function hasForbiddenFieldDeep(value) {
  if (!isPlainObject(value) && !Array.isArray(value)) return false;
  if (Array.isArray(value)) return value.some((item) => hasForbiddenFieldDeep(item));
  return Object.entries(value).some(([key, nestedValue]) => (
    FORBIDDEN_FIELDS.includes(key) || hasForbiddenFieldDeep(nestedValue)
  ));
}

function hasOnlySafeTopLevelFields(input) {
  return Object.keys(input).every((key) => SAFE_INPUT_FIELDS.includes(key));
}

function safeFailure(reason, input = null) {
  return {
    ok: false,
    code: "MILESTONE_7_PRODUCTION_READINESS_BLOCKED",
    reason,
    diagnosticId: normalizeString(input?.diagnosticId) || null,
    intakeReferenceCode: normalizeString(input?.intakeReferenceCode) || null
  };
}

function isReadyStatus(value, allowed) {
  return allowed.includes(normalizeString(value));
}

function buildTaskTemplates() {
  return TASK_TEMPLATES.map((template) => Object.freeze({
    ...template,
    entitySet: PRODUCTION_TASK_ENTITY_SET,
    taskPayloadCreated: false,
    taskCreatedInDataverse: false
  }));
}

function buildProductionTaskPayloads(input, readiness) {
  if (!readiness.productionStartPermitted) return [];

  const dueDate = normalizeString(input.productionAuthorization?.targetStartDate) || null;
  const projectTitle = normalizeString(input.project?.title) || "Publishing project";
  return TASK_TEMPLATES.map((template) => Object.freeze({
    entitySet: PRODUCTION_TASK_ENTITY_SET,
    path: template.path,
    checkpoint: template.checkpoint,
    payload: Object.freeze({
      jm1_taskname: `${template.taskName} - ${projectTitle}`.slice(0, 100),
      jm1_iscompleted: false,
      ...(dueDate ? { jm1_duedate: dueDate } : {})
    })
  }));
}

function buildInternalNotification(input, readiness) {
  return {
    prepared: true,
    type: EVENT_TYPE,
    to: INTERNAL_VISIBILITY_MAILBOX,
    cc: [],
    bcc: [],
    subject: `Milestone 7 production readiness: ${input.intakeReferenceCode}`,
    safePreview: [
      `Milestone 7 production readiness evaluated for ${input.intakeReferenceCode}.`,
      `Production start permitted: ${readiness.productionStartPermitted ? "yes" : "no"}.`,
      `Blocking conditions: ${readiness.blockers.length ? readiness.blockers.join(", ") : "none"}.`,
      "Stops before distribution, release, royalty setup, and post-release management."
    ].join(" ")
  };
}

function buildMilestone7ProductionReadiness(input = {}) {
  if (!isPlainObject(input)) return safeFailure("INVALID_MILESTONE_7_INPUT");
  if (!hasOnlySafeTopLevelFields(input) || hasForbiddenFieldDeep(input)) return safeFailure("UNSAFE_FIELD_PRESENT", input);

  const diagnosticId = normalizeString(input.diagnosticId);
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode);
  if (!diagnosticId || !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) return safeFailure("DIAGNOSTIC_ID_INVALID", input);
  if (!intakeReferenceCode || !INTAKE_REFERENCE_PATTERN.test(intakeReferenceCode)) return safeFailure("INTAKE_REFERENCE_CODE_INVALID", input);

  const opportunityId = normalizeString(input.opportunity?.opportunityId || input.opportunity?.id);
  if (!opportunityId) return safeFailure("EXISTING_OPPORTUNITY_REQUIRED", input);
  if (input.opportunity?.active !== true) return safeFailure("ACTIVE_OPPORTUNITY_REQUIRED", input);

  const selectedPackageCode = normalizeString(input.opportunity?.authorSelectedPackageCode);
  const packageSelectionConfirmed = normalizeString(input.opportunity?.packageSelectionStatus) === "PACKAGE_SELECTED" && Boolean(selectedPackageCode);
  const agreementSatisfied = isReadyStatus(input.agreement?.status, [
    "AGREEMENT_EXECUTED",
    "AGREEMENT_SATISFIED",
    "AGREEMENT_WAIVED_BY_JACKIE"
  ]);
  const onboardingSatisfied = isReadyStatus(input.onboarding?.status, [
    "ONBOARDING_COMPLETE",
    "ONBOARDING_READY",
    "ONBOARDING_WAIVED_BY_JACKIE"
  ]);
  const paymentSatisfied = isReadyStatus(input.payment?.status, [
    "PAYMENT_RECEIVED",
    "PAYMENT_REQUIREMENT_SATISFIED",
    "PAYMENT_WAIVED_BY_JACKIE"
  ]);
  const gateEnabled = input.productionGateEnabled === true;
  const humanAuthorized = normalizeString(input.productionAuthorization?.authorizedBy) && normalizeString(input.productionAuthorization?.authorizedAt);

  const blockers = [
    ...(!packageSelectionConfirmed ? ["AUTHOR_PACKAGE_SELECTION_REQUIRED"] : []),
    ...(!agreementSatisfied ? ["AGREEMENT_REQUIREMENT_NOT_SATISFIED"] : []),
    ...(!onboardingSatisfied ? ["ONBOARDING_REQUIREMENT_NOT_SATISFIED"] : []),
    ...(!paymentSatisfied ? ["PAYMENT_OR_WAIVER_REQUIRED"] : []),
    ...(!gateEnabled ? [`${PRODUCTION_GATE_NAME}_FALSE`] : []),
    ...(!humanAuthorized ? ["HUMAN_PRODUCTION_AUTHORIZATION_REQUIRED"] : [])
  ];
  const productionStartPermitted = blockers.length === 0;

  const readiness = {
    diagnosticId,
    intakeReferenceCode,
    opportunityId,
    selectedPackageCode: selectedPackageCode || null,
    packageSelectionConfirmed,
    agreementSatisfied,
    onboardingSatisfied,
    paymentSatisfied,
    productionGateName: PRODUCTION_GATE_NAME,
    productionGateEnabled: gateEnabled,
    humanAuthorized: Boolean(humanAuthorized),
    productionStartPermitted,
    blockers,
    paths: Object.values(PRODUCTION_PATHS),
    humanCheckpoints: HUMAN_CHECKPOINTS,
    stopsBefore: [
      "DISTRIBUTION_SETUP",
      "RELEASE_LAUNCH",
      "ROYALTY_SETUP",
      "POST_RELEASE_MANAGEMENT"
    ]
  };

  const completedAt = normalizeString(input.completedAt) || new Date().toISOString();
  const taskTemplates = buildTaskTemplates();
  const taskPayloads = buildProductionTaskPayloads(input, readiness);
  const internalNotification = buildInternalNotification(input, readiness);
  const actionDescription = [
    `Milestone 7 production readiness for intake ${intakeReferenceCode}.`,
    `Existing active Opportunity ${opportunityId} used; no duplicate Opportunity created.`,
    `Selected package ${selectedPackageCode || "missing"}.`,
    `Production start permitted ${productionStartPermitted ? "yes" : "no"}.`,
    blockers.length ? `Blockers ${blockers.join(", ")}.` : "No readiness blockers.",
    "No Flow D activation, distribution setup, release launch, royalty setup, post-release management, payment link, invoice, contract send, author email, QBO logic, manuscript text, prompt body, raw model output, or secrets stored."
  ].join(" ");

  return {
    ok: true,
    readiness,
    taskTemplates,
    taskPayloads,
    internalNotification,
    payloads: {
      executionLogEntitySet: EXECUTION_LOG_ENTITY_SET,
      executionLogPayload: {
        jm1_name: `M7-PRODUCTION-READINESS-${diagnosticId}`,
        jm1_actiondescription: actionDescription.slice(0, 1000),
        jm1_actiontype: EVENT_TYPE,
        jm1_agentname: AGENT_NAME,
        jm1_agentmodel: "milestone-7-production-readiness",
        jm1_bandlevel: BAND_LEVEL.BAND_1,
        jm1_executionstatus: EXECUTION_STATUS.SUCCESS,
        jm1_startedon: completedAt,
        jm1_completedon: completedAt,
        jm1_sourceentity: SOURCE_ENTITY,
        jm1_sourcerecordid: diagnosticId
      }
    },
    liveActions: {
      createsProductionTasks: false,
      startsProductionWork: false,
      activatesFlowD: false,
      assignsIsbn: false,
      startsEditing: false,
      startsLayout: false,
      startsCoverDesign: false,
      startsDistribution: false,
      startsRelease: false,
      startsRoyaltySetup: false,
      sendsAuthorEmail: false,
      sendsContract: false,
      createsPaymentLink: false,
      createsInvoice: false,
      chargesCard: false,
      createsDuplicateOpportunity: false,
      usesQboForNewLogic: false
    }
  };
}

module.exports = {
  buildMilestone7ProductionReadiness,
  buildTaskTemplates,
  buildProductionTaskPayloads,
  PRODUCTION_GATE_NAME,
  PRODUCTION_PATHS,
  HUMAN_CHECKPOINTS,
  TASK_TEMPLATES,
  INTERNAL_VISIBILITY_MAILBOX,
  EXECUTION_LOG_ENTITY_SET,
  PRODUCTION_TASK_ENTITY_SET,
  EVENT_TYPE,
  SAFE_INPUT_FIELDS,
  FORBIDDEN_FIELDS
};
