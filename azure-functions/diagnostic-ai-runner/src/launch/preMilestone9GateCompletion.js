"use strict";

/**
 * Pre-Milestone #9 gate completion and Milestone #9 launch-readiness models.
 *
 * These builders prepare governed state/evidence only. They do not activate
 * flows, send ACS messages, submit distribution, set public release dates,
 * create royalty setup, start post-release work, or run public marketing.
 */

const { DIAGNOSTIC_ID_PATTERN, INTAKE_REFERENCE_PATTERN } = require("../queue/diagnosticQueueSelector");
const {
  AGENT_NAME,
  BAND_LEVEL,
  EXECUTION_STATUS,
  SOURCE_ENTITY
} = require("../dataverse/metadataWriter");

const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const INTERNAL_VISIBILITY_MAILBOX = "publishing@jmerrill.one";

const GATES = Object.freeze({
  AI_DISCLOSURE_CAPTURE: "JM1_AI_DISCLOSURE_CAPTURE_ENABLED",
  COVER_VALIDATION: "JM1_COVER_VALIDATION_ENABLED",
  RELEASE_LOCK: "JM1_RELEASE_LOCK_ENABLED",
  LAUNCH_READINESS: "JM1_LAUNCH_READINESS_ENABLED",
  MARKETING_AGENT: "JM1_MARKETING_AGENT_ENABLED"
});

const EVENT_TYPES = Object.freeze({
  BP06: "PRE_M9_BP06_AI_DISCLOSURE_CAPTURE_READY",
  BP09: "PRE_M9_BP09_COVER_VALIDATION_READY",
  BP10: "PRE_M9_BP10_RELEASE_LOCK_READY",
  M9: "MILESTONE_9_LAUNCH_READINESS_READY"
});

const DISCLOSURE_STATUS = Object.freeze({
  PENDING: "PENDING",
  RECORDED: "RECORDED",
  FLAGGED: "FLAGGED"
});

const COVER_STATUS = Object.freeze({
  NOT_SUBMITTED: "NOT_SUBMITTED",
  SUBMITTED: "SUBMITTED",
  VALIDATED: "VALIDATED",
  FAILED: "FAILED"
});

const MARKETING_DATE_GATE = Object.freeze({
  CLOSED: "CLOSED",
  OPEN: "OPEN"
});

const LAUNCH_ASSETS = Object.freeze([
  "AUTHOR_MARKETING_KIT",
  "RETAILER_COPY",
  "AUTHOR_PAGE",
  "LAUNCH_POSTS",
  "COMP_COPY_PLAN",
  "INTERNAL_VISIBILITY_LOG"
]);

const SAFE_INPUT_FIELDS = Object.freeze([
  "diagnosticId",
  "intakeReferenceCode",
  "project",
  "title",
  "author",
  "opportunity",
  "bp06",
  "bp09",
  "bp10",
  "milestone9",
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
  "secret",
  "apiKey",
  "token",
  "headers",
  "authorization",
  "cookies",
  "sendAuthorEmail",
  "releaseEmailSent",
  "launchEmailSent",
  "publicReleaseDateSet",
  "submitToIngram",
  "submitToCoreSource",
  "submitToKdp",
  "submitToRetailer",
  "royaltySetupStarted",
  "postReleaseWorkStarted",
  "qboInvoiceId"
]);

const SCHEMA_TARGETS = Object.freeze({
  BP06_PROJECT_FIELDS: Object.freeze([
    "jm1pub_manuscriptreceived",
    "jm1pub_manuscriptreceiveddate",
    "jm1pub_manuscripturl",
    "jm1pub_aidisclosurestatus",
    "jm1pub_aidisclosurepct",
    "jm1pub_aidisclosureportions",
    "jm1pub_aidisclosureurl",
    "jm1pub_aidisclosuredate",
    "jm1pub_overcapadvisory"
  ]),
  BP09_TITLE_FIELDS: Object.freeze([
    "jm1pub_printcoverstatus",
    "jm1pub_digitalcoverstatus",
    "jm1pub_printcoverurl",
    "jm1pub_digitalcoverurl",
    "jm1pub_g4apassed",
    "jm1pub_g4adate",
    "jm1pub_covervalidationreport",
    "jm1pub_coverfailreasons",
    "jm1pub_trimsize",
    "jm1pub_pagecount",
    "jm1pub_paperstock",
    "jm1pub_trimsizecustom"
  ]),
  BP10_PROJECT_TITLE_FIELDS: Object.freeze([
    "jm1pub_paymentstatus",
    "jm1pub_releasedate",
    "jm1pub_releaselocked",
    "jm1pub_g4bpassed",
    "jm1pub_g4bdate",
    "jm1pub_marketingdategate",
    "jm1pub_releaseoverridereason"
  ])
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
    code: "PRE_MILESTONE_9_GATE_COMPLETION_BLOCKED",
    reason,
    diagnosticId: normalizeString(input?.diagnosticId) || null,
    intakeReferenceCode: normalizeString(input?.intakeReferenceCode) || null
  };
}

function validateBaseInput(input) {
  if (!isPlainObject(input)) return safeFailure("INVALID_PRE_M9_INPUT");
  if (!hasOnlySafeTopLevelFields(input) || hasForbiddenFieldDeep(input)) return safeFailure("UNSAFE_FIELD_PRESENT", input);
  const diagnosticId = normalizeString(input.diagnosticId);
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode);
  if (!diagnosticId || !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) return safeFailure("DIAGNOSTIC_ID_INVALID", input);
  if (!intakeReferenceCode || !INTAKE_REFERENCE_PATTERN.test(intakeReferenceCode)) return safeFailure("INTAKE_REFERENCE_CODE_INVALID", input);
  if (normalizeString(input.project?.type) === "LEGACY") return safeFailure("LEGACY_PROJECT_EXCLUDED", input);
  return null;
}

function gateEnabled(input, gateName) {
  return input.gates?.[gateName] === true;
}

function buildExecutionLogPayload(input, eventType, description) {
  const completedAt = normalizeString(input.completedAt) || new Date().toISOString();
  return {
    executionLogEntitySet: EXECUTION_LOG_ENTITY_SET,
    executionLogPayload: {
      jm1_name: `${eventType}-${input.diagnosticId}`,
      jm1_actiondescription: description.slice(0, 1000),
      jm1_actiontype: eventType,
      jm1_agentname: AGENT_NAME,
      jm1_agentmodel: "pre-milestone-9-gate-completion",
      jm1_bandlevel: BAND_LEVEL.BAND_1,
      jm1_executionstatus: EXECUTION_STATUS.SUCCESS,
      jm1_startedon: completedAt,
      jm1_completedon: completedAt,
      jm1_sourceentity: SOURCE_ENTITY,
      jm1_sourcerecordid: input.diagnosticId
    }
  };
}

function buildBp06AiDisclosureCapture(input = {}) {
  const failure = validateBaseInput(input);
  if (failure) return failure;

  const manuscriptReceived = input.bp06?.manuscriptReceived === true;
  const disclosureStatus = normalizeString(input.bp06?.aiDisclosureStatus);
  const disclosureRecorded = disclosureStatus === DISCLOSURE_STATUS.RECORDED;
  const pct = Number(input.bp06?.aiDisclosurePct);
  const pctValid = Number.isFinite(pct) && pct >= 0 && pct <= 100;
  const portionsPresent = normalizeString(input.bp06?.aiDisclosurePortions).length > 0;
  const gateOpen = gateEnabled(input, GATES.AI_DISCLOSURE_CAPTURE);
  const blockers = [
    ...(!manuscriptReceived ? ["MANUSCRIPT_NOT_RECEIVED"] : []),
    ...(!disclosureRecorded ? ["AI_DISCLOSURE_NOT_RECORDED"] : []),
    ...(!pctValid ? ["AI_DISCLOSURE_PERCENT_INVALID"] : []),
    ...(!portionsPresent ? ["AI_DISCLOSURE_PORTIONS_REQUIRED"] : []),
    ...(!gateOpen ? [`${GATES.AI_DISCLOSURE_CAPTURE}_FALSE`] : [])
  ];
  const ready = blockers.length === 0;

  return {
    ok: true,
    gate: GATES.AI_DISCLOSURE_CAPTURE,
    ready,
    blockers,
    schemaFields: SCHEMA_TARGETS.BP06_PROJECT_FIELDS,
    status: disclosureStatus || DISCLOSURE_STATUS.PENDING,
    zeroDisclosureComplete: pct === 0 && portionsPresent,
    routeBackCadence: ["DAY_0", "DAY_3", "DAY_7_ESCALATE_TO_JACKIE"],
    overCapAdvisoryInternalOnly: input.bp06?.overCapAdvisory === true,
    payloads: buildExecutionLogPayload(input, EVENT_TYPES.BP06, [
      `BP-06 AI disclosure capture readiness for ${input.intakeReferenceCode}.`,
      `Ready ${ready ? "yes" : "no"}.`,
      blockers.length ? `Blockers ${blockers.join(", ")}.` : "No readiness blockers.",
      "No author disclosure reminder sent, no ACS send, no breach language, no manuscript text, prompt body, raw model output, or secrets stored."
    ].join(" ")),
    liveActions: {
      sendsDisclosureReminder: false,
      escalatesToJackieLive: false,
      advancesJourneyStage: false,
      runsAiCapJudgment: false
    }
  };
}

function buildBp09CoverValidation(input = {}) {
  const failure = validateBaseInput(input);
  if (failure) return failure;

  const printStatus = normalizeString(input.bp09?.printCoverStatus);
  const digitalStatus = normalizeString(input.bp09?.digitalCoverStatus);
  const specsPresent = Boolean(input.bp09?.trimSize && input.bp09?.pageCount && input.bp09?.paperStock);
  const isbnAvailable = input.bp09?.isbnAvailable === true;
  const gateOpen = gateEnabled(input, GATES.COVER_VALIDATION);
  const bothValidated = printStatus === COVER_STATUS.VALIDATED && digitalStatus === COVER_STATUS.VALIDATED;
  const blockers = [
    ...(!specsPresent ? ["TITLE_PRODUCTION_SPECS_REQUIRED"] : []),
    ...(!isbnAvailable ? ["ISBN_REQUIRED_FOR_PRINT_BARCODE_CHECK"] : []),
    ...(printStatus !== COVER_STATUS.VALIDATED ? ["PRINT_COVER_NOT_VALIDATED"] : []),
    ...(digitalStatus !== COVER_STATUS.VALIDATED ? ["DIGITAL_COVER_NOT_VALIDATED"] : []),
    ...(!gateOpen ? [`${GATES.COVER_VALIDATION}_FALSE`] : [])
  ];
  const ready = blockers.length === 0;

  return {
    ok: true,
    gate: GATES.COVER_VALIDATION,
    ready,
    blockers,
    schemaFields: SCHEMA_TARGETS.BP09_TITLE_FIELDS,
    bothAssetsRequired: true,
    partialPassPermitted: false,
    deterministicInspectionOnly: true,
    spineTolerance: "+/- 1/16 inch",
    g4aPassedPrepared: ready && bothValidated,
    payloads: buildExecutionLogPayload(input, EVENT_TYPES.BP09, [
      `BP-09 cover validation readiness for ${input.intakeReferenceCode}.`,
      `Ready ${ready ? "yes" : "no"}.`,
      blockers.length ? `Blockers ${blockers.join(", ")}.` : "No readiness blockers.",
      "No distribution submission, no release lock, no AI inspection, no credentials, and no silent pass."
    ].join(" ")),
    liveActions: {
      inspectsCoverAsset: false,
      writesG4aPassLive: false,
      submitsDistribution: false,
      startsReleaseLock: false
    }
  };
}

function buildBp10ReleaseLock(input = {}) {
  const failure = validateBaseInput(input);
  if (failure) return failure;

  const g4aPassed = input.bp10?.g4aPassed === true;
  const paymentCleared = normalizeString(input.bp10?.paymentStatus) === "PAID_IN_FULL_CLEARED";
  const releaseDate = normalizeString(input.bp10?.proposedReleaseDate);
  const alreadyLocked = input.bp10?.releaseLocked === true;
  const gateOpen = gateEnabled(input, GATES.RELEASE_LOCK);
  const blockers = [
    ...(!g4aPassed ? ["G4A_COVER_VALIDATION_REQUIRED"] : []),
    ...(!paymentCleared ? ["PAID_IN_FULL_CLEARED_REQUIRED"] : []),
    ...(!releaseDate ? ["PROPOSED_RELEASE_DATE_REQUIRED"] : []),
    ...(alreadyLocked ? ["RELEASE_ALREADY_LOCKED"] : []),
    ...(!gateOpen ? [`${GATES.RELEASE_LOCK}_FALSE`] : [])
  ];
  const ready = blockers.length === 0;

  return {
    ok: true,
    gate: GATES.RELEASE_LOCK,
    ready,
    blockers,
    schemaFields: SCHEMA_TARGETS.BP10_PROJECT_TITLE_FIELDS,
    marketingDateGatePrepared: ready ? MARKETING_DATE_GATE.OPEN : MARKETING_DATE_GATE.CLOSED,
    releaseDateSource: "JACKIE_SET_PROPOSED_DATE_ONLY",
    clearedFundsAuthority: "JACKIE_ONLY_PHASE_A",
    authorMessageRequiresActualLockedDate: true,
    payloads: buildExecutionLogPayload(input, EVENT_TYPES.BP10, [
      `BP-10 release lock readiness for ${input.intakeReferenceCode}.`,
      `Ready ${ready ? "yes" : "no"}.`,
      blockers.length ? `Blockers ${blockers.join(", ")}.` : "No readiness blockers.",
      "No release date locked, no author ACS sent, no distribution submission triggered, no marketing date gate opened live."
    ].join(" ")),
    liveActions: {
      locksReleaseDate: false,
      opensMarketingDateGate: false,
      triggersDistributionSubmission: false,
      sendsReleaseConfirmation: false,
      overridesReleaseDate: false
    }
  };
}

function buildMilestone9LaunchReadiness(input = {}) {
  const failure = validateBaseInput(input);
  if (failure) return failure;

  const bp06 = buildBp06AiDisclosureCapture(input);
  const bp09 = buildBp09CoverValidation(input);
  const bp10 = buildBp10ReleaseLock(input);
  const gateOpen = gateEnabled(input, GATES.LAUNCH_READINESS);
  const marketingAgentGateOpen = gateEnabled(input, GATES.MARKETING_AGENT);
  const kitComplete = input.milestone9?.authorMarketingKitComplete === true;
  const authorPageReady = input.milestone9?.authorPageReady === true;
  const compCopyPlanReady = input.milestone9?.compCopyPlanReady === true;
  const launchCopyApproved = input.milestone9?.launchCopyApproved === true;
  const blockers = [
    ...(!bp06.ready ? ["BP06_AI_DISCLOSURE_GATE_NOT_READY"] : []),
    ...(!bp09.ready ? ["BP09_COVER_VALIDATION_GATE_NOT_READY"] : []),
    ...(!bp10.ready ? ["BP10_RELEASE_LOCK_GATE_NOT_READY"] : []),
    ...(!kitComplete ? ["AUTHOR_MARKETING_KIT_REQUIRED"] : []),
    ...(!authorPageReady ? ["AUTHOR_PAGE_REQUIRED"] : []),
    ...(!compCopyPlanReady ? ["COMP_COPY_PLAN_REQUIRED"] : []),
    ...(!launchCopyApproved ? ["LAUNCH_COPY_HUMAN_APPROVAL_REQUIRED"] : []),
    ...(!gateOpen ? [`${GATES.LAUNCH_READINESS}_FALSE`] : []),
    ...(marketingAgentGateOpen ? ["MARKETING_AGENT_MUST_REMAIN_INACTIVE_FOR_READINESS_PASS"] : [])
  ];
  const ready = blockers.length === 0;

  return {
    ok: true,
    gate: GATES.LAUNCH_READINESS,
    ready,
    blockers,
    upstream: { bp06, bp09, bp10 },
    launchAssets: LAUNCH_ASSETS,
    internalVisibility: {
      to: INTERNAL_VISIBILITY_MAILBOX,
      cc: [],
      bcc: []
    },
    payloads: buildExecutionLogPayload(input, EVENT_TYPES.M9, [
      `Milestone 9 launch readiness for ${input.intakeReferenceCode}.`,
      `Ready ${ready ? "yes" : "no"}.`,
      blockers.length ? `Blockers ${blockers.join(", ")}.` : "No readiness blockers.",
      "No public release date set, launch email sent, retailer submission, royalty setup, post-release work, or marketing agent activation."
    ].join(" ")),
    liveActions: {
      startsMilestone9PublicLaunch: false,
      setsPublicReleaseDate: false,
      sendsLaunchEmail: false,
      schedulesPublicCampaign: false,
      activatesMarketingAgent: false,
      submitsToRetailers: false,
      createsRoyaltySetup: false,
      startsPostReleaseWork: false
    }
  };
}

module.exports = {
  buildBp06AiDisclosureCapture,
  buildBp09CoverValidation,
  buildBp10ReleaseLock,
  buildMilestone9LaunchReadiness,
  GATES,
  EVENT_TYPES,
  DISCLOSURE_STATUS,
  COVER_STATUS,
  MARKETING_DATE_GATE,
  LAUNCH_ASSETS,
  SCHEMA_TARGETS,
  SAFE_INPUT_FIELDS,
  FORBIDDEN_FIELDS,
  INTERNAL_VISIBILITY_MAILBOX
};
