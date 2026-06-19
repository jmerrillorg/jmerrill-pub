"use strict";

/**
 * Milestone #8 governed distribution setup readiness.
 *
 * This module prepares distribution setup readiness, task payloads, internal
 * visibility, and evidence only. It does not submit to Ingram or any retailer,
 * publish files, set a live release date, launch a title, start royalties, send
 * author email, or expose credentials.
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
const DISTRIBUTION_TASK_ENTITY_SET = "jm1_publishingtasks";
const EVENT_TYPE = "MILESTONE_8_DISTRIBUTION_SETUP_READINESS";
const DISTRIBUTION_GATE_NAME = "JM1_DISTRIBUTION_SETUP_ENABLED";

const DISTRIBUTION_CHANNELS = Object.freeze({
  INGRAM_PRINT: "INGRAM_PRINT",
  EBOOK_RETAIL: "EBOOK_RETAIL",
  AUTHOR_DIRECT: "AUTHOR_DIRECT",
  LIBRARY_RETAIL_NETWORK: "LIBRARY_RETAIL_NETWORK"
});

const DISTRIBUTION_PATHS = Object.freeze({
  TITLE_METADATA: "TITLE_METADATA",
  ISBN_IMPRINT: "ISBN_IMPRINT",
  PRINT_FILE_SETUP: "PRINT_FILE_SETUP",
  EBOOK_FILE_SETUP: "EBOOK_FILE_SETUP",
  COVER_FILE_SETUP: "COVER_FILE_SETUP",
  PRICING_TERRITORY: "PRICING_TERRITORY",
  CHANNEL_SETUP: "CHANNEL_SETUP",
  PROOF_ORDER_REVIEW: "PROOF_ORDER_REVIEW"
});

const HUMAN_CHECKPOINTS = Object.freeze([
  "DISTRIBUTION_SETUP_AUTHORIZATION_REVIEW",
  "TITLE_METADATA_APPROVAL",
  "ISBN_IMPRINT_APPROVAL",
  "PRINT_FILE_APPROVAL",
  "EBOOK_FILE_APPROVAL",
  "COVER_FILE_APPROVAL",
  "PRICING_TERRITORY_APPROVAL",
  "CHANNEL_SETUP_APPROVAL",
  "PROOF_ORDER_APPROVAL",
  "LAUNCH_RELEASE_STOP_REVIEW"
]);

const TASK_TEMPLATES = Object.freeze([
  Object.freeze({ path: DISTRIBUTION_PATHS.TITLE_METADATA, taskCode: "M8-TITLE-METADATA", taskName: "Milestone 8 Title Metadata Setup", checkpoint: "TITLE_METADATA_APPROVAL" }),
  Object.freeze({ path: DISTRIBUTION_PATHS.ISBN_IMPRINT, taskCode: "M8-ISBN-IMPRINT", taskName: "Milestone 8 ISBN and Imprint Setup", checkpoint: "ISBN_IMPRINT_APPROVAL" }),
  Object.freeze({ path: DISTRIBUTION_PATHS.PRINT_FILE_SETUP, taskCode: "M8-PRINT-FILE", taskName: "Milestone 8 Print File Distribution Setup", checkpoint: "PRINT_FILE_APPROVAL" }),
  Object.freeze({ path: DISTRIBUTION_PATHS.EBOOK_FILE_SETUP, taskCode: "M8-EBOOK-FILE", taskName: "Milestone 8 eBook File Distribution Setup", checkpoint: "EBOOK_FILE_APPROVAL" }),
  Object.freeze({ path: DISTRIBUTION_PATHS.COVER_FILE_SETUP, taskCode: "M8-COVER-FILE", taskName: "Milestone 8 Cover File Distribution Setup", checkpoint: "COVER_FILE_APPROVAL" }),
  Object.freeze({ path: DISTRIBUTION_PATHS.PRICING_TERRITORY, taskCode: "M8-PRICING-TERRITORY", taskName: "Milestone 8 Pricing and Territory Setup", checkpoint: "PRICING_TERRITORY_APPROVAL" }),
  Object.freeze({ path: DISTRIBUTION_PATHS.CHANNEL_SETUP, taskCode: "M8-CHANNEL-SETUP", taskName: "Milestone 8 Distribution Channel Setup", checkpoint: "CHANNEL_SETUP_APPROVAL" }),
  Object.freeze({ path: DISTRIBUTION_PATHS.PROOF_ORDER_REVIEW, taskCode: "M8-PROOF-ORDER", taskName: "Milestone 8 Proof Order Review", checkpoint: "PROOF_ORDER_APPROVAL" })
]);

const SAFE_INPUT_FIELDS = Object.freeze([
  "diagnosticId",
  "intakeReferenceCode",
  "opportunity",
  "project",
  "author",
  "production",
  "files",
  "metadata",
  "isbn",
  "pricing",
  "channels",
  "distributionAuthorization",
  "distributionGateEnabled",
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
  "ingramPassword",
  "ingramApiKey",
  "retailerCredential",
  "ftpPassword",
  "distributionSubmitted",
  "ingramSubmissionId",
  "retailerSubmissionId",
  "publishNow",
  "releaseDateSet",
  "launchStarted",
  "releaseStarted",
  "royaltySetupStarted",
  "postReleaseManagement",
  "liveRetailLink",
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
    code: "MILESTONE_8_DISTRIBUTION_SETUP_BLOCKED",
    reason,
    diagnosticId: normalizeString(input?.diagnosticId) || null,
    intakeReferenceCode: normalizeString(input?.intakeReferenceCode) || null
  };
}

function isReadyStatus(value, allowed) {
  return allowed.includes(normalizeString(value));
}

function requiredString(value) {
  return Boolean(normalizeString(value));
}

function hasAtLeastOneChannel(channels) {
  return Array.isArray(channels) && channels.some((channel) => Object.values(DISTRIBUTION_CHANNELS).includes(normalizeString(channel)));
}

function buildTaskTemplates() {
  return TASK_TEMPLATES.map((template) => Object.freeze({
    ...template,
    entitySet: DISTRIBUTION_TASK_ENTITY_SET,
    taskPayloadCreated: false,
    taskCreatedInDataverse: false
  }));
}

function buildDistributionTaskPayloads(input, readiness) {
  if (!readiness.distributionSetupPermitted) return [];

  const projectTitle = normalizeString(input.project?.title) || "Publishing project";
  const dueDate = normalizeString(input.distributionAuthorization?.targetSetupDate) || null;
  return TASK_TEMPLATES.map((template) => Object.freeze({
    entitySet: DISTRIBUTION_TASK_ENTITY_SET,
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
    subject: `Milestone 8 distribution setup readiness: ${input.intakeReferenceCode}`,
    safePreview: [
      `Milestone 8 distribution setup readiness evaluated for ${input.intakeReferenceCode}.`,
      `Distribution setup permitted: ${readiness.distributionSetupPermitted ? "yes" : "no"}.`,
      `Blocking conditions: ${readiness.blockers.length ? readiness.blockers.join(", ") : "none"}.`,
      "Stops before launch, release, royalty setup, and post-release management."
    ].join(" ")
  };
}

function buildMilestone8DistributionSetupReadiness(input = {}) {
  if (!isPlainObject(input)) return safeFailure("INVALID_MILESTONE_8_INPUT");
  if (!hasOnlySafeTopLevelFields(input) || hasForbiddenFieldDeep(input)) return safeFailure("UNSAFE_FIELD_PRESENT", input);

  const diagnosticId = normalizeString(input.diagnosticId);
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode);
  if (!diagnosticId || !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) return safeFailure("DIAGNOSTIC_ID_INVALID", input);
  if (!intakeReferenceCode || !INTAKE_REFERENCE_PATTERN.test(intakeReferenceCode)) return safeFailure("INTAKE_REFERENCE_CODE_INVALID", input);

  const opportunityId = normalizeString(input.opportunity?.opportunityId || input.opportunity?.id);
  if (!opportunityId) return safeFailure("EXISTING_OPPORTUNITY_REQUIRED", input);
  if (input.opportunity?.active !== true) return safeFailure("ACTIVE_OPPORTUNITY_REQUIRED", input);

  const productionComplete = isReadyStatus(input.production?.status, [
    "PRODUCTION_COMPLETE",
    "FILES_APPROVED_FOR_DISTRIBUTION",
    "PRODUCTION_WAIVED_BY_JACKIE"
  ]);
  const metadataReady = requiredString(input.metadata?.title) &&
    requiredString(input.metadata?.authorName) &&
    requiredString(input.metadata?.descriptionStatus) &&
    requiredString(input.metadata?.categoryStatus);
  const isbnReady = isReadyStatus(input.isbn?.status, [
    "ISBN_ASSIGNED",
    "ISBN_NOT_REQUIRED",
    "ISBN_WAIVED_BY_JACKIE"
  ]);
  const printFileReady = isReadyStatus(input.files?.printInteriorStatus, [
    "PRINT_INTERIOR_APPROVED",
    "PRINT_NOT_APPLICABLE"
  ]);
  const ebookFileReady = isReadyStatus(input.files?.ebookStatus, [
    "EBOOK_APPROVED",
    "EBOOK_NOT_APPLICABLE"
  ]);
  const coverFileReady = isReadyStatus(input.files?.coverStatus, [
    "COVER_APPROVED"
  ]);
  const pricingReady = isReadyStatus(input.pricing?.status, [
    "PRICING_APPROVED",
    "PRICING_WAIVED_BY_JACKIE"
  ]);
  const channelsReady = hasAtLeastOneChannel(input.channels?.selected);
  const gateEnabled = input.distributionGateEnabled === true;
  const humanAuthorized = normalizeString(input.distributionAuthorization?.authorizedBy) &&
    normalizeString(input.distributionAuthorization?.authorizedAt);

  const blockers = [
    ...(!productionComplete ? ["PRODUCTION_FILES_NOT_READY"] : []),
    ...(!metadataReady ? ["TITLE_METADATA_REQUIRED"] : []),
    ...(!isbnReady ? ["ISBN_IMPRINT_DECISION_REQUIRED"] : []),
    ...(!printFileReady ? ["PRINT_FILE_NOT_APPROVED"] : []),
    ...(!ebookFileReady ? ["EBOOK_FILE_NOT_APPROVED"] : []),
    ...(!coverFileReady ? ["COVER_FILE_NOT_APPROVED"] : []),
    ...(!pricingReady ? ["PRICING_TERRITORY_NOT_APPROVED"] : []),
    ...(!channelsReady ? ["DISTRIBUTION_CHANNEL_REQUIRED"] : []),
    ...(!gateEnabled ? [`${DISTRIBUTION_GATE_NAME}_FALSE`] : []),
    ...(!humanAuthorized ? ["HUMAN_DISTRIBUTION_SETUP_AUTHORIZATION_REQUIRED"] : [])
  ];
  const distributionSetupPermitted = blockers.length === 0;

  const readiness = {
    diagnosticId,
    intakeReferenceCode,
    opportunityId,
    productionComplete,
    metadataReady,
    isbnReady,
    printFileReady,
    ebookFileReady,
    coverFileReady,
    pricingReady,
    channelsReady,
    distributionGateName: DISTRIBUTION_GATE_NAME,
    distributionGateEnabled: gateEnabled,
    humanAuthorized: Boolean(humanAuthorized),
    distributionSetupPermitted,
    blockers,
    paths: Object.values(DISTRIBUTION_PATHS),
    channels: channelsReady ? input.channels.selected.map(normalizeString) : [],
    humanCheckpoints: HUMAN_CHECKPOINTS,
    stopsBefore: [
      "LAUNCH_RELEASE",
      "RETAIL_PUBLICATION",
      "ROYALTY_SETUP",
      "POST_RELEASE_MANAGEMENT"
    ]
  };

  const completedAt = normalizeString(input.completedAt) || new Date().toISOString();
  const taskTemplates = buildTaskTemplates();
  const taskPayloads = buildDistributionTaskPayloads(input, readiness);
  const internalNotification = buildInternalNotification(input, readiness);
  const actionDescription = [
    `Milestone 8 distribution setup readiness for intake ${intakeReferenceCode}.`,
    `Existing active Opportunity ${opportunityId} used; no duplicate Opportunity created.`,
    `Distribution setup permitted ${distributionSetupPermitted ? "yes" : "no"}.`,
    blockers.length ? `Blockers ${blockers.join(", ")}.` : "No readiness blockers.",
    "No Ingram submission, retailer publication, release launch, royalty setup, post-release management, author email, payment action, QBO logic, manuscript text, prompt body, raw model output, credentials, or secrets stored."
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
        jm1_name: `M8-DISTRIBUTION-SETUP-${diagnosticId}`,
        jm1_actiondescription: actionDescription.slice(0, 1000),
        jm1_actiontype: EVENT_TYPE,
        jm1_agentname: AGENT_NAME,
        jm1_agentmodel: "milestone-8-distribution-setup-readiness",
        jm1_bandlevel: BAND_LEVEL.BAND_1,
        jm1_executionstatus: EXECUTION_STATUS.SUCCESS,
        jm1_startedon: completedAt,
        jm1_completedon: completedAt,
        jm1_sourceentity: SOURCE_ENTITY,
        jm1_sourcerecordid: diagnosticId
      }
    },
    liveActions: {
      createsDistributionTasks: false,
      submitsToIngram: false,
      publishesRetailListing: false,
      setsReleaseDate: false,
      startsLaunch: false,
      startsRoyaltySetup: false,
      startsPostReleaseManagement: false,
      sendsAuthorEmail: false,
      createsPaymentLink: false,
      createsInvoice: false,
      chargesCard: false,
      createsDuplicateOpportunity: false,
      usesQboForNewLogic: false,
      exposesCredentials: false
    }
  };
}

module.exports = {
  buildMilestone8DistributionSetupReadiness,
  buildTaskTemplates,
  buildDistributionTaskPayloads,
  DISTRIBUTION_GATE_NAME,
  DISTRIBUTION_CHANNELS,
  DISTRIBUTION_PATHS,
  HUMAN_CHECKPOINTS,
  TASK_TEMPLATES,
  INTERNAL_VISIBILITY_MAILBOX,
  EXECUTION_LOG_ENTITY_SET,
  DISTRIBUTION_TASK_ENTITY_SET,
  EVENT_TYPE,
  SAFE_INPUT_FIELDS,
  FORBIDDEN_FIELDS
};
