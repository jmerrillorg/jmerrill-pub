"use strict";

/**
 * Milestone #9 governed Launch / Release Readiness model.
 *
 * This module prepares checklist, task, notification, marketing-agent
 * readiness, and evidence payloads only. It does not publish, submit to
 * retailers, set or announce a public release date, send launch email, run a
 * public marketing campaign, activate BP-12, start royalties, or begin
 * post-release management.
 */

const { DIAGNOSTIC_ID_PATTERN, INTAKE_REFERENCE_PATTERN } = require("../queue/diagnosticQueueSelector");
const {
  AGENT_NAME,
  BAND_LEVEL,
  EXECUTION_STATUS,
  SOURCE_ENTITY
} = require("../dataverse/metadataWriter");
const {
  buildBp06AiDisclosureCapture,
  buildBp09CoverValidation,
  buildBp10ReleaseLock,
  GATES: PRE_M9_GATES,
  INTERNAL_VISIBILITY_MAILBOX
} = require("./preMilestone9GateCompletion");

const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const LAUNCH_TASK_ENTITY_SET = "jm1_publishingtasks";
const EVENT_TYPE = "MILESTONE_9_LAUNCH_RELEASE_READINESS";

const GATES = Object.freeze({
  ...PRE_M9_GATES,
  LAUNCH_READINESS: "JM1_LAUNCH_READINESS_ENABLED",
  MARKETING_AGENT: "JM1_MARKETING_AGENT_ENABLED"
});

const LAUNCH_CONDITIONS = Object.freeze({
  MARKETING_KIT: "MARKETING_KIT_COMPLETE",
  RELEASE_LOCK: "G4B_RELEASE_LOCKED",
  COMP_COPIES: "COMP_COPIES_DISPATCHED",
  AUTHOR_PAGE: "AUTHOR_PAGE_LIVE_REACHABLE"
});

const LAUNCH_PATHS = Object.freeze({
  LAUNCH_READINESS_CHECKLIST: "LAUNCH_READINESS_CHECKLIST",
  RELEASE_READINESS_CHECKLIST: "RELEASE_READINESS_CHECKLIST",
  TITLE_METADATA_FINAL_CONFIRMATION: "TITLE_METADATA_FINAL_CONFIRMATION",
  FINAL_FILE_READINESS_CONFIRMATION: "FINAL_FILE_READINESS_CONFIRMATION",
  DISTRIBUTION_READINESS_CONFIRMATION: "DISTRIBUTION_READINESS_CONFIRMATION",
  LAUNCH_MESSAGING_APPROVAL: "LAUNCH_MESSAGING_APPROVAL",
  MARKETING_READINESS_REVIEW: "MARKETING_READINESS_REVIEW",
  AUTHOR_PUBLISHER_APPROVALS: "AUTHOR_PUBLISHER_APPROVALS",
  INTERNAL_VISIBILITY_REVIEW: "INTERNAL_VISIBILITY_REVIEW",
  POST_RELEASE_STOP_REVIEW: "POST_RELEASE_STOP_REVIEW"
});

const HUMAN_CHECKPOINTS = Object.freeze([
  "PRODUCTION_READINESS_CONFIRMED",
  "EDITORIAL_HANDOFF_CONFIRMED",
  "DISTRIBUTION_SETUP_CONFIRMED",
  "BP06_AI_DISCLOSURE_CONFIRMED",
  "BP09_COVER_VALIDATION_CONFIRMED",
  "BP10_RELEASE_LOCK_CONFIRMED",
  "TITLE_METADATA_FINAL_APPROVAL",
  "FINAL_FILES_APPROVAL",
  "LAUNCH_MESSAGING_APPROVAL",
  "AUTHOR_APPROVAL_CONFIRMED",
  "PUBLISHER_FINAL_APPROVAL",
  "POST_RELEASE_STOP_CONFIRMED"
]);

const STANDARD_MARKETING_KIT_ITEMS = Object.freeze([
  "AUTHOR_ONE_SHEET",
  "BACK_COVER_COPY_VARIANTS",
  "AMAZON_PRODUCT_DESCRIPTION",
  "GOODREADS_DESCRIPTION",
  "AUTHOR_BIO_VARIANTS",
  "FIVE_POST_SOCIAL_LAUNCH_PACKAGE",
  "COMP_TITLE_LIST",
  "PRESS_RELEASE_TEMPLATE",
  "CORE_ASSETS",
  "AUTHOR_ACTIVATION_KIT_INSERT"
]);

const TASK_TEMPLATES = Object.freeze([
  Object.freeze({ path: LAUNCH_PATHS.LAUNCH_READINESS_CHECKLIST, taskCode: "M9-LAUNCH-CHECKLIST", taskName: "Milestone 9 Launch Readiness Checklist", checkpoint: "PUBLISHER_FINAL_APPROVAL" }),
  Object.freeze({ path: LAUNCH_PATHS.RELEASE_READINESS_CHECKLIST, taskCode: "M9-RELEASE-CHECKLIST", taskName: "Milestone 9 Release Readiness Checklist", checkpoint: "BP10_RELEASE_LOCK_CONFIRMED" }),
  Object.freeze({ path: LAUNCH_PATHS.TITLE_METADATA_FINAL_CONFIRMATION, taskCode: "M9-METADATA-FINAL", taskName: "Milestone 9 Final Title Metadata Confirmation", checkpoint: "TITLE_METADATA_FINAL_APPROVAL" }),
  Object.freeze({ path: LAUNCH_PATHS.FINAL_FILE_READINESS_CONFIRMATION, taskCode: "M9-FINAL-FILES", taskName: "Milestone 9 Final File Readiness Confirmation", checkpoint: "FINAL_FILES_APPROVAL" }),
  Object.freeze({ path: LAUNCH_PATHS.DISTRIBUTION_READINESS_CONFIRMATION, taskCode: "M9-DISTRIBUTION-READY", taskName: "Milestone 9 Distribution Readiness Confirmation", checkpoint: "DISTRIBUTION_SETUP_CONFIRMED" }),
  Object.freeze({ path: LAUNCH_PATHS.LAUNCH_MESSAGING_APPROVAL, taskCode: "M9-LAUNCH-MESSAGING", taskName: "Milestone 9 Launch Messaging Approval", checkpoint: "LAUNCH_MESSAGING_APPROVAL" }),
  Object.freeze({ path: LAUNCH_PATHS.MARKETING_READINESS_REVIEW, taskCode: "M9-MARKETING-READY", taskName: "Milestone 9 Marketing Readiness Review", checkpoint: "PUBLISHER_FINAL_APPROVAL" }),
  Object.freeze({ path: LAUNCH_PATHS.AUTHOR_PUBLISHER_APPROVALS, taskCode: "M9-AUTHOR-PUBLISHER-APPROVAL", taskName: "Milestone 9 Author and Publisher Approval", checkpoint: "AUTHOR_APPROVAL_CONFIRMED" }),
  Object.freeze({ path: LAUNCH_PATHS.INTERNAL_VISIBILITY_REVIEW, taskCode: "M9-INTERNAL-VISIBILITY", taskName: "Milestone 9 Internal Visibility Review", checkpoint: "PUBLISHER_FINAL_APPROVAL" }),
  Object.freeze({ path: LAUNCH_PATHS.POST_RELEASE_STOP_REVIEW, taskCode: "M9-POST-RELEASE-STOP", taskName: "Milestone 9 Post-Release Stop Review", checkpoint: "POST_RELEASE_STOP_CONFIRMED" })
]);

const SCHEMA_TARGETS = Object.freeze({
  TITLE_FIELDS: Object.freeze([
    "jm1pub_kitstatus",
    "jm1pub_kitmissingitems",
    "jm1pub_compcopystatus",
    "jm1pub_authorpagestatus",
    "jm1pub_authorpageurl",
    "jm1pub_launchready",
    "jm1pub_launchreadydate",
    "jm1pub_releaselocked",
    "jm1pub_releasedate",
    "jm1pub_marketingdategate",
    "jm1pub_titlemetadatafinalstatus",
    "jm1pub_finalfilereadinessstatus",
    "jm1pub_distributionreadinessstatus",
    "jm1pub_launchmessagingstatus",
    "jm1pub_marketingreadinessstatus",
    "jm1pub_authorapprovalstatus",
    "jm1pub_publisherapprovalstatus"
  ]),
  TASK_ENTITY_SET: LAUNCH_TASK_ENTITY_SET,
  EXECUTION_LOG_ENTITY_SET
});

const SAFE_INPUT_FIELDS = Object.freeze([
  "diagnosticId",
  "intakeReferenceCode",
  "opportunity",
  "project",
  "title",
  "author",
  "production",
  "editorial",
  "distribution",
  "bp06",
  "bp09",
  "bp10",
  "launch",
  "release",
  "marketing",
  "approvals",
  "gates",
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
  "publishNow",
  "publicReleaseDateSet",
  "announceReleaseDate",
  "sendLaunchEmail",
  "sendAuthorEmail",
  "sendPublicCampaign",
  "activateMarketingAgent",
  "metaBusinessSuiteSchedule",
  "submitToIngram",
  "submitToCoreSource",
  "submitToKdp",
  "submitToRetailer",
  "retailerSubmissionId",
  "royaltySetupStarted",
  "postReleaseWorkStarted",
  "annualReviewStarted",
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
    code: "MILESTONE_9_LAUNCH_RELEASE_READINESS_BLOCKED",
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

function gateEnabled(input, gateName) {
  return input.gates?.[gateName] === true;
}

function validateBaseInput(input) {
  if (!isPlainObject(input)) return safeFailure("INVALID_MILESTONE_9_INPUT");
  if (!hasOnlySafeTopLevelFields(input) || hasForbiddenFieldDeep(input)) return safeFailure("UNSAFE_FIELD_PRESENT", input);

  const diagnosticId = normalizeString(input.diagnosticId);
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode);
  if (!diagnosticId || !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) return safeFailure("DIAGNOSTIC_ID_INVALID", input);
  if (!intakeReferenceCode || !INTAKE_REFERENCE_PATTERN.test(intakeReferenceCode)) return safeFailure("INTAKE_REFERENCE_CODE_INVALID", input);
  if (normalizeString(input.project?.type) === "LEGACY") return safeFailure("LEGACY_PROJECT_EXCLUDED", input);

  const opportunityId = normalizeString(input.opportunity?.opportunityId || input.opportunity?.id);
  if (!opportunityId) return safeFailure("EXISTING_OPPORTUNITY_REQUIRED", input);
  if (input.opportunity?.active !== true) return safeFailure("ACTIVE_OPPORTUNITY_REQUIRED", input);
  return null;
}

function buildTaskTemplates() {
  return TASK_TEMPLATES.map((template) => Object.freeze({
    ...template,
    entitySet: LAUNCH_TASK_ENTITY_SET,
    taskPayloadCreated: false,
    taskCreatedInDataverse: false
  }));
}

function buildLaunchTaskPayloads(input, readiness) {
  if (!readiness.launchReleaseReadinessPermitted) return [];

  const projectTitle = normalizeString(input.project?.title) || normalizeString(input.title?.title) || "Publishing title";
  const dueDate = normalizeString(input.approvals?.targetReadinessDate) || null;
  return TASK_TEMPLATES.map((template) => Object.freeze({
    entitySet: LAUNCH_TASK_ENTITY_SET,
    path: template.path,
    checkpoint: template.checkpoint,
    payload: Object.freeze({
      jm1_taskname: `${template.taskName} - ${projectTitle}`.slice(0, 100),
      jm1_iscompleted: false,
      ...(dueDate ? { jm1_duedate: dueDate } : {})
    })
  }));
}

function buildBp11ReadinessCard(input, checklist) {
  const releaseDate = normalizeString(input.bp10?.lockedReleaseDate || input.bp10?.proposedReleaseDate || input.release?.lockedReleaseDate);
  const daysToRelease = Number.isFinite(Number(input.release?.daysToRelease))
    ? Number(input.release.daysToRelease)
    : null;
  const itemizedGaps = checklist.filter((item) => !item.passed).map((item) => item.blocker);

  return {
    type: checklist.every((item) => item.passed) ? "READY" : "NOT_READY",
    author: normalizeString(input.author?.name) || null,
    title: normalizeString(input.project?.title || input.title?.title) || null,
    lockedReleaseDate: releaseDate || null,
    daysToRelease,
    checklist,
    itemizedGaps,
    message: itemizedGaps.length
      ? `Not ready - ${itemizedGaps.join(", ")}.`
      : "Ready for launch sprint batch approval."
  };
}

function buildInternalNotification(input, readiness) {
  return {
    prepared: true,
    type: EVENT_TYPE,
    to: INTERNAL_VISIBILITY_MAILBOX,
    cc: [],
    bcc: [],
    subject: `Milestone 9 launch/release readiness: ${input.intakeReferenceCode}`,
    safePreview: [
      `Milestone 9 launch/release readiness evaluated for ${input.intakeReferenceCode}.`,
      `Readiness permitted: ${readiness.launchReleaseReadinessPermitted ? "yes" : "no"}.`,
      `Blocking conditions: ${readiness.blockers.length ? readiness.blockers.join(", ") : "none"}.`,
      "No public launch, release announcement, retailer submission, royalty setup, post-release work, author email, public campaign, or marketing-agent activation occurred."
    ].join(" ")
  };
}

function buildMarketingAgentReadiness(input) {
  const marketingGateOpen = gateEnabled(input, GATES.MARKETING_AGENT);
  const dateGateOpen = normalizeString(input.bp10?.marketingDateGate || input.release?.marketingDateGate) === "OPEN";
  const skillLifecycleReady = input.marketing?.authorBookMarketingSkillActive === true &&
    input.marketing?.publishingMarketingSkillActive === true;
  const promptRegistryReady = input.marketing?.promptFamilyApproved === true;
  const humanReviewRequired = true;
  const blockers = [
    ...(marketingGateOpen ? ["MARKETING_AGENT_GATE_MUST_REMAIN_FALSE_FOR_READINESS"] : []),
    ...(!dateGateOpen ? ["MARKETING_DATE_GATE_NOT_OPEN"] : []),
    ...(!skillLifecycleReady ? ["MARKETING_SKILLS_NOT_ACTIVE"] : []),
    ...(!promptRegistryReady ? ["MARKETING_PROMPTS_NOT_APPROVED"] : [])
  ];

  return {
    agentId: "jm1-agent-pub-marketing-01",
    readinessPrepared: true,
    activationPermitted: false,
    gateName: GATES.MARKETING_AGENT,
    gateEnabled: marketingGateOpen,
    blockers,
    humanReviewRequired,
    confidenceThreshold: 0.8,
    lanes: {
      laneAAuthorBookKit: "SCAFFOLDED_INACTIVE",
      laneBBrandMarketing: "SCAFFOLDED_INACTIVE_SEPARATE_APPROVAL_REQUIRED"
    },
    prohibitedActions: [
      "AUTHOR_OR_PUBLIC_COMMUNICATION",
      "SOCIAL_POSTING",
      "SCHEDULER_WRITE",
      "DATED_ASSET_WITH_CLOSED_DATE_GATE",
      "KITSTATUS_OR_LAUNCHREADY_WRITE",
      "RELEASE_GATE_WRITE"
    ]
  };
}

function buildPreM9Input(input, bp10Override = null) {
  return {
    diagnosticId: input.diagnosticId,
    intakeReferenceCode: input.intakeReferenceCode,
    opportunity: input.opportunity,
    project: input.project,
    title: input.title,
    author: input.author,
    bp06: input.bp06,
    bp09: input.bp09,
    bp10: bp10Override || input.bp10,
    milestone9: {
      authorMarketingKitComplete: normalizeString(input.launch?.kitStatus) === "COMPLETE",
      authorPageReady: normalizeString(input.launch?.authorPageStatus) === "LIVE" && input.launch?.authorPageReachable === true,
      compCopyPlanReady: ["DISPATCHED", "DELIVERED"].includes(normalizeString(input.launch?.compCopyStatus)),
      launchCopyApproved: isReadyStatus(input.launch?.messagingStatus, [
        "HUMAN_APPROVED",
        "APPROVED_FOR_LAUNCH_READINESS"
      ])
    },
    gates: input.gates,
    completedAt: input.completedAt,
    metadata: input.metadata
  };
}

function buildMilestone9LaunchReleaseReadiness(input = {}) {
  const failure = validateBaseInput(input);
  if (failure) return failure;

  const diagnosticId = normalizeString(input.diagnosticId);
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode);
  const opportunityId = normalizeString(input.opportunity?.opportunityId || input.opportunity?.id);
  const completedAt = normalizeString(input.completedAt) || new Date().toISOString();

  const preM9Input = buildPreM9Input(input);
  const bp06 = buildBp06AiDisclosureCapture(preM9Input);
  const bp09 = buildBp09CoverValidation(preM9Input);
  const bp10 = buildBp10ReleaseLock(buildPreM9Input(input, {
    ...input.bp10,
    proposedReleaseDate: input.bp10?.lockedReleaseDate || input.bp10?.proposedReleaseDate || input.release?.lockedReleaseDate,
    releaseLocked: false
  }));

  const productionReady = isReadyStatus(input.production?.status, [
    "PRODUCTION_COMPLETE",
    "FILES_APPROVED_FOR_DISTRIBUTION",
    "PRODUCTION_HANDOFF_APPROVED"
  ]);
  const editorialReady = isReadyStatus(input.editorial?.status, [
    "COMPLETE_READY_FOR_PRODUCTION_HANDOFF",
    "PRODUCTION_HANDOFF_APPROVED",
    "EDITORIAL_COMPLETE"
  ]);
  const distributionReady = isReadyStatus(input.distribution?.status, [
    "DISTRIBUTION_SETUP_READY",
    "DISTRIBUTION_SETUP_COMPLETE",
    "DISTRIBUTION_READINESS_CONFIRMED"
  ]);
  const metadataFinal = isReadyStatus(input.release?.titleMetadataStatus, [
    "FINAL_CONFIRMED",
    "FINAL_APPROVED"
  ]);
  const finalFilesReady = isReadyStatus(input.release?.finalFileStatus, [
    "FINAL_FILES_READY",
    "FINAL_FILES_APPROVED"
  ]);
  const launchMessagingReady = isReadyStatus(input.launch?.messagingStatus, [
    "HUMAN_APPROVED",
    "APPROVED_FOR_LAUNCH_READINESS"
  ]);
  const authorApproved = isReadyStatus(input.approvals?.authorApprovalStatus, [
    "APPROVED",
    "NOT_REQUIRED_BY_JACKIE"
  ]);
  const publisherApproved = normalizeString(input.approvals?.publisherApprovedBy) &&
    normalizeString(input.approvals?.publisherApprovedAt);
  const launchGateOpen = gateEnabled(input, GATES.LAUNCH_READINESS);

  const kitComplete = normalizeString(input.launch?.kitStatus) === "COMPLETE";
  const missingKitItems = Array.isArray(input.launch?.kitMissingItems)
    ? input.launch.kitMissingItems.map(normalizeString).filter(Boolean)
    : [];
  const releaseLocked = input.bp10?.releaseLocked === true || input.release?.releaseLocked === true;
  const releaseDatePresent = requiredString(input.bp10?.lockedReleaseDate || input.bp10?.proposedReleaseDate || input.release?.lockedReleaseDate);
  const compDispatched = ["DISPATCHED", "DELIVERED"].includes(normalizeString(input.launch?.compCopyStatus));
  const authorPageLive = normalizeString(input.launch?.authorPageStatus) === "LIVE";
  const authorPageReachable = input.launch?.authorPageReachable === true && requiredString(input.launch?.authorPageUrl);

  const launchChecklist = [
    {
      condition: LAUNCH_CONDITIONS.MARKETING_KIT,
      passed: kitComplete && missingKitItems.length === 0,
      blocker: missingKitItems.length ? `KIT_MISSING_${missingKitItems.join("_")}` : "MARKETING_KIT_NOT_COMPLETE",
      details: {
        standardItemCount: STANDARD_MARKETING_KIT_ITEMS.length,
        missingItems: missingKitItems
      }
    },
    {
      condition: LAUNCH_CONDITIONS.RELEASE_LOCK,
      passed: releaseLocked && releaseDatePresent && bp10.ready === true,
      blocker: "G4B_RELEASE_LOCK_NOT_SATISFIED"
    },
    {
      condition: LAUNCH_CONDITIONS.COMP_COPIES,
      passed: compDispatched,
      blocker: "COMP_COPIES_NOT_DISPATCHED"
    },
    {
      condition: LAUNCH_CONDITIONS.AUTHOR_PAGE,
      passed: authorPageLive && authorPageReachable,
      blocker: authorPageLive ? "AUTHOR_PAGE_UNREACHABLE" : "AUTHOR_PAGE_NOT_LIVE"
    }
  ];
  const launchChecklistReady = launchChecklist.every((item) => item.passed);

  const marketingAgent = buildMarketingAgentReadiness(input);
  const blockers = [
    ...(!productionReady ? ["PRODUCTION_READINESS_NOT_COMPLETE"] : []),
    ...(!editorialReady ? ["EDITORIAL_COMMAND_CENTER_NOT_COMPLETE_OR_HANDOFF_NOT_APPROVED"] : []),
    ...(!distributionReady ? ["DISTRIBUTION_SETUP_READINESS_NOT_COMPLETE"] : []),
    ...(!bp06.ready ? ["BP06_AI_DISCLOSURE_NOT_PASSED_OR_NOT_APPLICABLE"] : []),
    ...(!bp09.ready ? ["BP09_COVER_VALIDATION_NOT_PASSED"] : []),
    ...(!bp10.ready || !releaseLocked ? ["BP10_RELEASE_LOCK_NOT_PASSED"] : []),
    ...(!metadataFinal ? ["TITLE_METADATA_FINAL_CONFIRMATION_REQUIRED"] : []),
    ...(!finalFilesReady ? ["FINAL_FILE_READINESS_CONFIRMATION_REQUIRED"] : []),
    ...(!launchMessagingReady ? ["LAUNCH_MESSAGING_HUMAN_APPROVAL_REQUIRED"] : []),
    ...(!authorApproved ? ["AUTHOR_APPROVAL_REQUIRED_OR_WAIVER_REQUIRED"] : []),
    ...(!publisherApproved ? ["FINAL_PUBLISHER_APPROVAL_REQUIRED"] : []),
    ...(!launchChecklistReady ? ["BP11_FOUR_GREEN_LAUNCH_READINESS_NOT_SATISFIED"] : []),
    ...(!launchGateOpen ? [`${GATES.LAUNCH_READINESS}_FALSE`] : []),
    ...(marketingAgent.gateEnabled ? ["MARKETING_AGENT_MUST_REMAIN_INACTIVE"] : [])
  ];
  const launchReleaseReadinessPermitted = blockers.length === 0;

  const readiness = {
    diagnosticId,
    intakeReferenceCode,
    opportunityId,
    productionReady,
    editorialReady,
    distributionReady,
    bp06Ready: bp06.ready === true,
    bp09Ready: bp09.ready === true,
    bp10Ready: bp10.ready === true && releaseLocked,
    metadataFinal,
    finalFilesReady,
    launchMessagingReady,
    authorApproved,
    publisherApproved: Boolean(publisherApproved),
    launchGateName: GATES.LAUNCH_READINESS,
    launchGateEnabled: launchGateOpen,
    marketingAgentGateName: GATES.MARKETING_AGENT,
    marketingAgentGateEnabled: marketingAgent.gateEnabled,
    launchChecklistReady,
    releaseLockSatisfied: releaseLocked && releaseDatePresent && bp10.ready === true,
    launchReleaseReadinessPermitted,
    blockers,
    launchChecklist,
    releaseChecklist: {
      releaseLocked,
      releaseDatePresent,
      marketingDateGateOpen: normalizeString(input.bp10?.marketingDateGate || input.release?.marketingDateGate) === "OPEN",
      publicReleaseDateAnnouncementPermitted: false
    },
    standardMarketingKitItems: STANDARD_MARKETING_KIT_ITEMS,
    humanCheckpoints: HUMAN_CHECKPOINTS,
    stopsBefore: [
      "PUBLIC_LAUNCH",
      "LIVE_RELEASE",
      "RETAILER_SUBMISSION",
      "ROYALTY_SETUP",
      "POST_RELEASE_MANAGEMENT",
      "ANNUAL_REVIEW_LOYALTY_PROGRESSION"
    ]
  };

  const bp11ReadinessCard = buildBp11ReadinessCard(input, launchChecklist);
  const taskTemplates = buildTaskTemplates();
  const taskPayloads = buildLaunchTaskPayloads(input, readiness);
  const internalNotification = buildInternalNotification(input, readiness);
  const actionDescription = [
    `Milestone 9 launch/release readiness for intake ${intakeReferenceCode}.`,
    `Existing active Opportunity ${opportunityId} used; no duplicate Opportunity created.`,
    `Launch/release readiness permitted ${launchReleaseReadinessPermitted ? "yes" : "no"}.`,
    blockers.length ? `Blockers ${blockers.join(", ")}.` : "No readiness blockers.",
    "No public launch, retailer submission, release announcement, author email, marketing campaign, BP-12 activation, royalty setup, post-release management, annual review, QBO logic, manuscript text, prompt body, raw model output, credentials, or secrets stored."
  ].join(" ");

  return {
    ok: true,
    readiness,
    upstream: { bp06, bp09, bp10 },
    marketingAgent,
    bp11ReadinessCard,
    taskTemplates,
    taskPayloads,
    internalNotification,
    schemaTargets: SCHEMA_TARGETS,
    payloads: {
      executionLogEntitySet: EXECUTION_LOG_ENTITY_SET,
      executionLogPayload: {
        jm1_name: `M9-LAUNCH-RELEASE-${diagnosticId}`,
        jm1_actiondescription: actionDescription.slice(0, 1000),
        jm1_actiontype: EVENT_TYPE,
        jm1_agentname: AGENT_NAME,
        jm1_agentmodel: "milestone-9-launch-release-readiness",
        jm1_bandlevel: BAND_LEVEL.BAND_1,
        jm1_executionstatus: EXECUTION_STATUS.SUCCESS,
        jm1_startedon: completedAt,
        jm1_completedon: completedAt,
        jm1_sourceentity: SOURCE_ENTITY,
        jm1_sourcerecordid: diagnosticId
      }
    },
    liveActions: {
      createsLaunchTasks: false,
      publishesTitle: false,
      submitsToRetailers: false,
      setsPublicReleaseDate: false,
      announcesPublicReleaseDate: false,
      sendsLaunchEmail: false,
      sendsPublicMarketingCampaign: false,
      activatesMarketingAgent: false,
      writesScheduler: false,
      createsRoyaltySetup: false,
      startsPostReleaseManagement: false,
      startsAnnualReview: false,
      createsDuplicateOpportunity: false,
      usesQboForNewLogic: false,
      exposesCredentials: false
    }
  };
}

module.exports = {
  buildMilestone9LaunchReleaseReadiness,
  buildTaskTemplates,
  buildLaunchTaskPayloads,
  buildMarketingAgentReadiness,
  GATES,
  LAUNCH_CONDITIONS,
  LAUNCH_PATHS,
  HUMAN_CHECKPOINTS,
  STANDARD_MARKETING_KIT_ITEMS,
  TASK_TEMPLATES,
  SCHEMA_TARGETS,
  INTERNAL_VISIBILITY_MAILBOX,
  EXECUTION_LOG_ENTITY_SET,
  LAUNCH_TASK_ENTITY_SET,
  EVENT_TYPE,
  SAFE_INPUT_FIELDS,
  FORBIDDEN_FIELDS
};
