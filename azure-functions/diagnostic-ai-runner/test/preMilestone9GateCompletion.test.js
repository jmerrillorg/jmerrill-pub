"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
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
  INTERNAL_VISIBILITY_MAILBOX
} = require("../src/launch/preMilestone9GateCompletion");

const baseInput = Object.freeze({
  diagnosticId: "64e387e0-7e6a-f111-a826-00224820105b",
  intakeReferenceCode: "JMP-INT-202606-UFYG60",
  project: {
    type: "COMMERCIAL",
    title: "Establishing Glory: The Library"
  },
  title: {
    titleId: "title-egtl"
  },
  author: {
    name: "Jackie Smith Jr"
  },
  opportunity: {
    opportunityId: "2653fca9-eacd-4c44-b3ed-1764dd5d35aa",
    active: true
  },
  bp06: {
    manuscriptReceived: true,
    aiDisclosureStatus: DISCLOSURE_STATUS.RECORDED,
    aiDisclosurePct: 0,
    aiDisclosurePortions: "None declared",
    overCapAdvisory: false
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
    proposedReleaseDate: "2026-09-01",
    releaseLocked: false
  },
  milestone9: {
    authorMarketingKitComplete: true,
    authorPageReady: true,
    compCopyPlanReady: true,
    launchCopyApproved: true
  },
  gates: {
    [GATES.AI_DISCLOSURE_CAPTURE]: false,
    [GATES.COVER_VALIDATION]: false,
    [GATES.RELEASE_LOCK]: false,
    [GATES.LAUNCH_READINESS]: false,
    [GATES.MARKETING_AGENT]: false
  },
  completedAt: "2026-06-19T18:00:00.000Z"
});

function input(overrides = {}) {
  return {
    ...baseInput,
    ...overrides,
    project: { ...baseInput.project, ...(overrides.project || {}) },
    bp06: { ...baseInput.bp06, ...(overrides.bp06 || {}) },
    bp09: { ...baseInput.bp09, ...(overrides.bp09 || {}) },
    bp10: { ...baseInput.bp10, ...(overrides.bp10 || {}) },
    milestone9: { ...baseInput.milestone9, ...(overrides.milestone9 || {}) },
    gates: { ...baseInput.gates, ...(overrides.gates || {}) }
  };
}

const allPreM9GatesOpen = Object.freeze({
  [GATES.AI_DISCLOSURE_CAPTURE]: true,
  [GATES.COVER_VALIDATION]: true,
  [GATES.RELEASE_LOCK]: true
});

describe("BP-06 AI disclosure capture readiness", () => {
  test("treats 0 percent with None declared as a complete disclosure but keeps gate closed by default", () => {
    const result = buildBp06AiDisclosureCapture(input());

    assert.equal(result.ok, true);
    assert.equal(result.ready, false);
    assert.equal(result.zeroDisclosureComplete, true);
    assert.equal(result.blockers.includes(`${GATES.AI_DISCLOSURE_CAPTURE}_FALSE`), true);
    assert.deepEqual(result.routeBackCadence, ["DAY_0", "DAY_3", "DAY_7_ESCALATE_TO_JACKIE"]);
    assert.deepEqual(result.schemaFields, SCHEMA_TARGETS.BP06_PROJECT_FIELDS);
    assert.equal(result.payloads.executionLogPayload.jm1_actiontype, EVENT_TYPES.BP06);
  });

  test("is ready only when manuscript, disclosure, percent, portions, and gate are satisfied", () => {
    const result = buildBp06AiDisclosureCapture(input({
      gates: { [GATES.AI_DISCLOSURE_CAPTURE]: true }
    }));

    assert.equal(result.ready, true);
    assert.deepEqual(result.blockers, []);
  });
});

describe("BP-09 cover validation readiness", () => {
  test("requires both print and digital covers; partial pass is never allowed", () => {
    const result = buildBp09CoverValidation(input({
      bp09: { digitalCoverStatus: COVER_STATUS.FAILED },
      gates: { [GATES.COVER_VALIDATION]: true }
    }));

    assert.equal(result.ready, false);
    assert.equal(result.partialPassPermitted, false);
    assert.equal(result.blockers.includes("DIGITAL_COVER_NOT_VALIDATED"), true);
    assert.deepEqual(result.schemaFields, SCHEMA_TARGETS.BP09_TITLE_FIELDS);
  });

  test("is ready only with specs, ISBN, both assets validated, and gate open", () => {
    const result = buildBp09CoverValidation(input({
      gates: { [GATES.COVER_VALIDATION]: true }
    }));

    assert.equal(result.ready, true);
    assert.equal(result.g4aPassedPrepared, true);
    assert.equal(result.deterministicInspectionOnly, true);
    assert.equal(result.spineTolerance, "+/- 1/16 inch");
  });
});

describe("BP-10 release lock readiness", () => {
  test("requires G4a, paid-in-full cleared, Jackie date, and gate open", () => {
    const result = buildBp10ReleaseLock(input({
      bp10: { paymentStatus: "PAID_IN_FULL_RECEIVED", proposedReleaseDate: "" },
      gates: { [GATES.RELEASE_LOCK]: true }
    }));

    assert.equal(result.ready, false);
    assert.equal(result.blockers.includes("PAID_IN_FULL_CLEARED_REQUIRED"), true);
    assert.equal(result.blockers.includes("PROPOSED_RELEASE_DATE_REQUIRED"), true);
    assert.equal(result.marketingDateGatePrepared, MARKETING_DATE_GATE.CLOSED);
    assert.deepEqual(result.schemaFields, SCHEMA_TARGETS.BP10_PROJECT_TITLE_FIELDS);
  });

  test("prepares release lock only when all preconditions and gate are satisfied", () => {
    const result = buildBp10ReleaseLock(input({
      gates: { [GATES.RELEASE_LOCK]: true }
    }));

    assert.equal(result.ready, true);
    assert.deepEqual(result.blockers, []);
    assert.equal(result.marketingDateGatePrepared, MARKETING_DATE_GATE.OPEN);
    assert.equal(result.releaseDateSource, "JACKIE_SET_PROPOSED_DATE_ONLY");
    assert.equal(result.authorMessageRequiresActualLockedDate, true);
  });
});

describe("Milestone 9 launch readiness sequencing", () => {
  test("does not proceed while any pre-Milestone 9 gate is closed", () => {
    const result = buildMilestone9LaunchReadiness(input({
      gates: {
        [GATES.AI_DISCLOSURE_CAPTURE]: true,
        [GATES.COVER_VALIDATION]: false,
        [GATES.RELEASE_LOCK]: true,
        [GATES.LAUNCH_READINESS]: true
      }
    }));

    assert.equal(result.ready, false);
    assert.equal(result.blockers.includes("BP09_COVER_VALIDATION_GATE_NOT_READY"), true);
  });

  test("launch readiness passes only after BP-06, BP-09, BP-10, launch assets, and launch gate are ready", () => {
    const result = buildMilestone9LaunchReadiness(input({
      gates: {
        ...allPreM9GatesOpen,
        [GATES.LAUNCH_READINESS]: true,
        [GATES.MARKETING_AGENT]: false
      }
    }));

    assert.equal(result.ready, true);
    assert.deepEqual(result.blockers, []);
    assert.deepEqual(result.launchAssets, LAUNCH_ASSETS);
    assert.equal(result.internalVisibility.to, INTERNAL_VISIBILITY_MAILBOX);
    assert.equal(result.payloads.executionLogPayload.jm1_actiontype, EVENT_TYPES.M9);
  });

  test("marketing agent must remain inactive for this readiness pass", () => {
    const result = buildMilestone9LaunchReadiness(input({
      gates: {
        ...allPreM9GatesOpen,
        [GATES.LAUNCH_READINESS]: true,
        [GATES.MARKETING_AGENT]: true
      }
    }));

    assert.equal(result.ready, false);
    assert.equal(result.blockers.includes("MARKETING_AGENT_MUST_REMAIN_INACTIVE_FOR_READINESS_PASS"), true);
  });

  test("rejects unsafe launch, release, distribution, royalty, and secret fields without echoing content", () => {
    const result = buildMilestone9LaunchReadiness(input({
      rawModelOutput: "UNSAFE MODEL OUTPUT",
      submitToIngram: true,
      secret: "SECRET_VALUE"
    }));

    assert.equal(result.ok, false);
    assert.equal(result.reason, "UNSAFE_FIELD_PRESENT");
    assert.equal(JSON.stringify(result).includes("UNSAFE MODEL OUTPUT"), false);
    assert.equal(JSON.stringify(result).includes("SECRET_VALUE"), false);
  });

  test("does not perform public launch, release, distribution, royalty, post-release, or agent actions", () => {
    const result = buildMilestone9LaunchReadiness(input({
      gates: {
        ...allPreM9GatesOpen,
        [GATES.LAUNCH_READINESS]: true
      }
    }));

    assert.equal(result.liveActions.startsMilestone9PublicLaunch, false);
    assert.equal(result.liveActions.setsPublicReleaseDate, false);
    assert.equal(result.liveActions.sendsLaunchEmail, false);
    assert.equal(result.liveActions.schedulesPublicCampaign, false);
    assert.equal(result.liveActions.activatesMarketingAgent, false);
    assert.equal(result.liveActions.submitsToRetailers, false);
    assert.equal(result.liveActions.createsRoyaltySetup, false);
    assert.equal(result.liveActions.startsPostReleaseWork, false);
    assert.equal(result.upstream.bp06.liveActions.sendsDisclosureReminder, false);
    assert.equal(result.upstream.bp09.liveActions.writesG4aPassLive, false);
    assert.equal(result.upstream.bp10.liveActions.triggersDistributionSubmission, false);
  });

  test("excludes Legacy projects from all commercial pre-Milestone 9 gates", () => {
    const result = buildMilestone9LaunchReadiness(input({
      project: { type: "LEGACY" }
    }));

    assert.equal(result.ok, false);
    assert.equal(result.reason, "LEGACY_PROJECT_EXCLUDED");
  });
});
