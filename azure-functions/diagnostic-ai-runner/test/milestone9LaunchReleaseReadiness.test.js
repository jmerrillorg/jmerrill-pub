"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildMilestone9LaunchReleaseReadiness,
  buildTaskTemplates,
  GATES,
  LAUNCH_PATHS,
  HUMAN_CHECKPOINTS,
  STANDARD_MARKETING_KIT_ITEMS,
  INTERNAL_VISIBILITY_MAILBOX,
  LAUNCH_TASK_ENTITY_SET,
  EVENT_TYPE
} = require("../src/launch/milestone9LaunchReleaseReadiness");
const {
  DISCLOSURE_STATUS,
  COVER_STATUS,
  MARKETING_DATE_GATE
} = require("../src/launch/preMilestone9GateCompletion");

const baseInput = Object.freeze({
  diagnosticId: "64e387e0-7e6a-f111-a826-00224820105b",
  intakeReferenceCode: "JMP-INT-202606-UFYG60",
  opportunity: {
    opportunityId: "2653fca9-eacd-4c44-b3ed-1764dd5d35aa",
    active: true,
    name: "Publishing Intake - Establishing Glory: The Library"
  },
  project: {
    type: "COMMERCIAL",
    title: "Establishing Glory: The Library"
  },
  title: {
    titleId: "title-egtl",
    title: "Establishing Glory: The Library"
  },
  author: {
    name: "Jackie Smith Jr"
  },
  production: {
    status: "FILES_APPROVED_FOR_DISTRIBUTION"
  },
  editorial: {
    status: "COMPLETE_READY_FOR_PRODUCTION_HANDOFF"
  },
  distribution: {
    status: "DISTRIBUTION_SETUP_COMPLETE"
  },
  bp06: {
    manuscriptReceived: true,
    aiDisclosureStatus: DISCLOSURE_STATUS.RECORDED,
    aiDisclosurePct: 0,
    aiDisclosurePortions: "None declared"
  },
  bp09: {
    printCoverStatus: COVER_STATUS.VALIDATED,
    digitalCoverStatus: COVER_STATUS.VALIDATED,
    trimSize: "6x9",
    pageCount: 240,
    paperStock: "60_WHITE",
    isbnAvailable: true
  },
  bp10: {
    g4aPassed: true,
    paymentStatus: "PAID_IN_FULL_CLEARED",
    lockedReleaseDate: "2026-09-01",
    releaseLocked: true,
    marketingDateGate: MARKETING_DATE_GATE.OPEN
  },
  launch: {
    kitStatus: "COMPLETE",
    kitMissingItems: [],
    compCopyStatus: "DISPATCHED",
    authorPageStatus: "LIVE",
    authorPageReachable: true,
    authorPageUrl: "https://jmerrill.pub/authors/establishing-glory",
    messagingStatus: "HUMAN_APPROVED"
  },
  release: {
    titleMetadataStatus: "FINAL_CONFIRMED",
    finalFileStatus: "FINAL_FILES_APPROVED",
    distributionReadinessStatus: "DISTRIBUTION_READINESS_CONFIRMED",
    lockedReleaseDate: "2026-09-01",
    releaseLocked: true,
    marketingDateGate: MARKETING_DATE_GATE.OPEN,
    daysToRelease: 74
  },
  marketing: {
    authorBookMarketingSkillActive: false,
    publishingMarketingSkillActive: false,
    promptFamilyApproved: false
  },
  approvals: {
    authorApprovalStatus: "APPROVED",
    publisherApprovedBy: "Jackie",
    publisherApprovedAt: "2026-06-19T20:00:00.000Z",
    targetReadinessDate: "2026-06-24T20:00:00.000Z"
  },
  gates: {
    [GATES.AI_DISCLOSURE_CAPTURE]: true,
    [GATES.COVER_VALIDATION]: true,
    [GATES.RELEASE_LOCK]: true,
    [GATES.LAUNCH_READINESS]: false,
    [GATES.MARKETING_AGENT]: false
  },
  completedAt: "2026-06-19T20:01:00.000Z"
});

function input(overrides = {}) {
  return {
    ...baseInput,
    ...overrides,
    opportunity: { ...baseInput.opportunity, ...(overrides.opportunity || {}) },
    project: { ...baseInput.project, ...(overrides.project || {}) },
    title: { ...baseInput.title, ...(overrides.title || {}) },
    production: { ...baseInput.production, ...(overrides.production || {}) },
    editorial: { ...baseInput.editorial, ...(overrides.editorial || {}) },
    distribution: { ...baseInput.distribution, ...(overrides.distribution || {}) },
    bp06: { ...baseInput.bp06, ...(overrides.bp06 || {}) },
    bp09: { ...baseInput.bp09, ...(overrides.bp09 || {}) },
    bp10: { ...baseInput.bp10, ...(overrides.bp10 || {}) },
    launch: { ...baseInput.launch, ...(overrides.launch || {}) },
    release: { ...baseInput.release, ...(overrides.release || {}) },
    marketing: { ...baseInput.marketing, ...(overrides.marketing || {}) },
    approvals: { ...baseInput.approvals, ...(overrides.approvals || {}) },
    gates: { ...baseInput.gates, ...(overrides.gates || {}) }
  };
}

describe("Milestone 9 Launch / Release Readiness", () => {
  test("blocks launch readiness while the launch gate is false by default", () => {
    const result = buildMilestone9LaunchReleaseReadiness(input());

    assert.equal(result.ok, true);
    assert.equal(result.readiness.launchGateName, GATES.LAUNCH_READINESS);
    assert.equal(result.readiness.launchGateEnabled, false);
    assert.equal(result.readiness.launchReleaseReadinessPermitted, false);
    assert.equal(result.readiness.blockers.includes(`${GATES.LAUNCH_READINESS}_FALSE`), true);
    assert.deepEqual(result.taskPayloads, []);
  });

  test("requires production, editorial handoff, distribution, pre-M9 gates, approvals, and launch gate", () => {
    const result = buildMilestone9LaunchReleaseReadiness(input({
      production: { status: "PRODUCTION_IN_PROGRESS" },
      editorial: { status: "IN_PROGRESS" },
      distribution: { status: "DISTRIBUTION_PENDING" },
      bp06: { aiDisclosureStatus: DISCLOSURE_STATUS.PENDING },
      bp09: { digitalCoverStatus: COVER_STATUS.FAILED },
      approvals: { authorApprovalStatus: "PENDING", publisherApprovedBy: "", publisherApprovedAt: "" },
      gates: {
        [GATES.AI_DISCLOSURE_CAPTURE]: true,
        [GATES.COVER_VALIDATION]: true,
        [GATES.RELEASE_LOCK]: true,
        [GATES.LAUNCH_READINESS]: false
      }
    }));

    assert.equal(result.readiness.launchReleaseReadinessPermitted, false);
    assert.equal(result.readiness.blockers.includes("PRODUCTION_READINESS_NOT_COMPLETE"), true);
    assert.equal(result.readiness.blockers.includes("EDITORIAL_COMMAND_CENTER_NOT_COMPLETE_OR_HANDOFF_NOT_APPROVED"), true);
    assert.equal(result.readiness.blockers.includes("DISTRIBUTION_SETUP_READINESS_NOT_COMPLETE"), true);
    assert.equal(result.readiness.blockers.includes("BP06_AI_DISCLOSURE_NOT_PASSED_OR_NOT_APPLICABLE"), true);
    assert.equal(result.readiness.blockers.includes("BP09_COVER_VALIDATION_NOT_PASSED"), true);
    assert.equal(result.readiness.blockers.includes("AUTHOR_APPROVAL_REQUIRED_OR_WAIVER_REQUIRED"), true);
    assert.equal(result.readiness.blockers.includes("FINAL_PUBLISHER_APPROVAL_REQUIRED"), true);
  });

  test("does not permit release readiness if release lock is missing", () => {
    const result = buildMilestone9LaunchReleaseReadiness(input({
      bp10: { releaseLocked: false },
      release: { releaseLocked: false },
      gates: { [GATES.LAUNCH_READINESS]: true }
    }));

    assert.equal(result.readiness.releaseLockSatisfied, false);
    assert.equal(result.readiness.blockers.includes("BP10_RELEASE_LOCK_NOT_PASSED"), true);
    assert.equal(result.bp11ReadinessCard.type, "NOT_READY");
    assert.equal(result.bp11ReadinessCard.itemizedGaps.includes("G4B_RELEASE_LOCK_NOT_SATISFIED"), true);
  });

  test("keeps BP-11 launch readiness as a four-green checklist with itemized kit gaps", () => {
    const result = buildMilestone9LaunchReleaseReadiness(input({
      launch: {
        kitStatus: "INCOMPLETE",
        kitMissingItems: ["PRESS_RELEASE_TEMPLATE", "AUTHOR_ACTIVATION_KIT_INSERT"],
        compCopyStatus: "NOT_SENT",
        authorPageStatus: "LIVE",
        authorPageReachable: false
      },
      gates: { [GATES.LAUNCH_READINESS]: true }
    }));

    assert.equal(result.readiness.launchChecklistReady, false);
    assert.equal(result.bp11ReadinessCard.type, "NOT_READY");
    assert.equal(result.bp11ReadinessCard.itemizedGaps.some((gap) => gap.includes("PRESS_RELEASE_TEMPLATE")), true);
    assert.equal(result.bp11ReadinessCard.itemizedGaps.includes("COMP_COPIES_NOT_DISPATCHED"), true);
    assert.equal(result.bp11ReadinessCard.itemizedGaps.includes("AUTHOR_PAGE_UNREACHABLE"), true);
  });

  test("permits governed readiness only when every required launch/release gate and approval is satisfied", () => {
    const result = buildMilestone9LaunchReleaseReadiness(input({
      gates: { [GATES.LAUNCH_READINESS]: true }
    }));

    assert.equal(result.ok, true);
    assert.equal(result.readiness.launchReleaseReadinessPermitted, true);
    assert.deepEqual(result.readiness.blockers, []);
    assert.equal(result.bp11ReadinessCard.type, "READY");
    assert.equal(result.taskPayloads.length, 10);
    assert.equal(result.taskPayloads.every((task) => task.entitySet === LAUNCH_TASK_ENTITY_SET), true);
    assert.equal(result.taskPayloads.every((task) => task.payload.jm1_iscompleted === false), true);
  });
});

describe("Milestone 9 task/status model and internal visibility", () => {
  test("defines the launch/release checklist body before post-release work", () => {
    const templates = buildTaskTemplates();
    const paths = templates.map((template) => template.path).sort();

    assert.deepEqual(paths, Object.values(LAUNCH_PATHS).sort());
    assert.equal(templates.length, 10);
    assert.equal(templates.every((template) => template.taskPayloadCreated === false), true);
    assert.equal(templates.every((template) => template.taskCreatedInDataverse === false), true);
  });

  test("keeps human checkpoints explicit and stops before Milestone 10", () => {
    const result = buildMilestone9LaunchReleaseReadiness(input());

    assert.deepEqual(result.readiness.humanCheckpoints, HUMAN_CHECKPOINTS);
    assert.equal(result.readiness.humanCheckpoints.includes("BP10_RELEASE_LOCK_CONFIRMED"), true);
    assert.equal(result.readiness.humanCheckpoints.includes("PUBLISHER_FINAL_APPROVAL"), true);
    assert.equal(result.readiness.stopsBefore.includes("ROYALTY_SETUP"), true);
    assert.equal(result.readiness.stopsBefore.includes("POST_RELEASE_MANAGEMENT"), true);
    assert.equal(result.readiness.stopsBefore.includes("ANNUAL_REVIEW_LOYALTY_PROGRESSION"), true);
  });

  test("prepares internal visibility and safe execution-log evidence", () => {
    const result = buildMilestone9LaunchReleaseReadiness(input());

    assert.equal(result.internalNotification.prepared, true);
    assert.equal(result.internalNotification.to, INTERNAL_VISIBILITY_MAILBOX);
    assert.deepEqual(result.internalNotification.cc, []);
    assert.deepEqual(result.internalNotification.bcc, []);
    assert.equal(result.internalNotification.type, EVENT_TYPE);
    assert.equal(result.payloads.executionLogPayload.jm1_actiontype, EVENT_TYPE);
    assert.equal(result.payloads.executionLogPayload.jm1_actiondescription.includes("No public launch"), true);
  });
});

describe("BP-12 marketing agent readiness boundary", () => {
  test("scaffolds marketing agent readiness but keeps activation prohibited", () => {
    const result = buildMilestone9LaunchReleaseReadiness(input({
      marketing: {
        authorBookMarketingSkillActive: true,
        publishingMarketingSkillActive: true,
        promptFamilyApproved: true
      },
      gates: { [GATES.LAUNCH_READINESS]: true }
    }));

    assert.equal(result.marketingAgent.agentId, "jm1-agent-pub-marketing-01");
    assert.equal(result.marketingAgent.readinessPrepared, true);
    assert.equal(result.marketingAgent.activationPermitted, false);
    assert.equal(result.marketingAgent.gateEnabled, false);
    assert.equal(result.marketingAgent.lanes.laneAAuthorBookKit, "SCAFFOLDED_INACTIVE");
  });

  test("blocks readiness if the marketing agent gate is opened", () => {
    const result = buildMilestone9LaunchReleaseReadiness(input({
      gates: {
        [GATES.LAUNCH_READINESS]: true,
        [GATES.MARKETING_AGENT]: true
      }
    }));

    assert.equal(result.readiness.launchReleaseReadinessPermitted, false);
    assert.equal(result.readiness.blockers.includes("MARKETING_AGENT_MUST_REMAIN_INACTIVE"), true);
    assert.equal(result.marketingAgent.blockers.includes("MARKETING_AGENT_GATE_MUST_REMAIN_FALSE_FOR_READINESS"), true);
  });
});

describe("Milestone 9 safety boundaries", () => {
  test("does not perform public launch, release, campaign, royalty, or post-release side effects", () => {
    const result = buildMilestone9LaunchReleaseReadiness(input({
      gates: { [GATES.LAUNCH_READINESS]: true }
    }));

    assert.equal(result.liveActions.createsLaunchTasks, false);
    assert.equal(result.liveActions.publishesTitle, false);
    assert.equal(result.liveActions.submitsToRetailers, false);
    assert.equal(result.liveActions.setsPublicReleaseDate, false);
    assert.equal(result.liveActions.announcesPublicReleaseDate, false);
    assert.equal(result.liveActions.sendsLaunchEmail, false);
    assert.equal(result.liveActions.sendsPublicMarketingCampaign, false);
    assert.equal(result.liveActions.activatesMarketingAgent, false);
    assert.equal(result.liveActions.writesScheduler, false);
    assert.equal(result.liveActions.createsRoyaltySetup, false);
    assert.equal(result.liveActions.startsPostReleaseManagement, false);
    assert.equal(result.liveActions.startsAnnualReview, false);
    assert.equal(result.liveActions.createsDuplicateOpportunity, false);
    assert.equal(result.liveActions.usesQboForNewLogic, false);
  });

  test("rejects unsafe public launch, release, distribution, post-release, and secret fields without echoing values", () => {
    const result = buildMilestone9LaunchReleaseReadiness(input({
      publishNow: true,
      sendLaunchEmail: true,
      submitToIngram: true,
      secret: "SECRET_VALUE"
    }));

    assert.equal(result.ok, false);
    assert.equal(result.reason, "UNSAFE_FIELD_PRESENT");
    assert.equal(JSON.stringify(result).includes("SECRET_VALUE"), false);
  });

  test("excludes Legacy projects from commercial launch readiness", () => {
    const result = buildMilestone9LaunchReleaseReadiness(input({
      project: { type: "LEGACY" }
    }));

    assert.equal(result.ok, false);
    assert.equal(result.reason, "LEGACY_PROJECT_EXCLUDED");
  });

  test("documents the standard ten-item author marketing kit dependency", () => {
    assert.equal(STANDARD_MARKETING_KIT_ITEMS.length, 10);
    assert.equal(STANDARD_MARKETING_KIT_ITEMS.includes("AUTHOR_ONE_SHEET"), true);
    assert.equal(STANDARD_MARKETING_KIT_ITEMS.includes("AUTHOR_ACTIVATION_KIT_INSERT"), true);
  });
});
