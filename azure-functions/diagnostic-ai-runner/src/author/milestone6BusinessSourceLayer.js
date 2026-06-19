"use strict";

/**
 * Governed Milestone #6 business-source layer.
 *
 * This module defines package recommendation, Opportunity update, Stripe
 * mapping, agreement, and onboarding readiness rules only. It does not send
 * email, create Stripe links, send invoices, send contracts, create duplicate
 * Opportunities, activate Flow D, run diagnostics, or start production.
 */

const { DIAGNOSTIC_ID_PATTERN, INTAKE_REFERENCE_PATTERN } = require("../queue/diagnosticQueueSelector");

const INTERNAL_VISIBILITY_MAILBOX = "publishing@jmerrill.one";

const PACKAGE_CODES = Object.freeze({
  STARTER: "JMP-PKG-STARTER",
  PROFESSIONAL: "JMP-PKG-PRO",
  SIGNATURE: "JMP-PKG-SIGNATURE",
  CHILD: "JMP-PKG-CHILD"
});

const PACKAGE_CATALOG = Object.freeze({
  [PACKAGE_CODES.STARTER]: Object.freeze({
    code: PACKAGE_CODES.STARTER,
    name: "Starter Publishing Package",
    costUsd: 1999
  }),
  [PACKAGE_CODES.PROFESSIONAL]: Object.freeze({
    code: PACKAGE_CODES.PROFESSIONAL,
    name: "Professional Publishing Package",
    costUsd: 4500
  }),
  [PACKAGE_CODES.SIGNATURE]: Object.freeze({
    code: PACKAGE_CODES.SIGNATURE,
    name: "Signature Publishing Partnership",
    costUsd: 7500
  }),
  [PACKAGE_CODES.CHILD]: Object.freeze({
    code: PACKAGE_CODES.CHILD,
    name: "Children's Package, author provides art",
    costUsd: 2495
  })
});

const STRIPE_PACKAGE_MAPPINGS = Object.freeze({
  [PACKAGE_CODES.STARTER]: Object.freeze({
    productId: "prod_URbgo7mwC7qr6t",
    priceId: "price_1TSiTaJCiOVFpgYufee7GLQs",
    currency: "usd",
    unitAmount: 199900,
    priceType: "one_time",
    livemode: true
  }),
  [PACKAGE_CODES.PROFESSIONAL]: Object.freeze({
    productId: "prod_UjRnnUiTQgHlrm",
    priceId: "price_1TjyuZJCiOVFpgYur0FWmcj7",
    currency: "usd",
    unitAmount: 450000,
    priceType: "one_time",
    livemode: true
  }),
  [PACKAGE_CODES.SIGNATURE]: Object.freeze({
    productId: "prod_UjRnIBF5yKgkFr",
    priceId: "price_1TjyuaJCiOVFpgYu8FKjWqIL",
    currency: "usd",
    unitAmount: 750000,
    priceType: "one_time",
    livemode: true
  }),
  [PACKAGE_CODES.CHILD]: Object.freeze({
    productId: "prod_UjRnLS7vXkbdEh",
    priceId: "price_1TjyuaJCiOVFpgYuGJo5Ocwl",
    currency: "usd",
    unitAmount: 249500,
    priceType: "one_time",
    livemode: true
  })
});

const PACKAGE_RECOMMENDATION_SOURCE = Object.freeze({
  tableLogicalName: "jm1pub_editorialdiagnostic",
  entitySet: "jm1pub_editorialdiagnostics",
  recommendedPackageField: "jm1pub_recommendedpackage",
  packageOverrideField: "jm1pub_packageoverride",
  packageOverrideReasonField: "jm1pub_packageoverridereason",
  packageRationaleField: "jm1pub_packagerationale",
  packageConfidenceField: "jm1pub_packageconfidence",
  offerRecommendedField: "jm1pub_offerrecommended"
});

const OPPORTUNITY_SOURCE = Object.freeze({
  tableLogicalName: "opportunity",
  entitySet: "opportunities",
  rowIdentity: "opportunityid",
  duplicateRule: "UPDATE_EXISTING_ACTIVE_OPPORTUNITY",
  fields: Object.freeze({
    name: "name",
    parentContact: "parentcontactid",
    description: "description",
    stepName: "stepname",
    statusCode: "statuscode",
    stateCode: "statecode",
    packageRecommended: "jm1pub_packagerecommended",
    contractStatus: "jm1pub_contractstatus",
    contractUrl: "jm1pub_contracturl",
    intakeTrackingId: "jm1pub_intaketrackingid",
    projectTitle: "jm1pub_projecttitle"
  })
});

const MILESTONE6_DATAVERSE_TARGETS = Object.freeze({
  alternatePackage: Object.freeze({
    target: "jm1pub_editorialdiagnostic",
    logicalName: "jm1_m6alternatepackagecode",
    status: "CONFIRMED_CREATED"
  }),
  authorSelectedPackage: Object.freeze({
    target: "opportunity",
    logicalName: "jm1_m6authorselectedpackagecode",
    status: "CONFIRMED_CREATED"
  }),
  packageSelectionStatus: Object.freeze({
    target: "opportunity",
    logicalName: "jm1_m6packageselectionstatus",
    status: "CONFIRMED_CREATED"
  }),
  stripeProductMappingStatus: Object.freeze({
    target: "opportunity",
    logicalName: "jm1_m6stripeproductmappingstatus",
    status: "CONFIRMED_CREATED"
  }),
  stripePriceMappingStatus: Object.freeze({
    target: "opportunity",
    logicalName: "jm1_m6stripepricemappingstatus",
    status: "CONFIRMED_CREATED"
  }),
  paymentOptionPreparationStatus: Object.freeze({
    target: "opportunity",
    logicalName: "jm1_m6paymentoptionpreparationstatus",
    status: "CONFIRMED_CREATED"
  }),
  agreementPreparationStatus: Object.freeze({
    target: "opportunity",
    logicalName: "jm1_m6agreementpreparationstatus",
    status: "CONFIRMED_CREATED"
  }),
  onboardingStatus: Object.freeze({
    target: "opportunity",
    logicalName: "jm1_m6onboardingstatus",
    status: "CONFIRMED_CREATED"
  }),
  opportunityUpdateStatus: Object.freeze({
    target: "opportunity",
    logicalName: "jm1_m6opportunityupdatestatus",
    status: "CONFIRMED_CREATED"
  }),
  businessCentralSalesEnterpriseHandoffStatus: Object.freeze({
    target: "opportunity",
    logicalName: "jm1_m6businesshandoffstatus",
    status: "CONFIRMED_CREATED"
  })
});

const PAYMENT_OPTIONS = Object.freeze([
  Object.freeze({ code: "SINGLE_PAYMENT", payments: 1, minimumPackageTotalUsd: 0 }),
  Object.freeze({ code: "TWO_PAYMENTS", payments: 2, minimumPackageTotalUsd: 0 }),
  Object.freeze({ code: "FOUR_PAYMENTS", payments: 4, minimumPackageTotalUsd: 0 }),
  Object.freeze({ code: "EIGHT_PAYMENTS", payments: 8, minimumPackageTotalUsd: 1000 }),
  Object.freeze({ code: "TWELVE_PAYMENTS", payments: 12, minimumPackageTotalUsd: 2000 })
]);

const PROCESSING_FEE_RATE = 0.04;

const GATES = Object.freeze({
  stripePaymentOptions: "JM1_STRIPE_PAYMENT_OPTIONS_ENABLED",
  authorPaymentLinkSend: "JM1_AUTHOR_PAYMENT_LINK_SEND_ENABLED",
  publishingOnboarding: "JM1_PUBLISHING_ONBOARDING_ENABLED",
  opportunityUpdate: "JM1_OPPORTUNITY_UPDATE_ENABLED",
  agreementPreparation: "JM1_AGREEMENT_PREPARATION_ENABLED"
});

const STAGE_1_BOUNDARY = Object.freeze({
  includesEditorialReview: true,
  includesPackageRecommendation: true,
  includesPaymentPlans: false,
  includesInstallmentBreakdowns: false,
  includesProcessingFees: false,
  includesTaxCalculations: false,
  includesStripeLinks: false,
  includesInvoiceMechanics: false,
  includesContractPressure: false
});

const BILLING_SOURCE_POLICY = Object.freeze({
  operationalTruth: "Dataverse",
  businessProcessLayer: "Business Central / Sales Enterprise",
  paymentExecution: "Stripe",
  qboStatus: "RETIRED_LEGACY",
  qboAllowedForNewLogic: false
});

const BLOCKING_STATUSES = Object.freeze({
  stripeMappingMissing: "STRIPE_PRODUCT_PRICE_MAPPING_REQUIRED",
  packageSelectionMissing: "AUTHOR_PACKAGE_SELECTION_REQUIRED_FOR_PAYMENT_OPTIONS"
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
  "contractSent",
  "contractUrlToSend",
  "paymentRequestSent",
  "startProduction",
  "productionStarted",
  "assignIsbn",
  "isbn",
  "activateFlowD",
  "flowDTrigger",
  "qboInvoiceId",
  "quickBooksInvoiceId",
  "headers",
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
    code: "MILESTONE_6_BUSINESS_SOURCE_BLOCKED",
    reason,
    diagnosticId: normalizeString(input?.diagnosticId) || null,
    intakeReferenceCode: normalizeString(input?.intakeReferenceCode) || null
  };
}

function packageExists(packageCode) {
  return Boolean(PACKAGE_CATALOG[normalizeString(packageCode)]);
}

function normalizePackageCode(packageCode) {
  const normalized = normalizeString(packageCode).toUpperCase();
  return packageExists(normalized) ? normalized : "";
}

function resolveAlternativePackage(primaryPackageCode) {
  const packageCode = normalizePackageCode(primaryPackageCode);
  if (packageCode === PACKAGE_CODES.STARTER) return null;
  if (packageCode === PACKAGE_CODES.PROFESSIONAL) return PACKAGE_CODES.STARTER;
  if (packageCode === PACKAGE_CODES.SIGNATURE) return PACKAGE_CODES.PROFESSIONAL;
  if (packageCode === PACKAGE_CODES.CHILD) return null;
  return null;
}

function resolveRecommendedPackage({ diagnosticPackage = {}, childrenProject = false, authorProvidesArt = false } = {}) {
  if (childrenProject === true) {
    if (authorProvidesArt === true) {
      return {
        ok: true,
        packageCode: PACKAGE_CODES.CHILD,
        humanQuoteRequired: false
      };
    }
    return {
      ok: false,
      reason: "CHILDRENS_PROJECT_NEEDS_HUMAN_ILLUSTRATION_QUOTE",
      humanQuoteRequired: true
    };
  }

  const overridePackage = normalizePackageCode(diagnosticPackage.packageOverride);
  const recommendedPackage = normalizePackageCode(diagnosticPackage.recommendedPackage);
  const packageCode = overridePackage || recommendedPackage;

  if (!packageCode) {
    return { ok: false, reason: "PACKAGE_RECOMMENDATION_MISSING" };
  }

  return {
    ok: true,
    packageCode,
    humanQuoteRequired: false,
    source: overridePackage ? PACKAGE_RECOMMENDATION_SOURCE.packageOverrideField : PACKAGE_RECOMMENDATION_SOURCE.recommendedPackageField
  };
}

function buildPaymentOptionPreview(packageCode) {
  const catalogItem = PACKAGE_CATALOG[normalizePackageCode(packageCode)];
  if (!catalogItem) return [];

  return PAYMENT_OPTIONS
    .filter((option) => catalogItem.costUsd >= option.minimumPackageTotalUsd)
    .map((option) => Object.freeze({
      code: option.code,
      payments: option.payments,
      processingFeeRate: PROCESSING_FEE_RATE,
      stripeLinkCreated: false,
      invoiceCreated: false,
      taxCalculated: false
    }));
}

function stripeMappingComplete(packageCode, stripeMappings = {}) {
  const packageMapping = isPlainObject(stripeMappings) ? stripeMappings[packageCode] : null;
  return Boolean(
    isPlainObject(packageMapping) &&
    normalizeString(packageMapping.productId) &&
    normalizeString(packageMapping.priceId) &&
    normalizeString(packageMapping.currency) === "usd" &&
    packageMapping.priceType === "one_time" &&
    packageMapping.livemode === true
  );
}

function buildMilestone6BusinessSourceReadiness(input = {}) {
  if (!isPlainObject(input)) {
    return safeFailure("INVALID_MILESTONE_6_INPUT");
  }
  if (!hasOnlySafeTopLevelFields(input) || hasForbiddenFieldDeep(input)) {
    return safeFailure("UNSAFE_FIELD_PRESENT", input);
  }

  const diagnosticId = normalizeString(input.diagnosticId);
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode);
  if (!diagnosticId || !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) {
    return safeFailure("DIAGNOSTIC_ID_INVALID", input);
  }
  if (!intakeReferenceCode || !INTAKE_REFERENCE_PATTERN.test(intakeReferenceCode)) {
    return safeFailure("INTAKE_REFERENCE_CODE_INVALID", input);
  }

  const opportunityId = normalizeString(input.opportunity?.opportunityId || input.opportunity?.id);
  if (!opportunityId) {
    return safeFailure("EXISTING_OPPORTUNITY_REQUIRED", input);
  }
  if (input.opportunity?.active !== true) {
    return safeFailure("ACTIVE_OPPORTUNITY_REQUIRED", input);
  }

  const recommendation = resolveRecommendedPackage({
    diagnosticPackage: input.diagnosticPackage,
    childrenProject: input.childrenProject,
    authorProvidesArt: input.authorProvidesArt
  });
  if (!recommendation.ok) {
    return safeFailure(recommendation.reason, input);
  }

  const primaryPackage = PACKAGE_CATALOG[recommendation.packageCode];
  const alternatePackageCode = resolveAlternativePackage(primaryPackage.code);
  const alternatePackage = alternatePackageCode ? PACKAGE_CATALOG[alternatePackageCode] : null;
  const authorSelectedPackageCode = normalizePackageCode(input.authorSelectedPackageCode);
  const packageSelectionStatus = authorSelectedPackageCode ? "PACKAGE_SELECTED" : "PACKAGE_SELECTION_PENDING";
  const selectedPackage = authorSelectedPackageCode ? PACKAGE_CATALOG[authorSelectedPackageCode] : null;
  const paymentOptionsAllowed = Boolean(selectedPackage);
  const stripeMappings = isPlainObject(input.stripeMappings) ? input.stripeMappings : STRIPE_PACKAGE_MAPPINGS;
  const stripeMappingStatus = selectedPackage && stripeMappingComplete(selectedPackage.code, stripeMappings)
    ? "STRIPE_MAPPING_CONFIRMED"
    : "STRIPE_MAPPING_REQUIRED";

  return {
    ok: true,
    readiness: {
      diagnosticId,
      intakeReferenceCode,
      packageRecommendationSource: PACKAGE_RECOMMENDATION_SOURCE,
      opportunitySource: OPPORTUNITY_SOURCE,
      opportunityUpdateBehavior: "UPDATE_EXISTING_ACTIVE_OPPORTUNITY_ONLY",
      opportunityId,
      primaryPackage,
      alternatePackage,
      authorSelectedPackage: selectedPackage,
      packageSelectionStatus,
      stage1Boundary: STAGE_1_BOUNDARY,
      paymentCommunicationTrigger: "ONLY_AFTER_PACKAGE_SELECTION_OR_PAYMENT_DETAILS_REQUEST",
      paymentOptionsPreparationStatus: paymentOptionsAllowed ? "PAYMENT_OPTIONS_PREPARABLE_AFTER_MAPPING" : "PAYMENT_OPTIONS_BLOCKED_UNTIL_PACKAGE_SELECTION",
      paymentOptionsPreview: paymentOptionsAllowed ? buildPaymentOptionPreview(selectedPackage.code) : [],
      stripeMappingStatus,
      stripeProductMappingStatus: stripeMappingStatus,
      stripePriceMappingStatus: stripeMappingStatus,
      stripePackageMappings: STRIPE_PACKAGE_MAPPINGS,
      taxHandlingStatus: "TAX_PENDING_ONBOARDING_ADDRESS_AND_GOVERNED_STRIPE_BC_SE_CONFIGURATION",
      billingSourcePolicy: BILLING_SOURCE_POLICY,
      agreementPreparationStatus: "AGREEMENT_PREPARATION_PENDING",
      onboardingStatus: "ONBOARDING_PENDING",
      opportunityUpdateStatus: "OPPORTUNITY_UPDATE_PREPARED",
      businessCentralSalesEnterpriseHandoffStatus: "BUSINESS_HANDOFF_PENDING_SCHEMA_CONFIRMATION",
      internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX,
      dataverseTargets: {
        confirmed: {
          packageRecommendation: PACKAGE_RECOMMENDATION_SOURCE,
          packageOverride: {
            tableLogicalName: PACKAGE_RECOMMENDATION_SOURCE.tableLogicalName,
            field: PACKAGE_RECOMMENDATION_SOURCE.packageOverrideField
          },
          opportunity: OPPORTUNITY_SOURCE,
          milestone6: MILESTONE6_DATAVERSE_TARGETS
        }
      },
      blockers: [
        ...(paymentOptionsAllowed && stripeMappingStatus !== "STRIPE_MAPPING_CONFIRMED"
          ? [BLOCKING_STATUSES.stripeMappingMissing]
          : []),
        ...(!paymentOptionsAllowed ? [BLOCKING_STATUSES.packageSelectionMissing] : [])
      ],
      liveActions: {
        sendsAuthorEmail: false,
        sendsPaymentOptionsInStage1: false,
        createsStripePaymentLink: false,
        sendsInvoice: false,
        sendsContract: false,
        requestsPayment: false,
        createsDuplicateOpportunity: false,
        startsProduction: false,
        activatesFlowD: false,
        assignsIsbn: false,
        usesQboForNewLogic: false
      }
    }
  };
}

module.exports = {
  PACKAGE_CODES,
  PACKAGE_CATALOG,
  STRIPE_PACKAGE_MAPPINGS,
  PACKAGE_RECOMMENDATION_SOURCE,
  OPPORTUNITY_SOURCE,
  MILESTONE6_DATAVERSE_TARGETS,
  PAYMENT_OPTIONS,
  PROCESSING_FEE_RATE,
  GATES,
  STAGE_1_BOUNDARY,
  BILLING_SOURCE_POLICY,
  BLOCKING_STATUSES,
  resolveAlternativePackage,
  resolveRecommendedPackage,
  buildPaymentOptionPreview,
  buildMilestone6BusinessSourceReadiness
};
