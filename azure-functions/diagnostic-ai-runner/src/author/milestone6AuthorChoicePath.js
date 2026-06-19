"use strict";

/**
 * Milestone #6B author package-selection and payment-path model.
 *
 * This module handles author response branches after the editorial/package
 * recommendation email. It prepares safe Dataverse payloads and internal
 * notification payloads only; it does not create payment links, invoices,
 * contracts, customers, charges, Flow D runs, Opportunities, or production
 * work.
 */

const {
  PACKAGE_CODES,
  PACKAGE_CATALOG,
  STRIPE_PACKAGE_MAPPINGS,
  MILESTONE6_DATAVERSE_TARGETS,
  PROCESSING_FEE_RATE,
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
const EVENT_TYPE = "MILESTONE_6B_AUTHOR_CHOICE_PATH_READY";

const AUTHOR_CHOICE_TYPES = Object.freeze({
  SELECT_SUGGESTED_PACKAGE: "SELECT_SUGGESTED_PACKAGE",
  SELECT_ALTERNATE_PACKAGE: "SELECT_ALTERNATE_PACKAGE",
  REQUEST_MEETING: "REQUEST_MEETING",
  REQUEST_PAYMENT_OPTIONS: "REQUEST_PAYMENT_OPTIONS",
  CUSTOM_QUOTE_REQUIRED: "CUSTOM_QUOTE_REQUIRED",
  DECLINE_OR_PAUSE: "DECLINE_OR_PAUSE",
  NO_RESPONSE: "NO_RESPONSE"
});

const STATUS = Object.freeze({
  packageSelected: "PACKAGE_SELECTED",
  packageSelectionPending: "PACKAGE_SELECTION_PENDING",
  packageSelectionHold: "PACKAGE_SELECTION_HOLD",
  packageSelectionNoResponse: "PACKAGE_SELECTION_NO_RESPONSE",
  paymentOptionsPrepared: "PAYMENT_OPTIONS_PREPARED_AFTER_PACKAGE_SELECTION",
  paymentOptionsPendingSelection: "PAYMENT_OPTIONS_PENDING_AUTHOR_SELECTION",
  paymentOptionsBlockedHumanQuote: "PAYMENT_OPTIONS_BLOCKED_HUMAN_QUOTE_REQUIRED",
  paymentOptionsBlockedHold: "PAYMENT_OPTIONS_BLOCKED_AUTHOR_HOLD",
  agreementReady: "AGREEMENT_PREPARATION_READY",
  agreementPendingSelection: "AGREEMENT_PREPARATION_PENDING_PACKAGE_SELECTION",
  agreementBlockedHumanQuote: "AGREEMENT_PREPARATION_BLOCKED_HUMAN_QUOTE_REQUIRED",
  agreementHold: "AGREEMENT_PREPARATION_HOLD",
  onboardingReady: "ONBOARDING_READY",
  onboardingPendingSelection: "ONBOARDING_PENDING_PACKAGE_SELECTION",
  onboardingBlockedHumanQuote: "ONBOARDING_BLOCKED_HUMAN_QUOTE_REQUIRED",
  onboardingHold: "ONBOARDING_HOLD",
  opportunityUpdated: "OPPORTUNITY_UPDATED_MILESTONE_6B",
  businessHandoffReady: "BUSINESS_HANDOFF_READY",
  businessHandoffPendingMeeting: "BUSINESS_HANDOFF_PENDING_MEETING",
  businessHandoffHumanQuote: "BUSINESS_HANDOFF_HUMAN_QUOTE_REVIEW",
  businessHandoffHold: "BUSINESS_HANDOFF_HOLD",
  followUpMeetingRequested: "FOLLOW_UP_MEETING_REQUESTED",
  followUpNoResponse: "FOLLOW_UP_NO_RESPONSE"
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
  "authorChoiceType",
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
    code: "MILESTONE_6B_AUTHOR_CHOICE_BLOCKED",
    reason,
    diagnosticId: normalizeString(input?.diagnosticId) || null,
    intakeReferenceCode: normalizeString(input?.intakeReferenceCode) || null
  };
}

function normalizeChoiceType(value) {
  const normalized = normalizeString(value).toUpperCase();
  return Object.values(AUTHOR_CHOICE_TYPES).includes(normalized) ? normalized : "";
}

function normalizePackageCode(value) {
  const normalized = normalizeString(value).toUpperCase();
  return PACKAGE_CATALOG[normalized] ? normalized : "";
}

function cents(valueUsd) {
  return Math.round(valueUsd * 100);
}

function buildPaymentOptionData(packageCode) {
  const selectedPackage = PACKAGE_CATALOG[packageCode];
  const stripeMapping = STRIPE_PACKAGE_MAPPINGS[packageCode];
  if (!selectedPackage || !stripeMapping) return [];

  return [
    { code: "SINGLE_PAYMENT", payments: 1, minimumPackageTotalUsd: 0 },
    { code: "TWO_PAYMENTS", payments: 2, minimumPackageTotalUsd: 0 },
    { code: "FOUR_PAYMENTS", payments: 4, minimumPackageTotalUsd: 0 },
    { code: "EIGHT_PAYMENTS", payments: 8, minimumPackageTotalUsd: 1000 },
    { code: "TWELVE_PAYMENTS", payments: 12, minimumPackageTotalUsd: 2000 }
  ]
    .filter((option) => selectedPackage.costUsd >= option.minimumPackageTotalUsd)
    .map((option) => {
      const baseInstallmentCents = Math.round(cents(selectedPackage.costUsd) / option.payments);
      const processingFeeCents = Math.round(baseInstallmentCents * PROCESSING_FEE_RATE);
      return Object.freeze({
        code: option.code,
        payments: option.payments,
        selectedPackageCode: packageCode,
        packageCostUsd: selectedPackage.costUsd,
        stripeProductId: stripeMapping.productId,
        stripePriceId: stripeMapping.priceId,
        currency: stripeMapping.currency,
        processingFeeRate: PROCESSING_FEE_RATE,
        baseInstallmentCents,
        processingFeeCents,
        estimatedInstallmentTotalCents: baseInstallmentCents + processingFeeCents,
        taxCalculated: false,
        stripePaymentLinkCreated: false,
        checkoutSessionCreated: false,
        invoiceCreated: false,
        customerCreated: false,
        subscriptionCreated: false,
        chargeCreated: false
      });
    });
}

function resolveSelectedPackageCode(choiceType, readiness, explicitPackageCode) {
  if (choiceType === AUTHOR_CHOICE_TYPES.SELECT_SUGGESTED_PACKAGE) return readiness.primaryPackage.code;
  if (choiceType === AUTHOR_CHOICE_TYPES.SELECT_ALTERNATE_PACKAGE) return readiness.alternatePackage?.code || "";
  if (choiceType === AUTHOR_CHOICE_TYPES.REQUEST_PAYMENT_OPTIONS) return normalizePackageCode(explicitPackageCode);
  return "";
}

function buildInternalNotification(input, branch, selectedPackageCode) {
  const needsNotification = [
    AUTHOR_CHOICE_TYPES.REQUEST_MEETING,
    AUTHOR_CHOICE_TYPES.CUSTOM_QUOTE_REQUIRED,
    AUTHOR_CHOICE_TYPES.DECLINE_OR_PAUSE,
    AUTHOR_CHOICE_TYPES.NO_RESPONSE
  ].includes(branch.choiceType);

  return {
    prepared: needsNotification,
    type: needsNotification ? EVENT_TYPE : null,
    to: needsNotification ? INTERNAL_VISIBILITY_MAILBOX : null,
    cc: [],
    bcc: [],
    subject: needsNotification ? `Milestone 6B author path: ${input.intakeReferenceCode}` : null,
    safePreview: needsNotification
      ? [
          `Milestone 6B author path ${branch.choiceType} for ${input.intakeReferenceCode}.`,
          selectedPackageCode ? `Selected package ${selectedPackageCode}.` : "Package selection pending.",
          `Next status ${branch.packageSelectionStatus}.`,
          "No payment link, invoice, contract, Flow D activation, production automation, ISBN assignment, manuscript text, prompt body, raw model output, or secrets are included."
        ].join(" ")
      : null
  };
}

function buildMilestone6AuthorChoicePath(input = {}) {
  if (!isPlainObject(input)) return safeFailure("INVALID_MILESTONE_6B_INPUT");
  if (!hasOnlySafeTopLevelFields(input) || hasForbiddenFieldDeep(input)) return safeFailure("UNSAFE_FIELD_PRESENT", input);

  const diagnosticId = normalizeString(input.diagnosticId);
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode);
  if (!diagnosticId || !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) return safeFailure("DIAGNOSTIC_ID_INVALID", input);
  if (!intakeReferenceCode || !INTAKE_REFERENCE_PATTERN.test(intakeReferenceCode)) return safeFailure("INTAKE_REFERENCE_CODE_INVALID", input);

  const choiceType = normalizeChoiceType(input.authorChoiceType);
  if (!choiceType) return safeFailure("AUTHOR_CHOICE_TYPE_INVALID", input);

  const { completedAt: _completedAt, authorChoiceType: _authorChoiceType, ...readinessInput } = input;
  const readinessResult = buildMilestone6BusinessSourceReadiness({
    ...readinessInput,
    authorSelectedPackageCode: undefined
  });
  if (!readinessResult.ok) return readinessResult;

  const readiness = readinessResult.readiness;
  const selectedPackageCode = resolveSelectedPackageCode(choiceType, readiness, input.authorSelectedPackageCode);
  const stripeMapping = selectedPackageCode ? STRIPE_PACKAGE_MAPPINGS[selectedPackageCode] : null;
  const selectedPackageValid = !selectedPackageCode || Boolean(PACKAGE_CATALOG[selectedPackageCode] && stripeMapping);

  if ([
    AUTHOR_CHOICE_TYPES.SELECT_SUGGESTED_PACKAGE,
    AUTHOR_CHOICE_TYPES.SELECT_ALTERNATE_PACKAGE
  ].includes(choiceType) && !selectedPackageCode) {
    return safeFailure("SELECTED_PACKAGE_UNAVAILABLE", input);
  }
  if (choiceType === AUTHOR_CHOICE_TYPES.REQUEST_PAYMENT_OPTIONS && !selectedPackageCode) {
    return safeFailure("PAYMENT_OPTIONS_REQUIRE_PACKAGE_SELECTION", input);
  }
  if (!selectedPackageValid) return safeFailure("SELECTED_PACKAGE_MAPPING_INVALID", input);

  const branch = {
    choiceType,
    packageSelectionStatus: STATUS.packageSelectionPending,
    paymentOptionPreparationStatus: STATUS.paymentOptionsPendingSelection,
    agreementPreparationStatus: STATUS.agreementPendingSelection,
    onboardingStatus: STATUS.onboardingPendingSelection,
    businessHandoffStatus: STATUS.businessHandoffPendingMeeting,
    meetingOrFollowUpStatus: null,
    customQuoteReviewRequired: false,
    paymentOptionsAllowed: false
  };

  if ([
    AUTHOR_CHOICE_TYPES.SELECT_SUGGESTED_PACKAGE,
    AUTHOR_CHOICE_TYPES.SELECT_ALTERNATE_PACKAGE,
    AUTHOR_CHOICE_TYPES.REQUEST_PAYMENT_OPTIONS
  ].includes(choiceType)) {
    branch.packageSelectionStatus = STATUS.packageSelected;
    branch.paymentOptionPreparationStatus = STATUS.paymentOptionsPrepared;
    branch.agreementPreparationStatus = STATUS.agreementReady;
    branch.onboardingStatus = STATUS.onboardingReady;
    branch.businessHandoffStatus = STATUS.businessHandoffReady;
    branch.paymentOptionsAllowed = true;
  }
  if (choiceType === AUTHOR_CHOICE_TYPES.REQUEST_MEETING) {
    branch.meetingOrFollowUpStatus = STATUS.followUpMeetingRequested;
  }
  if (choiceType === AUTHOR_CHOICE_TYPES.CUSTOM_QUOTE_REQUIRED) {
    branch.packageSelectionStatus = STATUS.packageSelectionPending;
    branch.paymentOptionPreparationStatus = STATUS.paymentOptionsBlockedHumanQuote;
    branch.agreementPreparationStatus = STATUS.agreementBlockedHumanQuote;
    branch.onboardingStatus = STATUS.onboardingBlockedHumanQuote;
    branch.businessHandoffStatus = STATUS.businessHandoffHumanQuote;
    branch.customQuoteReviewRequired = true;
  }
  if (choiceType === AUTHOR_CHOICE_TYPES.DECLINE_OR_PAUSE) {
    branch.packageSelectionStatus = STATUS.packageSelectionHold;
    branch.paymentOptionPreparationStatus = STATUS.paymentOptionsBlockedHold;
    branch.agreementPreparationStatus = STATUS.agreementHold;
    branch.onboardingStatus = STATUS.onboardingHold;
    branch.businessHandoffStatus = STATUS.businessHandoffHold;
  }
  if (choiceType === AUTHOR_CHOICE_TYPES.NO_RESPONSE) {
    branch.packageSelectionStatus = STATUS.packageSelectionNoResponse;
    branch.meetingOrFollowUpStatus = STATUS.followUpNoResponse;
  }

  const opportunityPayload = {
    [MILESTONE6_DATAVERSE_TARGETS.packageSelectionStatus.logicalName]: branch.packageSelectionStatus,
    [MILESTONE6_DATAVERSE_TARGETS.paymentOptionPreparationStatus.logicalName]: branch.paymentOptionPreparationStatus,
    [MILESTONE6_DATAVERSE_TARGETS.agreementPreparationStatus.logicalName]: branch.agreementPreparationStatus,
    [MILESTONE6_DATAVERSE_TARGETS.onboardingStatus.logicalName]: branch.onboardingStatus,
    [MILESTONE6_DATAVERSE_TARGETS.opportunityUpdateStatus.logicalName]: STATUS.opportunityUpdated,
    [MILESTONE6_DATAVERSE_TARGETS.businessCentralSalesEnterpriseHandoffStatus.logicalName]: branch.businessHandoffStatus
  };

  if (selectedPackageCode) {
    opportunityPayload[MILESTONE6_DATAVERSE_TARGETS.authorSelectedPackage.logicalName] = selectedPackageCode;
    opportunityPayload[MILESTONE6_DATAVERSE_TARGETS.stripeProductMappingStatus.logicalName] = "STRIPE_MAPPING_CONFIRMED";
    opportunityPayload[MILESTONE6_DATAVERSE_TARGETS.stripePriceMappingStatus.logicalName] = "STRIPE_MAPPING_CONFIRMED";
  }

  const paymentOptions = branch.paymentOptionsAllowed ? buildPaymentOptionData(selectedPackageCode) : [];
  const completedAt = normalizeString(input.completedAt) || new Date().toISOString();
  const internalNotification = buildInternalNotification(input, branch, selectedPackageCode);
  const actionDescription = [
    `Milestone 6B author choice ${choiceType} for intake ${intakeReferenceCode}.`,
    `Existing active Opportunity ${readiness.opportunityId} used; no duplicate Opportunity created.`,
    selectedPackageCode ? `Selected package ${selectedPackageCode}.` : "Package selection pending.",
    `Payment option status ${branch.paymentOptionPreparationStatus}.`,
    internalNotification.prepared ? `Internal visibility prepared for ${INTERNAL_VISIBILITY_MAILBOX}.` : "Internal notification not required for selected-package path.",
    "No payment link, checkout session, invoice, customer, subscription, charge, contract, author email, Flow D activation, production automation, ISBN assignment, QBO logic, tax calculation, manuscript text, prompt body, raw model output, or secrets stored."
  ].join(" ");

  return {
    ok: true,
    diagnosticId,
    intakeReferenceCode,
    opportunityId: readiness.opportunityId,
    branch,
    selectedPackage: selectedPackageCode ? PACKAGE_CATALOG[selectedPackageCode] : null,
    paymentOptions,
    internalNotification,
    payloads: {
      opportunityEntitySet: "opportunities",
      opportunityId: readiness.opportunityId,
      opportunityPayload,
      executionLogEntitySet: EXECUTION_LOG_ENTITY_SET,
      executionLogPayload: {
        jm1_name: `M6B-AUTHOR-CHOICE-${diagnosticId}`,
        jm1_actiondescription: actionDescription.slice(0, 1000),
        jm1_actiontype: EVENT_TYPE,
        jm1_agentname: AGENT_NAME,
        jm1_agentmodel: "milestone-6b-author-choice-path",
        jm1_bandlevel: BAND_LEVEL.BAND_1,
        jm1_executionstatus: EXECUTION_STATUS.SUCCESS,
        jm1_startedon: completedAt,
        jm1_completedon: completedAt,
        jm1_sourceentity: SOURCE_ENTITY,
        jm1_sourcerecordid: diagnosticId
      }
    },
    liveActions: {
      sendsAuthorEmail: false,
      sendsInternalNotification: false,
      createsPaymentLink: false,
      createsCheckoutSession: false,
      createsInvoice: false,
      createsCustomer: false,
      createsSubscription: false,
      chargesCard: false,
      sendsContract: false,
      requestsPayment: false,
      createsOpportunity: false,
      createsDuplicateOpportunity: false,
      activatesFlowD: false,
      startsProduction: false,
      assignsIsbn: false,
      usesQboForNewLogic: false,
      calculatesTax: false
    }
  };
}

module.exports = {
  buildMilestone6AuthorChoicePath,
  buildPaymentOptionData,
  AUTHOR_CHOICE_TYPES,
  STATUS,
  INTERNAL_VISIBILITY_MAILBOX,
  EVENT_TYPE,
  SAFE_INPUT_FIELDS,
  FORBIDDEN_FIELDS
};
