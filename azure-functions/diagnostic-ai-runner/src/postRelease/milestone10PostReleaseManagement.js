"use strict";

/**
 * Milestone #10 governed Post-Release Management model.
 *
 * This module prepares annual-review, loyalty-progression, metadata-audit,
 * internal-card, recognition-draft, task, and execution-log payloads only. It
 * does not issue invoices, process royalty payments, run public campaigns,
 * send author-facing recognition, change tax/accounting settings, or start
 * unmanaged post-release work.
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
const POST_RELEASE_TASK_ENTITY_SET = "jm1_publishingtasks";
const EVENT_TYPE = "MILESTONE_10_POST_RELEASE_MANAGEMENT_READINESS";

const GATES = Object.freeze({
  POST_RELEASE_MANAGEMENT: "JM1_POST_RELEASE_MANAGEMENT_ENABLED",
  ANNUAL_REVIEW: "JM1_ANNUAL_REVIEW_ENABLED",
  LOYALTY_PROGRESSION: "JM1_LOYALTY_PROGRESSION_ENABLED",
  ROYALTY_REPORTING: "JM1_ROYALTY_REPORTING_ENABLED",
  PUBLIC_MARKETING_FOLLOWUP: "JM1_PUBLIC_MARKETING_FOLLOWUP_ENABLED"
});

const LOYALTY_TIERS = Object.freeze({
  NONE: "NONE",
  LOYAL: "LOYAL",
  ESTABLISHED: "ESTABLISHED",
  LEGACY: "LEGACY"
});

const ANNUAL_REVIEW_STATUS = Object.freeze({
  OPEN: "OPEN",
  COMPLETE: "COMPLETE",
  LAPSED: "LAPSED"
});

const ANNUAL_FEE_BASIS = Object.freeze({
  STANDARD_R2_49: "STANDARD_R2_49",
  STARTER_GRANDFATHERED_30: "STARTER_GRANDFATHERED_30"
});

const TASK_PATHS = Object.freeze({
  ANNUAL_REVIEW_CYCLE: "ANNUAL_REVIEW_CYCLE",
  METADATA_AUDIT: "METADATA_AUDIT",
  ROYALTY_REPORTING_READINESS: "ROYALTY_REPORTING_READINESS",
  CATALOG_HEALTH_REVIEW: "CATALOG_HEALTH_REVIEW",
  AUTHOR_SUPPORT_REVIEW: "AUTHOR_SUPPORT_REVIEW",
  LOYALTY_PROGRESSION_REVIEW: "LOYALTY_PROGRESSION_REVIEW",
  BACKLIST_OPTIMIZATION_REVIEW: "BACKLIST_OPTIMIZATION_REVIEW",
  FUTURE_TITLE_OPPORTUNITY_REVIEW: "FUTURE_TITLE_OPPORTUNITY_REVIEW",
  MARKETING_FOLLOWUP_BOUNDARY_REVIEW: "MARKETING_FOLLOWUP_BOUNDARY_REVIEW",
  TAX_ACCOUNTING_STOP_REVIEW: "TAX_ACCOUNTING_STOP_REVIEW"
});

const HUMAN_CHECKPOINTS = Object.freeze([
  "ANNUAL_REVIEW_CYCLE_OPENED",
  "ANNUAL_FEE_BASIS_REVIEWED",
  "METADATA_AUDIT_ASSIGNED",
  "ROYALTY_REPORTING_READINESS_REVIEWED",
  "CATALOG_HEALTH_REVIEWED",
  "AUTHOR_SUPPORT_NEEDS_REVIEWED",
  "LOYALTY_TIER_PROGRESSION_REVIEWED",
  "SIGNATURE_CANDIDACY_REVIEWED",
  "RECOGNITION_DRAFT_REVIEWED",
  "BACKLIST_OPTIMIZATION_REVIEWED",
  "FUTURE_TITLE_OPPORTUNITY_REVIEWED",
  "TAX_ACCOUNTING_ACTION_STOP_CONFIRMED"
]);

const METADATA_AUDIT_CHECKLIST = Object.freeze([
  "DESCRIPTION_200_400_WORDS",
  "BISAC_SPECIFICITY",
  "TEN_KEYWORD_FIELDS",
  "CONTRIBUTORS_LISTED",
  "AUDIENCE_RANGE_SET",
  "AUTHOR_BIO_CURRENT",
  "BACK_COVER_COPY_CURRENT",
  "JMERRILL_PUB_LINKS_CURRENT"
]);

const TASK_TEMPLATES = Object.freeze([
  Object.freeze({ path: TASK_PATHS.ANNUAL_REVIEW_CYCLE, taskCode: "M10-ANNUAL-REVIEW", taskName: "Milestone 10 Annual Review Cycle", checkpoint: "ANNUAL_REVIEW_CYCLE_OPENED" }),
  Object.freeze({ path: TASK_PATHS.METADATA_AUDIT, taskCode: "M10-METADATA-AUDIT", taskName: "Milestone 10 Metadata Audit", checkpoint: "METADATA_AUDIT_ASSIGNED" }),
  Object.freeze({ path: TASK_PATHS.ROYALTY_REPORTING_READINESS, taskCode: "M10-ROYALTY-READINESS", taskName: "Milestone 10 Royalty Reporting Readiness", checkpoint: "ROYALTY_REPORTING_READINESS_REVIEWED" }),
  Object.freeze({ path: TASK_PATHS.CATALOG_HEALTH_REVIEW, taskCode: "M10-CATALOG-HEALTH", taskName: "Milestone 10 Catalog Health Review", checkpoint: "CATALOG_HEALTH_REVIEWED" }),
  Object.freeze({ path: TASK_PATHS.AUTHOR_SUPPORT_REVIEW, taskCode: "M10-AUTHOR-SUPPORT", taskName: "Milestone 10 Author Support Review", checkpoint: "AUTHOR_SUPPORT_NEEDS_REVIEWED" }),
  Object.freeze({ path: TASK_PATHS.LOYALTY_PROGRESSION_REVIEW, taskCode: "M10-LOYALTY-PROGRESSION", taskName: "Milestone 10 Loyalty Progression Review", checkpoint: "LOYALTY_TIER_PROGRESSION_REVIEWED" }),
  Object.freeze({ path: TASK_PATHS.BACKLIST_OPTIMIZATION_REVIEW, taskCode: "M10-BACKLIST-OPTIMIZATION", taskName: "Milestone 10 Backlist Optimization Review", checkpoint: "BACKLIST_OPTIMIZATION_REVIEWED" }),
  Object.freeze({ path: TASK_PATHS.FUTURE_TITLE_OPPORTUNITY_REVIEW, taskCode: "M10-FUTURE-TITLE", taskName: "Milestone 10 Future Title Opportunity Review", checkpoint: "FUTURE_TITLE_OPPORTUNITY_REVIEWED" }),
  Object.freeze({ path: TASK_PATHS.MARKETING_FOLLOWUP_BOUNDARY_REVIEW, taskCode: "M10-MARKETING-FOLLOWUP", taskName: "Milestone 10 Marketing Follow-Up Boundary Review", checkpoint: "RECOGNITION_DRAFT_REVIEWED" }),
  Object.freeze({ path: TASK_PATHS.TAX_ACCOUNTING_STOP_REVIEW, taskCode: "M10-TAX-ACCOUNTING-STOP", taskName: "Milestone 10 Tax and Accounting Stop Review", checkpoint: "TAX_ACCOUNTING_ACTION_STOP_CONFIRMED" })
]);

const SCHEMA_TARGETS = Object.freeze({
  TITLE_FIELDS: Object.freeze([
    "jm1pub_annualreviewstatus",
    "jm1pub_annualfeebasis",
    "jm1pub_annualfeeamount",
    "jm1pub_starterscheduleref",
    "jm1pub_grandfatherexpiry",
    "jm1pub_lastmetadataaudit",
    "jm1pub_annualreviewdate",
    "jm1pub_releasedate",
    "jm1pub_distributionliveverified",
    "jm1pub_postreleasestatus",
    "jm1pub_cataloghealthstatus",
    "jm1pub_backlistoptimizationstatus",
    "jm1pub_futuretitleopportunitystatus"
  ]),
  CONTACT_FIELDS: Object.freeze([
    "jm1_loyaltytier",
    "jm1_publishedtitlecount",
    "jm1_tieradvanceddate",
    "jm1_signaturecandidate"
  ]),
  TASK_ENTITY_SET: POST_RELEASE_TASK_ENTITY_SET,
  EXECUTION_LOG_ENTITY_SET
});

const SAFE_INPUT_FIELDS = Object.freeze([
  "diagnosticId",
  "intakeReferenceCode",
  "opportunity",
  "project",
  "title",
  "author",
  "contact",
  "annualReview",
  "loyalty",
  "royalty",
  "catalog",
  "authorSupport",
  "backlist",
  "futureTitle",
  "marketingFollowup",
  "gates",
  "completedAt",
  "metadata"
]);

const FORBIDDEN_FIELDS = Object.freeze([
  "manuscriptText",
  "manuscriptContent",
  "promptBody",
  "rawPrompt",
  "rawModelOutput",
  "rawModelResponse",
  "invoiceUrl",
  "invoiceSent",
  "paymentLink",
  "paymentLinkUrl",
  "chargeCard",
  "royaltyPaymentSent",
  "royaltyPayoutId",
  "taxFormGenerated",
  "taxAdvice",
  "qboInvoiceId",
  "quickBooksInvoiceId",
  "businessCentralInvoiceId",
  "sendAuthorEmail",
  "recognitionEmailSent",
  "sendPublicCampaign",
  "publicPostPublished",
  "activateMarketingAgent",
  "demoteLoyaltyTier",
  "assignSignature",
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
    code: "MILESTONE_10_POST_RELEASE_MANAGEMENT_BLOCKED",
    reason,
    diagnosticId: normalizeString(input?.diagnosticId) || null,
    intakeReferenceCode: normalizeString(input?.intakeReferenceCode) || null
  };
}

function validateBaseInput(input) {
  if (!isPlainObject(input)) return safeFailure("INVALID_MILESTONE_10_INPUT");
  if (!hasOnlySafeTopLevelFields(input) || hasForbiddenFieldDeep(input)) return safeFailure("UNSAFE_FIELD_PRESENT", input);

  const diagnosticId = normalizeString(input.diagnosticId);
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode);
  if (!diagnosticId || !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) return safeFailure("DIAGNOSTIC_ID_INVALID", input);
  if (!intakeReferenceCode || !INTAKE_REFERENCE_PATTERN.test(intakeReferenceCode)) return safeFailure("INTAKE_REFERENCE_CODE_INVALID", input);
  if (normalizeString(input.project?.type) === "LEGACY") return safeFailure("LEGACY_PROJECT_EXCLUDED", input);
  if (!normalizeString(input.contact?.contactId || input.author?.contactId)) return safeFailure("AUTHOR_CONTACT_REQUIRED", input);
  return null;
}

function gateEnabled(input, gateName) {
  return input.gates?.[gateName] === true;
}

function isReadyStatus(value, allowed) {
  return allowed.includes(normalizeString(value));
}

function parseDate(value) {
  const normalized = normalizeString(value);
  if (!normalized) return null;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isSameMonthDay(a, b) {
  return a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}

function currentReviewYear(input) {
  const completedAt = parseDate(input.completedAt) || new Date();
  return completedAt.getUTCFullYear();
}

function computeAnnualReviewEligibility(input) {
  const releaseDate = parseDate(input.title?.releaseDate || input.annualReview?.releaseDate);
  const completedAt = parseDate(input.completedAt) || new Date();
  const activeTitle = input.title?.active !== false;
  const alreadyOpenThisYear = Number(input.annualReview?.openReviewYear) === completedAt.getUTCFullYear();

  if (!releaseDate) {
    return {
      eligible: false,
      yearsSinceRelease: null,
      blockers: ["RELEASE_DATE_REQUIRED_FOR_ANNUAL_REVIEW"],
      events: ["AnnualReviewNoReleaseDate"]
    };
  }

  const anniversaryToday = completedAt >= releaseDate && isSameMonthDay(releaseDate, completedAt);
  const yearsSinceRelease = Math.max(0, completedAt.getUTCFullYear() - releaseDate.getUTCFullYear());
  const blockers = [
    ...(!activeTitle ? ["TITLE_NOT_ACTIVE"] : []),
    ...(!anniversaryToday ? ["NOT_TITLE_ANNIVERSARY_TODAY"] : []),
    ...(alreadyOpenThisYear ? ["ANNUAL_REVIEW_ALREADY_OPEN_THIS_YEAR"] : [])
  ];

  return {
    eligible: blockers.length === 0,
    yearsSinceRelease,
    blockers,
    events: blockers.length ? [] : ["AnnualReviewScheduled"]
  };
}

function computeAnnualFee(input) {
  const today = parseDate(input.completedAt) || new Date();
  const starterRef = normalizeString(input.annualReview?.starterScheduleRef);
  const grandfatherExpiry = parseDate(input.annualReview?.grandfatherExpiry);
  const grandfatherClaimed = input.annualReview?.grandfatherClaimed === true;
  const activeGrandfather = Boolean(starterRef && grandfatherExpiry && today <= grandfatherExpiry);
  const unverifiedGrandfather = grandfatherClaimed && !starterRef;
  const expiredGrandfather = Boolean(starterRef && grandfatherExpiry && today > grandfatherExpiry);

  return {
    basis: activeGrandfather ? ANNUAL_FEE_BASIS.STARTER_GRANDFATHERED_30 : ANNUAL_FEE_BASIS.STANDARD_R2_49,
    amount: activeGrandfather ? 30 : 49,
    starterScheduleRef: starterRef || null,
    grandfatherExpiry: grandfatherExpiry ? grandfatherExpiry.toISOString().slice(0, 10) : null,
    starterRateMigrated: expiredGrandfather,
    grandfatherUnverified: unverifiedGrandfather,
    events: [
      "AnnualFeeComputed",
      ...(expiredGrandfather ? ["StarterRateMigrated"] : []),
      ...(unverifiedGrandfather ? ["GrandfatherUnverified"] : [])
    ]
  };
}

function tierRank(tier) {
  return {
    [LOYALTY_TIERS.NONE]: 0,
    [LOYALTY_TIERS.LOYAL]: 1,
    [LOYALTY_TIERS.ESTABLISHED]: 2,
    [LOYALTY_TIERS.LEGACY]: 3
  }[tier] ?? 0;
}

function computeTierFromCount(count) {
  if (count >= 4) return LOYALTY_TIERS.LEGACY;
  if (count >= 2) return LOYALTY_TIERS.ESTABLISHED;
  if (count >= 1) return LOYALTY_TIERS.LOYAL;
  return LOYALTY_TIERS.NONE;
}

function computeLoyaltyProgression(input) {
  const commercialPublishedTitleCount = Number(input.loyalty?.commercialPublishedTitleCount);
  const countValid = Number.isInteger(commercialPublishedTitleCount) && commercialPublishedTitleCount >= 0;
  const currentTier = normalizeString(input.contact?.loyaltyTier || input.loyalty?.currentTier) || LOYALTY_TIERS.NONE;
  const computedTier = countValid ? computeTierFromCount(commercialPublishedTitleCount) : LOYALTY_TIERS.NONE;
  const advancement = countValid && tierRank(computedTier) > tierRank(currentTier);
  const signatureCandidate = advancement && computedTier === LOYALTY_TIERS.LEGACY;

  return {
    currentTier,
    computedTier,
    commercialPublishedTitleCount: countValid ? commercialPublishedTitleCount : null,
    countValid,
    advancement,
    autoDemotionPermitted: false,
    signatureCandidate,
    recognitionDraftPrepared: advancement,
    suggestedRecognitionWindow: advancement ? "within 5 business days of advancement" : null,
    events: advancement
      ? [
        "LoyaltyTierAdvanced",
        ...(signatureCandidate ? ["SignatureCandidateFlagged"] : []),
        "TierRecognitionPrepared"
      ]
      : []
  };
}

function buildTaskTemplates() {
  return TASK_TEMPLATES.map((template) => Object.freeze({
    ...template,
    entitySet: POST_RELEASE_TASK_ENTITY_SET,
    taskPayloadCreated: false,
    taskCreatedInDataverse: false
  }));
}

function buildTaskPayloads(input, readiness) {
  if (!readiness.postReleaseManagementPermitted) return [];
  const projectTitle = normalizeString(input.project?.title || input.title?.title) || "Publishing title";
  return TASK_TEMPLATES.map((template) => Object.freeze({
    entitySet: POST_RELEASE_TASK_ENTITY_SET,
    path: template.path,
    checkpoint: template.checkpoint,
    payload: Object.freeze({
      jm1_taskname: `${template.taskName} - ${projectTitle}`.slice(0, 100),
      jm1_iscompleted: false
    })
  }));
}

function buildReviewCard(input, annualReview, fee, loyalty) {
  return {
    prepared: true,
    type: "MILESTONE_10_ANNUAL_REVIEW_CARD",
    to: INTERNAL_VISIBILITY_MAILBOX,
    cc: [],
    bcc: [],
    author: normalizeString(input.author?.name) || null,
    title: normalizeString(input.project?.title || input.title?.title) || null,
    yearsSinceRelease: annualReview.yearsSinceRelease,
    feeBasis: fee.basis,
    feeAmount: fee.amount,
    grandfatherFlagged: fee.grandfatherUnverified || fee.starterRateMigrated,
    loyaltyTier: loyalty.currentTier,
    activeTitleCount: loyalty.commercialPublishedTitleCount,
    mostRecentPublicationDate: normalizeString(input.loyalty?.mostRecentPublicationDate) || null,
    renewalDecisionPrompt: true
  };
}

function buildRecognitionDraft(input, loyalty) {
  if (!loyalty.recognitionDraftPrepared) return null;
  return {
    prepared: true,
    sendPermitted: false,
    template: "LOYALTY_TIER_RECOGNITION_DRAFT",
    authorName: normalizeString(input.author?.name) || null,
    tier: loyalty.computedTier,
    designation: loyalty.computedTier === LOYALTY_TIERS.LEGACY
      ? "Legacy Author"
      : loyalty.computedTier === LOYALTY_TIERS.ESTABLISHED
        ? "Established Author"
        : "Returning Author",
    suggestedReleaseWindow: loyalty.suggestedRecognitionWindow,
    safePreview: `Recognition draft prepared for ${loyalty.computedTier}; Jackie releases before any author-facing send.`
  };
}

function buildInternalNotification(input, readiness) {
  return {
    prepared: true,
    type: EVENT_TYPE,
    to: INTERNAL_VISIBILITY_MAILBOX,
    cc: [],
    bcc: [],
    subject: `Milestone 10 post-release readiness: ${input.intakeReferenceCode}`,
    safePreview: [
      `Milestone 10 post-release management evaluated for ${input.intakeReferenceCode}.`,
      `Post-release management permitted: ${readiness.postReleaseManagementPermitted ? "yes" : "no"}.`,
      `Blocking conditions: ${readiness.blockers.length ? readiness.blockers.join(", ") : "none"}.`,
      "No invoice, royalty payment, tax/accounting action, author send, public campaign, Signature assignment, or loyalty demotion occurred."
    ].join(" ")
  };
}

function buildMilestone10PostReleaseManagement(input = {}) {
  const failure = validateBaseInput(input);
  if (failure) return failure;

  const diagnosticId = normalizeString(input.diagnosticId);
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode);
  const contactId = normalizeString(input.contact?.contactId || input.author?.contactId);
  const completedAt = normalizeString(input.completedAt) || new Date().toISOString();
  const annualReview = computeAnnualReviewEligibility(input);
  const fee = computeAnnualFee(input);
  const loyalty = computeLoyaltyProgression(input);

  const postReleaseGateOpen = gateEnabled(input, GATES.POST_RELEASE_MANAGEMENT);
  const annualReviewGateOpen = gateEnabled(input, GATES.ANNUAL_REVIEW);
  const loyaltyGateOpen = gateEnabled(input, GATES.LOYALTY_PROGRESSION);
  const royaltyReportingGateOpen = gateEnabled(input, GATES.ROYALTY_REPORTING);
  const publicMarketingGateOpen = gateEnabled(input, GATES.PUBLIC_MARKETING_FOLLOWUP);
  const launchReleaseComplete = isReadyStatus(input.title?.launchReleaseStatus, [
    "LAUNCH_RELEASE_READY",
    "RELEASED_DISTRIBUTION_LIVE",
    "POST_RELEASE_ELIGIBLE"
  ]);
  const distributionLiveVerified = input.title?.distributionLiveVerified === true;
  const metadataAuditReady = input.catalog?.metadataAuditReady === true || annualReview.eligible;
  const royaltyReportingReady = isReadyStatus(input.royalty?.reportingStatus, [
    "REPORTING_READY",
    "REPORTING_NOT_APPLICABLE",
    "REPORTING_SOURCE_CONFIRMED"
  ]);
  const catalogHealthReady = isReadyStatus(input.catalog?.healthStatus, [
    "READY_FOR_REVIEW",
    "CURRENT",
    "NEEDS_HUMAN_REVIEW"
  ]);

  const blockers = [
    ...(!launchReleaseComplete ? ["LAUNCH_RELEASE_FOUNDATION_NOT_COMPLETE"] : []),
    ...(!distributionLiveVerified ? ["DISTRIBUTION_LIVE_VERIFICATION_REQUIRED"] : []),
    ...(!postReleaseGateOpen ? [`${GATES.POST_RELEASE_MANAGEMENT}_FALSE`] : []),
    ...(!annualReviewGateOpen ? [`${GATES.ANNUAL_REVIEW}_FALSE`] : []),
    ...(!loyaltyGateOpen ? [`${GATES.LOYALTY_PROGRESSION}_FALSE`] : []),
    ...(!annualReview.eligible ? annualReview.blockers : []),
    ...(!loyalty.countValid ? ["COMMERCIAL_PUBLISHED_TITLE_COUNT_REQUIRED"] : []),
    ...(!metadataAuditReady ? ["METADATA_AUDIT_READINESS_REQUIRED"] : []),
    ...(!royaltyReportingReady ? ["ROYALTY_REPORTING_SOURCE_REQUIRED"] : []),
    ...(!catalogHealthReady ? ["CATALOG_HEALTH_STATUS_REQUIRED"] : []),
    ...(royaltyReportingGateOpen ? ["ROYALTY_REPORTING_LIVE_GATE_MUST_REMAIN_FALSE"] : []),
    ...(publicMarketingGateOpen ? ["PUBLIC_MARKETING_FOLLOWUP_GATE_MUST_REMAIN_FALSE"] : [])
  ];
  const postReleaseManagementPermitted = blockers.length === 0;

  const readiness = {
    diagnosticId,
    intakeReferenceCode,
    contactId,
    launchReleaseComplete,
    distributionLiveVerified,
    annualReviewEligible: annualReview.eligible,
    annualReviewStatusPrepared: annualReview.eligible ? ANNUAL_REVIEW_STATUS.OPEN : null,
    annualFeeBasis: fee.basis,
    annualFeeAmount: fee.amount,
    starterRateMigrated: fee.starterRateMigrated,
    grandfatherUnverified: fee.grandfatherUnverified,
    metadataAuditChecklist: METADATA_AUDIT_CHECKLIST,
    royaltyReportingReady,
    catalogHealthReady,
    loyalty,
    postReleaseGateName: GATES.POST_RELEASE_MANAGEMENT,
    annualReviewGateName: GATES.ANNUAL_REVIEW,
    loyaltyProgressionGateName: GATES.LOYALTY_PROGRESSION,
    royaltyReportingGateName: GATES.ROYALTY_REPORTING,
    publicMarketingFollowupGateName: GATES.PUBLIC_MARKETING_FOLLOWUP,
    gates: {
      postReleaseManagement: postReleaseGateOpen,
      annualReview: annualReviewGateOpen,
      loyaltyProgression: loyaltyGateOpen,
      royaltyReporting: royaltyReportingGateOpen,
      publicMarketingFollowup: publicMarketingGateOpen
    },
    postReleaseManagementPermitted,
    blockers,
    humanCheckpoints: HUMAN_CHECKPOINTS,
    stopsBefore: [
      "ROYALTY_PAYMENT",
      "INVOICE_SEND",
      "TAX_ACCOUNTING_ACTION",
      "AUTHOR_RECOGNITION_SEND",
      "PUBLIC_MARKETING_CAMPAIGN",
      "SIGNATURE_ASSIGNMENT",
      "LOYALTY_DEMOTION"
    ]
  };

  const taskTemplates = buildTaskTemplates();
  const taskPayloads = buildTaskPayloads(input, readiness);
  const annualReviewCard = buildReviewCard(input, annualReview, fee, loyalty);
  const recognitionDraft = buildRecognitionDraft(input, loyalty);
  const internalNotification = buildInternalNotification(input, readiness);
  const events = [
    ...annualReview.events,
    ...fee.events,
    ...(annualReview.eligible ? ["MetadataAuditTaskCreated"] : []),
    ...loyalty.events
  ];
  const actionDescription = [
    `Milestone 10 post-release management readiness for intake ${intakeReferenceCode}.`,
    `Contact ${contactId} used as loyalty source; BP-15 is sole between-intakes progression writer.`,
    `Post-release management permitted ${postReleaseManagementPermitted ? "yes" : "no"}.`,
    blockers.length ? `Blockers ${blockers.join(", ")}.` : "No readiness blockers.",
    events.length ? `Prepared events ${events.join(", ")}.` : "No live event writes.",
    "No invoice, royalty payment, tax/accounting action, author send, public campaign, Signature assignment, loyalty demotion, QBO logic, manuscript text, prompt body, raw model output, credentials, or secrets stored."
  ].join(" ");

  return {
    ok: true,
    readiness,
    annualReviewCard,
    recognitionDraft,
    taskTemplates,
    taskPayloads,
    internalNotification,
    schemaTargets: SCHEMA_TARGETS,
    payloads: {
      executionLogEntitySet: EXECUTION_LOG_ENTITY_SET,
      executionLogPayload: {
        jm1_name: `M10-POST-RELEASE-${diagnosticId}`,
        jm1_actiondescription: actionDescription.slice(0, 1000),
        jm1_actiontype: EVENT_TYPE,
        jm1_agentname: AGENT_NAME,
        jm1_agentmodel: "milestone-10-post-release-management",
        jm1_bandlevel: BAND_LEVEL.BAND_1,
        jm1_executionstatus: EXECUTION_STATUS.SUCCESS,
        jm1_startedon: completedAt,
        jm1_completedon: completedAt,
        jm1_sourceentity: SOURCE_ENTITY,
        jm1_sourcerecordid: diagnosticId
      }
    },
    liveActions: {
      createsPostReleaseTasks: false,
      opensAnnualReviewLive: false,
      createsMetadataAuditTaskLive: false,
      sendsInvoice: false,
      createsPaymentLink: false,
      processesRoyaltyPayment: false,
      performsTaxAccountingAction: false,
      sendsAuthorRecognition: false,
      sendsPublicMarketingCampaign: false,
      activatesMarketingAgent: false,
      assignsSignature: false,
      demotesLoyaltyTier: false,
      usesQboForNewLogic: false,
      exposesCredentials: false
    }
  };
}

module.exports = {
  buildMilestone10PostReleaseManagement,
  buildTaskTemplates,
  buildTaskPayloads,
  computeAnnualReviewEligibility,
  computeAnnualFee,
  computeLoyaltyProgression,
  computeTierFromCount,
  GATES,
  LOYALTY_TIERS,
  ANNUAL_REVIEW_STATUS,
  ANNUAL_FEE_BASIS,
  TASK_PATHS,
  HUMAN_CHECKPOINTS,
  METADATA_AUDIT_CHECKLIST,
  TASK_TEMPLATES,
  SCHEMA_TARGETS,
  INTERNAL_VISIBILITY_MAILBOX,
  EXECUTION_LOG_ENTITY_SET,
  POST_RELEASE_TASK_ENTITY_SET,
  EVENT_TYPE,
  SAFE_INPUT_FIELDS,
  FORBIDDEN_FIELDS
};
