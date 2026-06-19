"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildMilestone10PostReleaseManagement,
  buildTaskTemplates,
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
  INTERNAL_VISIBILITY_MAILBOX,
  POST_RELEASE_TASK_ENTITY_SET,
  EVENT_TYPE
} = require("../src/postRelease/milestone10PostReleaseManagement");

const baseInput = Object.freeze({
  diagnosticId: "64e387e0-7e6a-f111-a826-00224820105b",
  intakeReferenceCode: "JMP-INT-202606-UFYG60",
  opportunity: {
    opportunityId: "2653fca9-eacd-4c44-b3ed-1764dd5d35aa",
    active: true
  },
  project: {
    type: "COMMERCIAL",
    title: "Establishing Glory: The Library"
  },
  title: {
    titleId: "title-egtl",
    title: "Establishing Glory: The Library",
    releaseDate: "2025-06-19",
    active: true,
    launchReleaseStatus: "RELEASED_DISTRIBUTION_LIVE",
    distributionLiveVerified: true
  },
  author: {
    name: "Jackie Smith Jr",
    contactId: "contact-author-1"
  },
  contact: {
    contactId: "contact-author-1",
    loyaltyTier: LOYALTY_TIERS.LOYAL
  },
  annualReview: {
    releaseDate: "2025-06-19",
    openReviewYear: null,
    grandfatherClaimed: false,
    starterScheduleRef: "",
    grandfatherExpiry: ""
  },
  loyalty: {
    commercialPublishedTitleCount: 2,
    mostRecentPublicationDate: "2026-06-19"
  },
  royalty: {
    reportingStatus: "REPORTING_SOURCE_CONFIRMED"
  },
  catalog: {
    metadataAuditReady: true,
    healthStatus: "READY_FOR_REVIEW"
  },
  authorSupport: {
    status: "READY_FOR_REVIEW"
  },
  backlist: {
    optimizationStatus: "READY_FOR_REVIEW"
  },
  futureTitle: {
    opportunityStatus: "READY_FOR_REVIEW"
  },
  marketingFollowup: {
    status: "DRAFT_ONLY"
  },
  gates: {
    [GATES.POST_RELEASE_MANAGEMENT]: false,
    [GATES.ANNUAL_REVIEW]: false,
    [GATES.LOYALTY_PROGRESSION]: false,
    [GATES.ROYALTY_REPORTING]: false,
    [GATES.PUBLIC_MARKETING_FOLLOWUP]: false
  },
  completedAt: "2026-06-19T20:30:00.000Z"
});

function input(overrides = {}) {
  return {
    ...baseInput,
    ...overrides,
    opportunity: { ...baseInput.opportunity, ...(overrides.opportunity || {}) },
    project: { ...baseInput.project, ...(overrides.project || {}) },
    title: { ...baseInput.title, ...(overrides.title || {}) },
    author: { ...baseInput.author, ...(overrides.author || {}) },
    contact: { ...baseInput.contact, ...(overrides.contact || {}) },
    annualReview: { ...baseInput.annualReview, ...(overrides.annualReview || {}) },
    loyalty: { ...baseInput.loyalty, ...(overrides.loyalty || {}) },
    royalty: { ...baseInput.royalty, ...(overrides.royalty || {}) },
    catalog: { ...baseInput.catalog, ...(overrides.catalog || {}) },
    gates: { ...baseInput.gates, ...(overrides.gates || {}) }
  };
}

const liveReadinessGates = Object.freeze({
  [GATES.POST_RELEASE_MANAGEMENT]: true,
  [GATES.ANNUAL_REVIEW]: true,
  [GATES.LOYALTY_PROGRESSION]: true,
  [GATES.ROYALTY_REPORTING]: false,
  [GATES.PUBLIC_MARKETING_FOLLOWUP]: false
});

describe("Milestone 10 post-release management readiness", () => {
  test("blocks readiness while post-release gates are false by default", () => {
    const result = buildMilestone10PostReleaseManagement(input());

    assert.equal(result.ok, true);
    assert.equal(result.readiness.postReleaseManagementPermitted, false);
    assert.equal(result.readiness.blockers.includes(`${GATES.POST_RELEASE_MANAGEMENT}_FALSE`), true);
    assert.equal(result.readiness.blockers.includes(`${GATES.ANNUAL_REVIEW}_FALSE`), true);
    assert.equal(result.readiness.blockers.includes(`${GATES.LOYALTY_PROGRESSION}_FALSE`), true);
    assert.deepEqual(result.taskPayloads, []);
  });

  test("permits governed readiness only when launch/release, distribution live, annual review, loyalty, and safe gates are ready", () => {
    const result = buildMilestone10PostReleaseManagement(input({
      gates: liveReadinessGates
    }));

    assert.equal(result.ok, true);
    assert.equal(result.readiness.postReleaseManagementPermitted, true);
    assert.deepEqual(result.readiness.blockers, []);
    assert.equal(result.readiness.annualReviewStatusPrepared, ANNUAL_REVIEW_STATUS.OPEN);
    assert.equal(result.taskPayloads.length, 10);
    assert.equal(result.taskPayloads.every((task) => task.entitySet === POST_RELEASE_TASK_ENTITY_SET), true);
    assert.equal(result.taskPayloads.every((task) => task.payload.jm1_iscompleted === false), true);
  });

  test("requires launch/release foundation and distribution live verification", () => {
    const result = buildMilestone10PostReleaseManagement(input({
      title: {
        launchReleaseStatus: "LAUNCH_READY_ONLY",
        distributionLiveVerified: false
      },
      gates: liveReadinessGates
    }));

    assert.equal(result.readiness.postReleaseManagementPermitted, false);
    assert.equal(result.readiness.blockers.includes("LAUNCH_RELEASE_FOUNDATION_NOT_COMPLETE"), true);
    assert.equal(result.readiness.blockers.includes("DISTRIBUTION_LIVE_VERIFICATION_REQUIRED"), true);
  });
});

describe("BP-14 annual review scheduler", () => {
  test("computes the standard $49 R2 annual fee by default", () => {
    const fee = computeAnnualFee(input());

    assert.equal(fee.basis, ANNUAL_FEE_BASIS.STANDARD_R2_49);
    assert.equal(fee.amount, 49);
    assert.equal(fee.events.includes("AnnualFeeComputed"), true);
  });

  test("computes $30 grandfathered Starter fee only with active signed schedule reference", () => {
    const fee = computeAnnualFee(input({
      annualReview: {
        grandfatherClaimed: true,
        starterScheduleRef: "STARTER-SCHEDULE-001",
        grandfatherExpiry: "2026-12-31"
      }
    }));

    assert.equal(fee.basis, ANNUAL_FEE_BASIS.STARTER_GRANDFATHERED_30);
    assert.equal(fee.amount, 30);
    assert.equal(fee.starterScheduleRef, "STARTER-SCHEDULE-001");
  });

  test("migrates expired grandfathered Starter title to $49 and logs migration", () => {
    const fee = computeAnnualFee(input({
      annualReview: {
        grandfatherClaimed: true,
        starterScheduleRef: "STARTER-SCHEDULE-001",
        grandfatherExpiry: "2026-01-01"
      }
    }));

    assert.equal(fee.basis, ANNUAL_FEE_BASIS.STANDARD_R2_49);
    assert.equal(fee.amount, 49);
    assert.equal(fee.starterRateMigrated, true);
    assert.equal(fee.events.includes("StarterRateMigrated"), true);
  });

  test("flags unverified grandfather claims and defaults to $49 pending Jackie ruling", () => {
    const result = buildMilestone10PostReleaseManagement(input({
      annualReview: {
        grandfatherClaimed: true,
        starterScheduleRef: "",
        grandfatherExpiry: "2026-12-31"
      },
      gates: liveReadinessGates
    }));

    assert.equal(result.readiness.annualFeeBasis, ANNUAL_FEE_BASIS.STANDARD_R2_49);
    assert.equal(result.readiness.grandfatherUnverified, true);
    assert.equal(result.annualReviewCard.grandfatherFlagged, true);
    assert.equal(result.payloads.executionLogPayload.jm1_actiondescription.includes("GrandfatherUnverified"), true);
  });

  test("skips annual review when release date is missing", () => {
    const result = buildMilestone10PostReleaseManagement(input({
      title: { releaseDate: "" },
      annualReview: { releaseDate: "" },
      gates: liveReadinessGates
    }));

    assert.equal(result.readiness.annualReviewEligible, false);
    assert.equal(result.readiness.blockers.includes("RELEASE_DATE_REQUIRED_FOR_ANNUAL_REVIEW"), true);
    assert.equal(result.payloads.executionLogPayload.jm1_actiondescription.includes("AnnualReviewNoReleaseDate"), true);
  });

  test("blocks duplicate cycle in the same review year", () => {
    const result = buildMilestone10PostReleaseManagement(input({
      annualReview: { openReviewYear: 2026 },
      gates: liveReadinessGates
    }));

    assert.equal(result.readiness.annualReviewEligible, false);
    assert.equal(result.readiness.blockers.includes("ANNUAL_REVIEW_ALREADY_OPEN_THIS_YEAR"), true);
  });
});

describe("BP-15 loyalty tier progression", () => {
  test("computes loyalty tiers from commercial published title count", () => {
    assert.equal(computeTierFromCount(0), LOYALTY_TIERS.NONE);
    assert.equal(computeTierFromCount(1), LOYALTY_TIERS.LOYAL);
    assert.equal(computeTierFromCount(2), LOYALTY_TIERS.ESTABLISHED);
    assert.equal(computeTierFromCount(3), LOYALTY_TIERS.ESTABLISHED);
    assert.equal(computeTierFromCount(4), LOYALTY_TIERS.LEGACY);
  });

  test("advances from Loyal to Established and prepares recognition draft without sending it", () => {
    const loyalty = computeLoyaltyProgression(input({
      contact: { loyaltyTier: LOYALTY_TIERS.LOYAL },
      loyalty: { commercialPublishedTitleCount: 2 }
    }));

    assert.equal(loyalty.currentTier, LOYALTY_TIERS.LOYAL);
    assert.equal(loyalty.computedTier, LOYALTY_TIERS.ESTABLISHED);
    assert.equal(loyalty.advancement, true);
    assert.equal(loyalty.recognitionDraftPrepared, true);
    assert.equal(loyalty.suggestedRecognitionWindow, "within 5 business days of advancement");
  });

  test("advances to Legacy and flags Signature candidacy without assigning Signature", () => {
    const result = buildMilestone10PostReleaseManagement(input({
      contact: { loyaltyTier: LOYALTY_TIERS.ESTABLISHED },
      loyalty: { commercialPublishedTitleCount: 4 },
      gates: liveReadinessGates
    }));

    assert.equal(result.readiness.loyalty.computedTier, LOYALTY_TIERS.LEGACY);
    assert.equal(result.readiness.loyalty.signatureCandidate, true);
    assert.equal(result.recognitionDraft.tier, LOYALTY_TIERS.LEGACY);
    assert.equal(result.recognitionDraft.sendPermitted, false);
    assert.equal(result.liveActions.assignsSignature, false);
  });

  test("never auto-demotes when computed tier is lower than current tier", () => {
    const loyalty = computeLoyaltyProgression(input({
      contact: { loyaltyTier: LOYALTY_TIERS.LEGACY },
      loyalty: { commercialPublishedTitleCount: 2 }
    }));

    assert.equal(loyalty.currentTier, LOYALTY_TIERS.LEGACY);
    assert.equal(loyalty.computedTier, LOYALTY_TIERS.ESTABLISHED);
    assert.equal(loyalty.advancement, false);
    assert.equal(loyalty.autoDemotionPermitted, false);
    assert.deepEqual(loyalty.events, []);
  });
});

describe("Milestone 10 task model and visibility", () => {
  test("defines the complete post-release task body", () => {
    const templates = buildTaskTemplates();
    const paths = templates.map((template) => template.path).sort();

    assert.deepEqual(paths, Object.values(TASK_PATHS).sort());
    assert.equal(templates.length, 10);
    assert.equal(templates.every((template) => template.taskPayloadCreated === false), true);
    assert.equal(templates.every((template) => template.taskCreatedInDataverse === false), true);
  });

  test("documents metadata audit checklist and human checkpoints", () => {
    const result = buildMilestone10PostReleaseManagement(input());

    assert.deepEqual(result.readiness.metadataAuditChecklist, METADATA_AUDIT_CHECKLIST);
    assert.deepEqual(result.readiness.humanCheckpoints, HUMAN_CHECKPOINTS);
    assert.equal(result.readiness.humanCheckpoints.includes("TAX_ACCOUNTING_ACTION_STOP_CONFIRMED"), true);
  });

  test("prepares internal card, notification, and safe execution-log evidence", () => {
    const result = buildMilestone10PostReleaseManagement(input());

    assert.equal(result.annualReviewCard.to, INTERNAL_VISIBILITY_MAILBOX);
    assert.equal(result.internalNotification.to, INTERNAL_VISIBILITY_MAILBOX);
    assert.deepEqual(result.internalNotification.cc, []);
    assert.deepEqual(result.internalNotification.bcc, []);
    assert.equal(result.internalNotification.type, EVENT_TYPE);
    assert.equal(result.payloads.executionLogPayload.jm1_actiontype, EVENT_TYPE);
    assert.equal(result.payloads.executionLogPayload.jm1_actiondescription.includes("No invoice"), true);
  });
});

describe("Milestone 10 safety boundaries", () => {
  test("keeps live royalty, invoice, tax/accounting, recognition, campaign, and Signature actions disabled", () => {
    const result = buildMilestone10PostReleaseManagement(input({
      gates: liveReadinessGates
    }));

    assert.equal(result.liveActions.createsPostReleaseTasks, false);
    assert.equal(result.liveActions.opensAnnualReviewLive, false);
    assert.equal(result.liveActions.createsMetadataAuditTaskLive, false);
    assert.equal(result.liveActions.sendsInvoice, false);
    assert.equal(result.liveActions.createsPaymentLink, false);
    assert.equal(result.liveActions.processesRoyaltyPayment, false);
    assert.equal(result.liveActions.performsTaxAccountingAction, false);
    assert.equal(result.liveActions.sendsAuthorRecognition, false);
    assert.equal(result.liveActions.sendsPublicMarketingCampaign, false);
    assert.equal(result.liveActions.activatesMarketingAgent, false);
    assert.equal(result.liveActions.assignsSignature, false);
    assert.equal(result.liveActions.demotesLoyaltyTier, false);
    assert.equal(result.liveActions.usesQboForNewLogic, false);
  });

  test("blocks readiness if live royalty reporting or public marketing follow-up gates are opened", () => {
    const result = buildMilestone10PostReleaseManagement(input({
      gates: {
        ...liveReadinessGates,
        [GATES.ROYALTY_REPORTING]: true,
        [GATES.PUBLIC_MARKETING_FOLLOWUP]: true
      }
    }));

    assert.equal(result.readiness.postReleaseManagementPermitted, false);
    assert.equal(result.readiness.blockers.includes("ROYALTY_REPORTING_LIVE_GATE_MUST_REMAIN_FALSE"), true);
    assert.equal(result.readiness.blockers.includes("PUBLIC_MARKETING_FOLLOWUP_GATE_MUST_REMAIN_FALSE"), true);
  });

  test("rejects unsafe invoice, royalty, tax, campaign, recognition, demotion, and secret fields without echoing values", () => {
    const result = buildMilestone10PostReleaseManagement(input({
      invoiceUrl: "https://example.invalid/invoice",
      royaltyPaymentSent: true,
      sendPublicCampaign: true,
      demoteLoyaltyTier: true,
      secret: "SECRET_VALUE"
    }));

    assert.equal(result.ok, false);
    assert.equal(result.reason, "UNSAFE_FIELD_PRESENT");
    assert.equal(JSON.stringify(result).includes("SECRET_VALUE"), false);
    assert.equal(JSON.stringify(result).includes("example.invalid"), false);
  });

  test("excludes Legacy projects from J8 post-release lifecycle", () => {
    const result = buildMilestone10PostReleaseManagement(input({
      project: { type: "LEGACY" }
    }));

    assert.equal(result.ok, false);
    assert.equal(result.reason, "LEGACY_PROJECT_EXCLUDED");
  });
});
