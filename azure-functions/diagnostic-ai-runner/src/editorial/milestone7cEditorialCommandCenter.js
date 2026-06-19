"use strict";

/**
 * Milestone #7C governed Editorial Command Center readiness model.
 *
 * This module prepares editorial queue, stage tracker, task, notification, and
 * evidence payloads only. It does not perform editorial work, run an editorial
 * agent, rewrite manuscripts, send author-facing editorial content, activate
 * Flow D, start production, submit distribution, launch/release, or store raw
 * manuscript/prompt/model output.
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
const EDITORIAL_TASK_ENTITY_SET = "jm1_publishingtasks";
const EDITORIAL_STAGE_TABLE = "jm1pub_editorialstage";
const EVENT_TYPE = "MILESTONE_7C_EDITORIAL_COMMAND_CENTER_READINESS";
const EDITORIAL_GATE_NAME = "JM1_EDITORIAL_COMMAND_CENTER_ENABLED";

const EDITORIAL_STAGES = Object.freeze({
  REVIEW: "REVIEW",
  DEVELOPMENTAL: "DEVELOPMENTAL",
  LINE: "LINE",
  COPYEDIT: "COPYEDIT",
  PROOFREAD: "PROOFREAD",
  AUTHOR_REVISION: "AUTHOR_REVISION",
  HOLD_BLOCKED: "HOLD_BLOCKED",
  COMPLETE_READY_FOR_PRODUCTION_HANDOFF: "COMPLETE_READY_FOR_PRODUCTION_HANDOFF"
});

const EDITORIAL_STATUS = Object.freeze({
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  PLAN_DELIVERED: "PLAN_DELIVERED",
  PLAN_APPROVED: "PLAN_APPROVED",
  CALIBRATION_APPROVED: "CALIBRATION_APPROVED",
  AUTHOR_REVISION_REQUESTED: "AUTHOR_REVISION_REQUESTED",
  AUTHOR_REVISION_RECEIVED: "AUTHOR_REVISION_RECEIVED",
  ON_HOLD_BLOCKED: "ON_HOLD_BLOCKED",
  COMPLETE: "COMPLETE"
});

const HUMAN_CHECKPOINTS = Object.freeze([
  "READY_FOR_EDITORIAL_ASSIGNMENT",
  "EDITOR_ASSIGNED",
  "EDITORIAL_WORK_STARTED",
  "EDITORIAL_WORK_COMPLETED",
  "AUTHOR_REVISION_REQUESTED",
  "AUTHOR_REVISION_RECEIVED",
  "EDITORIAL_APPROVAL_PENDING",
  "FINAL_EDITORIAL_APPROVAL_COMPLETE",
  "READY_FOR_PRODUCTION_HANDOFF"
]);

const TASK_TEMPLATES = Object.freeze([
  Object.freeze({ stage: EDITORIAL_STAGES.REVIEW, taskCode: "M7C-EDITORIAL-REVIEW", taskName: "Milestone 7C Editorial Review Task", checkpoint: "READY_FOR_EDITORIAL_ASSIGNMENT" }),
  Object.freeze({ stage: EDITORIAL_STAGES.DEVELOPMENTAL, taskCode: "M7C-DEVELOPMENTAL", taskName: "Milestone 7C Developmental Editing Task", checkpoint: "EDITORIAL_WORK_STARTED" }),
  Object.freeze({ stage: EDITORIAL_STAGES.LINE, taskCode: "M7C-LINE", taskName: "Milestone 7C Line Editing Task", checkpoint: "EDITORIAL_WORK_STARTED" }),
  Object.freeze({ stage: EDITORIAL_STAGES.COPYEDIT, taskCode: "M7C-COPYEDIT", taskName: "Milestone 7C Copyediting Task", checkpoint: "EDITORIAL_WORK_STARTED" }),
  Object.freeze({ stage: EDITORIAL_STAGES.PROOFREAD, taskCode: "M7C-PROOFREAD", taskName: "Milestone 7C Proofreading Task", checkpoint: "EDITORIAL_WORK_STARTED" }),
  Object.freeze({ stage: EDITORIAL_STAGES.AUTHOR_REVISION, taskCode: "M7C-AUTHOR-REVISION", taskName: "Milestone 7C Author Revision Review Task", checkpoint: "AUTHOR_REVISION_RECEIVED" }),
  Object.freeze({ stage: EDITORIAL_STAGES.COMPLETE_READY_FOR_PRODUCTION_HANDOFF, taskCode: "M7C-FINAL-EDITORIAL-APPROVAL", taskName: "Milestone 7C Final Editorial Approval Task", checkpoint: "FINAL_EDITORIAL_APPROVAL_COMPLETE" }),
  Object.freeze({ stage: EDITORIAL_STAGES.COMPLETE_READY_FOR_PRODUCTION_HANDOFF, taskCode: "M7C-PRODUCTION-HANDOFF", taskName: "Milestone 7C Production Handoff Task", checkpoint: "READY_FOR_PRODUCTION_HANDOFF" })
]);

const TRANSITIONS = Object.freeze({
  [EDITORIAL_STAGES.REVIEW]: Object.freeze([
    EDITORIAL_STAGES.DEVELOPMENTAL,
    EDITORIAL_STAGES.LINE,
    EDITORIAL_STAGES.COPYEDIT,
    EDITORIAL_STAGES.PROOFREAD,
    EDITORIAL_STAGES.AUTHOR_REVISION,
    EDITORIAL_STAGES.HOLD_BLOCKED,
    EDITORIAL_STAGES.COMPLETE_READY_FOR_PRODUCTION_HANDOFF
  ]),
  [EDITORIAL_STAGES.DEVELOPMENTAL]: Object.freeze([
    EDITORIAL_STAGES.LINE,
    EDITORIAL_STAGES.AUTHOR_REVISION,
    EDITORIAL_STAGES.HOLD_BLOCKED
  ]),
  [EDITORIAL_STAGES.LINE]: Object.freeze([
    EDITORIAL_STAGES.COPYEDIT,
    EDITORIAL_STAGES.AUTHOR_REVISION,
    EDITORIAL_STAGES.HOLD_BLOCKED
  ]),
  [EDITORIAL_STAGES.COPYEDIT]: Object.freeze([
    EDITORIAL_STAGES.PROOFREAD,
    EDITORIAL_STAGES.AUTHOR_REVISION,
    EDITORIAL_STAGES.HOLD_BLOCKED
  ]),
  [EDITORIAL_STAGES.PROOFREAD]: Object.freeze([
    EDITORIAL_STAGES.AUTHOR_REVISION,
    EDITORIAL_STAGES.HOLD_BLOCKED,
    EDITORIAL_STAGES.COMPLETE_READY_FOR_PRODUCTION_HANDOFF
  ]),
  [EDITORIAL_STAGES.AUTHOR_REVISION]: Object.freeze([
    EDITORIAL_STAGES.REVIEW,
    EDITORIAL_STAGES.DEVELOPMENTAL,
    EDITORIAL_STAGES.LINE,
    EDITORIAL_STAGES.COPYEDIT,
    EDITORIAL_STAGES.PROOFREAD,
    EDITORIAL_STAGES.HOLD_BLOCKED
  ]),
  [EDITORIAL_STAGES.HOLD_BLOCKED]: Object.freeze([
    EDITORIAL_STAGES.REVIEW,
    EDITORIAL_STAGES.DEVELOPMENTAL,
    EDITORIAL_STAGES.LINE,
    EDITORIAL_STAGES.COPYEDIT,
    EDITORIAL_STAGES.PROOFREAD,
    EDITORIAL_STAGES.AUTHOR_REVISION
  ]),
  [EDITORIAL_STAGES.COMPLETE_READY_FOR_PRODUCTION_HANDOFF]: Object.freeze([])
});

const SAFE_INPUT_FIELDS = Object.freeze([
  "diagnosticId",
  "intakeReferenceCode",
  "opportunity",
  "project",
  "author",
  "package",
  "agreement",
  "onboarding",
  "payment",
  "editorial",
  "artifacts",
  "transition",
  "commandCenterGateEnabled",
  "dataverse",
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
  "editedManuscriptText",
  "rewriteText",
  "autonomousRewrite",
  "authorFacingEditorialContent",
  "sendToAuthor",
  "authorEmailSent",
  "contractSent",
  "stripePaymentLink",
  "invoiceUrl",
  "startProduction",
  "productionStarted",
  "distributionSubmitted",
  "ingramSubmissionId",
  "retailerSubmissionId",
  "publishNow",
  "releaseDate",
  "releaseStarted",
  "launchStarted",
  "royaltySetupStarted",
  "qboInvoiceId",
  "headers",
  "authorization",
  "cookies",
  "tokens",
  "apiKey",
  "secret"
]);

const EDITORIAL_STAGE_SCHEMA_PLAN = Object.freeze({
  table: EDITORIAL_STAGE_TABLE,
  entitySetName: "jm1pub_editorialstages",
  primaryIdAttribute: "jm1pub_editorialstageid",
  primaryNameAttribute: "jm1pub_name",
  solutionUniqueName: "JM1_Publishing",
  solutionComponentConfirmed: true,
  currentStatus: "CONFIRMED_IN_DATAVERSE",
  verifiedAt: "2026-06-19",
  requiredBeforeLiveTrackerActivation: false,
  fields: Object.freeze([
    "jm1pub_name",
    "jm1pub_intakereference",
    "jm1pub_diagnosticid",
    "jm1pub_opportunityreference",
    "jm1pub_publishingintakereference",
    "jm1pub_projecttitle",
    "jm1pub_author",
    "jm1pub_selectedpackage",
    "jm1pub_imprintpath",
    "jm1pub_stagetype",
    "jm1pub_stagestatus",
    "jm1pub_phase",
    "jm1pub_assignedownereditor",
    "jm1pub_duedate",
    "jm1pub_blockerstatus",
    "jm1pub_blockerreason",
    "jm1pub_authorrevisionrequired",
    "jm1pub_authorrevisionrequesteddate",
    "jm1pub_authorrevisionreceiveddate",
    "jm1pub_stylesheeturl",
    "jm1pub_editorialdeliverableurl",
    "jm1pub_finaleditorialapprovalstatus",
    "jm1pub_productionhandoffapprovalstatus",
    "jm1pub_internalvisibilitystatus",
    "jm1pub_executionlogcorrelationreference",
    "jm1pub_voiceflag",
    "jm1pub_retentionfail",
    "jm1pub_hardstopflag",
    "jm1pub_flagnote",
    "jm1pub_stagestartdate",
    "jm1pub_stagecompletedate"
  ])
});

const EDITORIAL_AGENT_READINESS = Object.freeze({
  agentId: "jm1-agent-pub-editorial-01",
  status: "PROPOSED_NOT_ACTIVE",
  futureCapabilities: Object.freeze([
    "EDITORIAL_REVIEW_SUPPORT",
    "DEVELOPMENTAL_EDIT_SUPPORT",
    "LINE_EDIT_SUPPORT",
    "COPYEDIT_PROOFREAD_SUPPORT",
    "ISSUE_DETECTION",
    "STYLE_SHEET_GENERATION",
    "EDITORIAL_RECOMMENDATION_DRAFTING",
    "HUMAN_REVIEW_PACKET_GENERATION"
  ]),
  humanApprovalRequired: true,
  autonomousManuscriptRewritePermitted: false,
  autonomousAuthorDeliveryPermitted: false,
  rawManuscriptLoggingPermitted: false,
  promptBodyLoggingPermitted: false,
  rawModelOutputLoggingPermitted: false
});

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
    code: "MILESTONE_7C_EDITORIAL_COMMAND_CENTER_BLOCKED",
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

function isValidStage(stage) {
  return Object.values(EDITORIAL_STAGES).includes(normalizeString(stage));
}

function buildTaskTemplates() {
  return TASK_TEMPLATES.map((template) => Object.freeze({
    ...template,
    entitySet: EDITORIAL_TASK_ENTITY_SET,
    taskPayloadCreated: false,
    taskCreatedInDataverse: false
  }));
}

function evaluateStageTransition(transition = {}) {
  const fromStage = normalizeString(transition.fromStage);
  const toStage = normalizeString(transition.toStage);
  if (!fromStage && !toStage) {
    return {
      requested: false,
      allowed: false,
      reason: "NO_TRANSITION_REQUESTED"
    };
  }
  if (!isValidStage(fromStage) || !isValidStage(toStage)) {
    return {
      requested: true,
      allowed: false,
      reason: "INVALID_EDITORIAL_STAGE",
      fromStage: fromStage || null,
      toStage: toStage || null
    };
  }
  const allowed = TRANSITIONS[fromStage].includes(toStage);
  return {
    requested: true,
    allowed,
    reason: allowed ? "TRANSITION_ALLOWED" : "TRANSITION_BLOCKED",
    fromStage,
    toStage
  };
}

function resolveDoctrineOverlay(input) {
  const imprintPath = normalizeString(input.editorial?.imprintPath || input.project?.imprintPath);
  const faithContext = input.editorial?.faithContext === true;
  const childrenContext = input.editorial?.childrenContext === true;
  const streetLitContext = input.editorial?.streetLitContext === true;
  const overlays = [
    ...(faithContext || ["J_MERRILL", "JM_LITTLE", "JM_SIGNATURE"].includes(imprintPath) ? ["FAITH_INSPIRATIONAL"] : []),
    ...(streetLitContext ? ["URBAN_STREET_LIT_VOICE_PRESERVATION"] : []),
    ...(childrenContext || imprintPath === "JM_LITTLE" ? ["CHILDRENS_BOOK_STANDARD"] : [])
  ];
  return {
    applies: overlays.length > 0,
    internalOnly: true,
    overlays,
    authorFacingReferencePermitted: false,
    doNotOverApplyToNonFaithTitles: true
  };
}

function buildEditorialQueueItem(input, readiness) {
  return {
    diagnosticId: readiness.diagnosticId,
    intakeReferenceCode: readiness.intakeReferenceCode,
    opportunityId: readiness.opportunityId,
    authorName: normalizeString(input.author?.name) || null,
    projectTitle: normalizeString(input.project?.title) || null,
    selectedPackageCode: readiness.selectedPackageCode,
    imprintPath: normalizeString(input.editorial?.imprintPath || input.project?.imprintPath) || null,
    currentEditorialStage: readiness.currentEditorialStage,
    currentProductionPhase: "J3_EDITORIAL_COMMAND_CENTER",
    assignedOwner: normalizeString(input.editorial?.assignedOwner) || null,
    assignedEditor: normalizeString(input.editorial?.assignedEditor) || null,
    dueDate: normalizeString(input.editorial?.dueDate) || null,
    blockerStatus: normalizeString(input.editorial?.blockerStatus) || "NONE",
    humanReviewStatus: normalizeString(input.editorial?.humanReviewStatus) || "PENDING",
    authorRevisionStatus: normalizeString(input.editorial?.authorRevisionStatus) || "NOT_REQUESTED",
    proofingStatus: normalizeString(input.editorial?.proofingStatus) || "NOT_STARTED",
    finalEditorialApprovalStatus: normalizeString(input.editorial?.finalEditorialApprovalStatus) || "PENDING",
    productionHandoffReadiness: readiness.productionHandoffReady ? "READY" : "NOT_READY",
    styleSheetReference: normalizeString(input.artifacts?.styleSheetUrl || input.artifacts?.styleSheetReference) || null,
    editorialDeliverableReference: normalizeString(input.artifacts?.editorialDeliverableUrl || input.artifacts?.editorialDeliverableReference) || null,
    internalNotesReference: normalizeString(input.artifacts?.internalNotesReference) || null,
    evidenceReference: normalizeString(input.artifacts?.evidenceReference) || null
  };
}

function buildEditorialTaskPayloads(input, readiness) {
  if (!readiness.commandCenterReady) return [];

  const projectTitle = normalizeString(input.project?.title) || "Publishing project";
  const dueDate = normalizeString(input.editorial?.dueDate) || null;
  return TASK_TEMPLATES.map((template) => Object.freeze({
    entitySet: EDITORIAL_TASK_ENTITY_SET,
    stage: template.stage,
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
    subject: `Milestone 7C editorial command center: ${input.intakeReferenceCode}`,
    safePreview: [
      `Milestone 7C editorial command center readiness evaluated for ${input.intakeReferenceCode}.`,
      `Command center ready: ${readiness.commandCenterReady ? "yes" : "no"}.`,
      `Current stage: ${readiness.currentEditorialStage}.`,
      `Blocking conditions: ${readiness.blockers.length ? readiness.blockers.join(", ") : "none"}.`,
      "No editorial agent run, manuscript rewrite, author-facing editorial delivery, production start, distribution, launch, or release was performed."
    ].join(" ")
  };
}

function buildMilestone7cEditorialCommandCenter(input = {}) {
  if (!isPlainObject(input)) return safeFailure("INVALID_MILESTONE_7C_INPUT");
  if (!hasOnlySafeTopLevelFields(input) || hasForbiddenFieldDeep(input)) return safeFailure("UNSAFE_FIELD_PRESENT", input);

  const diagnosticId = normalizeString(input.diagnosticId);
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode);
  if (!diagnosticId || !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) return safeFailure("DIAGNOSTIC_ID_INVALID", input);
  if (!intakeReferenceCode || !INTAKE_REFERENCE_PATTERN.test(intakeReferenceCode)) return safeFailure("INTAKE_REFERENCE_CODE_INVALID", input);

  const opportunityId = normalizeString(input.opportunity?.opportunityId || input.opportunity?.id);
  if (!opportunityId) return safeFailure("EXISTING_OPPORTUNITY_REQUIRED", input);
  if (input.opportunity?.active !== true) return safeFailure("ACTIVE_OPPORTUNITY_REQUIRED", input);

  const selectedPackageCode = normalizeString(input.package?.selectedPackageCode || input.opportunity?.authorSelectedPackageCode);
  const packageSelectionConfirmed = normalizeString(input.package?.selectionStatus || input.opportunity?.packageSelectionStatus) === "PACKAGE_SELECTED" && Boolean(selectedPackageCode);
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
  const assignedOwnerReady = requiredString(input.editorial?.assignedOwner);
  const currentEditorialStage = normalizeString(input.editorial?.currentStage) || EDITORIAL_STAGES.REVIEW;
  const currentStageValid = isValidStage(currentEditorialStage);
  const styleSheetReady = currentEditorialStage !== EDITORIAL_STAGES.COMPLETE_READY_FOR_PRODUCTION_HANDOFF ||
    requiredString(input.artifacts?.styleSheetUrl || input.artifacts?.styleSheetReference);
  const finalApprovalComplete = normalizeString(input.editorial?.finalEditorialApprovalStatus) === "APPROVED";
  const productionHandoffApproved = input.editorial?.productionHandoffApproved === true;
  const productionHandoffReady = currentEditorialStage === EDITORIAL_STAGES.COMPLETE_READY_FOR_PRODUCTION_HANDOFF &&
    finalApprovalComplete &&
    productionHandoffApproved &&
    styleSheetReady;
  const gateEnabled = input.commandCenterGateEnabled === true;
  const editorialStageTableAvailable = input.dataverse?.editorialStageTableExists === true;
  const transition = evaluateStageTransition(input.transition);

  const blockers = [
    ...(!packageSelectionConfirmed ? ["AUTHOR_PACKAGE_SELECTION_REQUIRED"] : []),
    ...(!agreementSatisfied ? ["AGREEMENT_REQUIREMENT_NOT_SATISFIED"] : []),
    ...(!onboardingSatisfied ? ["ONBOARDING_REQUIREMENT_NOT_SATISFIED"] : []),
    ...(!paymentSatisfied ? ["PAYMENT_OR_WAIVER_REQUIRED"] : []),
    ...(!assignedOwnerReady ? ["EDITORIAL_OWNER_REQUIRED"] : []),
    ...(!currentStageValid ? ["CURRENT_EDITORIAL_STAGE_INVALID"] : []),
    ...(!editorialStageTableAvailable ? [`${EDITORIAL_STAGE_TABLE}_SCHEMA_NOT_CONFIRMED`] : []),
    ...(!gateEnabled ? [`${EDITORIAL_GATE_NAME}_FALSE`] : []),
    ...(transition.requested && !transition.allowed ? ["EDITORIAL_TRANSITION_BLOCKED"] : []),
    ...(!styleSheetReady ? ["STYLE_SHEET_REQUIRED_BEFORE_FINAL_HANDOFF"] : [])
  ];
  const commandCenterReady = blockers.length === 0;

  const readiness = {
    diagnosticId,
    intakeReferenceCode,
    opportunityId,
    selectedPackageCode: selectedPackageCode || null,
    packageSelectionConfirmed,
    agreementSatisfied,
    onboardingSatisfied,
    paymentSatisfied,
    assignedOwnerReady,
    currentEditorialStage,
    currentStageValid,
    productionHandoffReady,
    editorialGateName: EDITORIAL_GATE_NAME,
    commandCenterGateEnabled: gateEnabled,
    editorialStageTableAvailable,
    commandCenterReady,
    blockers,
    stages: Object.values(EDITORIAL_STAGES),
    statuses: Object.values(EDITORIAL_STATUS),
    humanCheckpoints: HUMAN_CHECKPOINTS,
    stopsBefore: [
      "FLOW_D_ACTIVATION",
      "AUTONOMOUS_EDITORIAL_AGENT_RUN",
      "AUTHOR_FACING_EDITORIAL_DELIVERY",
      "PRODUCTION_START",
      "DISTRIBUTION_SETUP",
      "LAUNCH_RELEASE",
      "ROYALTY_SETUP"
    ]
  };

  const completedAt = normalizeString(input.completedAt) || new Date().toISOString();
  const taskTemplates = buildTaskTemplates();
  const taskPayloads = buildEditorialTaskPayloads(input, readiness);
  const editorialQueueItem = buildEditorialQueueItem(input, readiness);
  const internalNotification = buildInternalNotification(input, readiness);
  const doctrineOverlay = resolveDoctrineOverlay(input);
  const actionDescription = [
    `Milestone 7C editorial command center readiness for intake ${intakeReferenceCode}.`,
    `Existing active Opportunity ${opportunityId} used; no duplicate Opportunity created.`,
    `Current editorial stage ${currentEditorialStage}.`,
    `Command center ready ${commandCenterReady ? "yes" : "no"}.`,
    blockers.length ? `Blockers ${blockers.join(", ")}.` : "No readiness blockers.",
    "No Flow D activation, autonomous editorial agent run, manuscript rewrite, author-facing editorial delivery, production start, distribution setup, launch/release, royalty setup, QBO logic, manuscript text, prompt body, raw model output, credentials, or secrets stored."
  ].join(" ");

  return {
    ok: true,
    readiness,
    transition,
    editorialQueueItem,
    taskTemplates,
    taskPayloads,
    schemaPlan: EDITORIAL_STAGE_SCHEMA_PLAN,
    doctrineOverlay,
    editorialAgentReadiness: EDITORIAL_AGENT_READINESS,
    internalNotification,
    payloads: {
      executionLogEntitySet: EXECUTION_LOG_ENTITY_SET,
      executionLogPayload: {
        jm1_name: `M7C-EDITORIAL-COMMAND-CENTER-${diagnosticId}`,
        jm1_actiondescription: actionDescription.slice(0, 1000),
        jm1_actiontype: EVENT_TYPE,
        jm1_agentname: AGENT_NAME,
        jm1_agentmodel: "milestone-7c-editorial-command-center",
        jm1_bandlevel: BAND_LEVEL.BAND_1,
        jm1_executionstatus: EXECUTION_STATUS.SUCCESS,
        jm1_startedon: completedAt,
        jm1_completedon: completedAt,
        jm1_sourceentity: SOURCE_ENTITY,
        jm1_sourcerecordid: diagnosticId
      }
    },
    liveActions: {
      createsEditorialStageRows: false,
      createsPublishingTasks: false,
      runsEditorialAgent: false,
      performsEditorialJudgment: false,
      rewritesManuscript: false,
      sendsAuthorFacingEditorialContent: false,
      sendsAuthorEmail: false,
      activatesFlowD: false,
      startsProduction: false,
      assignsIsbn: false,
      startsDistributionSetup: false,
      submitsToIngram: false,
      publishesRetailListing: false,
      startsLaunchRelease: false,
      startsRoyaltySetup: false,
      createsDuplicateOpportunity: false,
      usesQboForNewLogic: false,
      exposesCredentials: false
    }
  };
}

module.exports = {
  buildMilestone7cEditorialCommandCenter,
  buildTaskTemplates,
  buildEditorialTaskPayloads,
  evaluateStageTransition,
  resolveDoctrineOverlay,
  EDITORIAL_GATE_NAME,
  EDITORIAL_STAGES,
  EDITORIAL_STATUS,
  TRANSITIONS,
  HUMAN_CHECKPOINTS,
  TASK_TEMPLATES,
  INTERNAL_VISIBILITY_MAILBOX,
  EXECUTION_LOG_ENTITY_SET,
  EDITORIAL_TASK_ENTITY_SET,
  EDITORIAL_STAGE_TABLE,
  EDITORIAL_STAGE_SCHEMA_PLAN,
  EDITORIAL_AGENT_READINESS,
  EVENT_TYPE,
  SAFE_INPUT_FIELDS,
  FORBIDDEN_FIELDS
};
