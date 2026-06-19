"use strict";

/**
 * Governed Milestone #6 live-business completion payload builder.
 *
 * This module prepares safe Dataverse payloads for agreement/onboarding
 * readiness only. It does not send author email, create payment links, create
 * invoices, send contracts, activate Flow D, create Opportunities, or start
 * production.
 */

const {
  PACKAGE_CODES,
  MILESTONE6_DATAVERSE_TARGETS,
  buildMilestone6BusinessSourceReadiness
} = require("./milestone6BusinessSourceLayer");
const { DIAGNOSTIC_ID_PATTERN, INTAKE_REFERENCE_PATTERN } = require("../queue/diagnosticQueueSelector");
const {
  AGENT_NAME,
  BAND_LEVEL,
  EXECUTION_STATUS,
  SOURCE_ENTITY
} = require("../dataverse/metadataWriter");

const INTERNAL_VISIBILITY_MAILBOX = "publishing@jmerrill.one";
const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const MILESTONE6_EVENT_TYPE = "MILESTONE_6_AGREEMENT_ONBOARDING_READY";

const STATUS = Object.freeze({
  packageRecommended: "PACKAGE_RECOMMENDED",
  packageSelectionPending: "PACKAGE_SELECTION_PENDING",
  packageSelected: "PACKAGE_SELECTED",
  stripeMappingConfirmed: "STRIPE_MAPPING_CONFIRMED",
  paymentOptionsPendingSelection: "PAYMENT_OPTIONS_PENDING_AUTHOR_SELECTION",
  paymentOptionsReady: "PAYMENT_OPTIONS_READY_AFTER_PACKAGE_SELECTION",
  agreementReady: "AGREEMENT_PREPARATION_READY",
  onboardingReady: "ONBOARDING_READY",
  opportunityUpdated: "OPPORTUNITY_UPDATED_MILESTONE_6",
  businessHandoffReady: "BUSINESS_HANDOFF_READY"
});

const SAFE_INPUT_FIELDS = Object.freeze([
  "diagnosticId",
  "intakeReferenceCode",
  "diagnosticPackage",
  "opportunity",
  "project",
  "author",
  "childrenProject",
  "authorProvidesArt",
  "authorSelectedPackageCode",
  "stripeMappings",
  "metadata",
  "completedAt"
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
  "startProduction",
  "productionStarted",
  "assignIsbn",
  "isbn",
  "activateFlowD",
  "flowDTrigger",
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
    code: "MILESTONE_6_COMPLETION_BLOCKED",
    reason,
    diagnosticId: normalizeString(input?.diagnosticId) || null,
    intakeReferenceCode: normalizeString(input?.intakeReferenceCode) || null
  };
}

function buildMilestone6InternalNotification(readiness) {
  return {
    type: MILESTONE6_EVENT_TYPE,
    to: INTERNAL_VISIBILITY_MAILBOX,
    cc: [],
    bcc: [],
    subject: `Milestone 6 ready: ${readiness.intakeReferenceCode}`,
    safePreview: [
      `Milestone 6 agreement/onboarding readiness is prepared for ${readiness.intakeReferenceCode}.`,
      `Opportunity ${readiness.opportunityId} will be updated, not duplicated.`,
      `Recommended package ${readiness.primaryPackage.code}.`,
      readiness.alternatePackage ? `Alternate package ${readiness.alternatePackage.code}.` : "No lower alternate package.",
      `Package selection status ${readiness.packageSelectionStatus}.`,
      "No payment link, invoice, contract, Flow D activation, production automation, ISBN assignment, manuscript text, prompt body, raw model output, or secrets are included."
    ].join(" ")
  };
}

function buildMilestone6CompletionPayloads(input = {}) {
  if (!isPlainObject(input)) return safeFailure("INVALID_MILESTONE_6_COMPLETION_INPUT");
  if (!hasOnlySafeTopLevelFields(input) || hasForbiddenFieldDeep(input)) {
    return safeFailure("UNSAFE_FIELD_PRESENT", input);
  }

  const diagnosticId = normalizeString(input.diagnosticId);
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode);
  if (!diagnosticId || !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) return safeFailure("DIAGNOSTIC_ID_INVALID", input);
  if (!intakeReferenceCode || !INTAKE_REFERENCE_PATTERN.test(intakeReferenceCode)) return safeFailure("INTAKE_REFERENCE_CODE_INVALID", input);

  const { completedAt: _completedAt, ...readinessInput } = input;
  const readinessResult = buildMilestone6BusinessSourceReadiness(readinessInput);
  if (!readinessResult.ok) return readinessResult;

  const readiness = readinessResult.readiness;
  const hasAuthorSelection = readiness.packageSelectionStatus === STATUS.packageSelected;
  const opportunityPayload = {
    jm1pub_packagerecommended: readiness.primaryPackage.code,
    [MILESTONE6_DATAVERSE_TARGETS.packageSelectionStatus.logicalName]: hasAuthorSelection
      ? STATUS.packageSelected
      : STATUS.packageSelectionPending,
    [MILESTONE6_DATAVERSE_TARGETS.stripeProductMappingStatus.logicalName]: STATUS.stripeMappingConfirmed,
    [MILESTONE6_DATAVERSE_TARGETS.stripePriceMappingStatus.logicalName]: STATUS.stripeMappingConfirmed,
    [MILESTONE6_DATAVERSE_TARGETS.paymentOptionPreparationStatus.logicalName]: hasAuthorSelection
      ? STATUS.paymentOptionsReady
      : STATUS.paymentOptionsPendingSelection,
    [MILESTONE6_DATAVERSE_TARGETS.agreementPreparationStatus.logicalName]: STATUS.agreementReady,
    [MILESTONE6_DATAVERSE_TARGETS.onboardingStatus.logicalName]: STATUS.onboardingReady,
    [MILESTONE6_DATAVERSE_TARGETS.opportunityUpdateStatus.logicalName]: STATUS.opportunityUpdated,
    [MILESTONE6_DATAVERSE_TARGETS.businessCentralSalesEnterpriseHandoffStatus.logicalName]: STATUS.businessHandoffReady
  };

  if (hasAuthorSelection) {
    opportunityPayload[MILESTONE6_DATAVERSE_TARGETS.authorSelectedPackage.logicalName] = readiness.authorSelectedPackage.code;
  }

  const diagnosticPayload = {
    [MILESTONE6_DATAVERSE_TARGETS.alternatePackage.logicalName]: readiness.alternatePackage
      ? readiness.alternatePackage.code
      : null
  };

  const completedAt = normalizeString(input.completedAt) || new Date().toISOString();
  const internalNotification = buildMilestone6InternalNotification(readiness);
  const selectedPackageSummary = hasAuthorSelection
    ? `Author selected package ${readiness.authorSelectedPackage.code}.`
    : "Author package selection pending; payment options are not sent.";
  const actionDescription = [
    `Milestone 6 agreement/onboarding readiness for intake ${intakeReferenceCode}.`,
    `Existing active Opportunity ${readiness.opportunityId} used; no duplicate Opportunity created.`,
    `Recommended package ${readiness.primaryPackage.code}.`,
    readiness.alternatePackage ? `Alternate package ${readiness.alternatePackage.code}.` : "No alternate package.",
    selectedPackageSummary,
    "Stripe Product/Price mapping confirmed for governed package catalog.",
    `Internal visibility prepared for ${INTERNAL_VISIBILITY_MAILBOX}.`,
    "No payment link, invoice, contract, author email, Flow D activation, production automation, ISBN assignment, QBO logic, manuscript text, prompt body, raw model output, or secrets stored."
  ].join(" ");

  return {
    ok: true,
    diagnosticId,
    intakeReferenceCode,
    opportunityId: readiness.opportunityId,
    payloads: {
      opportunityEntitySet: "opportunities",
      opportunityId: readiness.opportunityId,
      opportunityPayload,
      diagnosticEntitySet: "jm1pub_editorialdiagnostics",
      diagnosticId,
      diagnosticPayload,
      executionLogEntitySet: EXECUTION_LOG_ENTITY_SET,
      executionLogPayload: {
        jm1_name: `M6-AGREEMENT-ONBOARDING-${diagnosticId}`,
        jm1_actiondescription: actionDescription.slice(0, 1000),
        jm1_actiontype: MILESTONE6_EVENT_TYPE,
        jm1_agentname: AGENT_NAME,
        jm1_agentmodel: "milestone-6-agreement-onboarding-readiness",
        jm1_bandlevel: BAND_LEVEL.BAND_1,
        jm1_executionstatus: EXECUTION_STATUS.SUCCESS,
        jm1_startedon: completedAt,
        jm1_completedon: completedAt,
        jm1_sourceentity: SOURCE_ENTITY,
        jm1_sourcerecordid: diagnosticId
      }
    },
    internalNotification,
    liveActions: {
      sendsAuthorEmail: false,
      sendsInternalNotification: false,
      createsPaymentLink: false,
      createsCheckoutSession: false,
      sendsInvoice: false,
      sendsContract: false,
      requestsPayment: false,
      createsOpportunity: false,
      createsDuplicateOpportunity: false,
      activatesFlowD: false,
      startsProduction: false,
      assignsIsbn: false,
      usesQboForNewLogic: false
    },
    statuses: {
      packageRecommendation: STATUS.packageRecommended,
      packageSelection: hasAuthorSelection ? STATUS.packageSelected : STATUS.packageSelectionPending,
      stripeProductMapping: STATUS.stripeMappingConfirmed,
      stripePriceMapping: STATUS.stripeMappingConfirmed,
      paymentOptions: hasAuthorSelection ? STATUS.paymentOptionsReady : STATUS.paymentOptionsPendingSelection,
      agreementPreparation: STATUS.agreementReady,
      onboarding: STATUS.onboardingReady,
      opportunityUpdate: STATUS.opportunityUpdated,
      businessHandoff: STATUS.businessHandoffReady,
      internalNotification: "PREPARED_FOR_INTERNAL_VISIBILITY"
    }
  };
}

module.exports = {
  buildMilestone6CompletionPayloads,
  INTERNAL_VISIBILITY_MAILBOX,
  EXECUTION_LOG_ENTITY_SET,
  MILESTONE6_EVENT_TYPE,
  STATUS,
  SAFE_INPUT_FIELDS,
  FORBIDDEN_FIELDS
};
