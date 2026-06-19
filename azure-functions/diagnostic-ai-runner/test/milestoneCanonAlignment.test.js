"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  CANON_SOURCE_FOLDER,
  GATES,
  ALIGNMENT,
  getCanonAlignment
} = require("../src/canon/milestoneCanonAlignment");

const requiredFiles = [
  "JMP-COMMAND-CENTER-MANIFEST-v1_0.md",
  "JMP-PIPELINE-BLUEPRINT-v1_0.md",
  "JMP-FLOW-BP04-AgreementExecution-v1_0.md",
  "JMP-FLOW-BP05-ContractPaymentAccepted-v1_0.md",
  "JMP-FLOW-BP06-AIDisclosureCapture-v1_0.md",
  "JMP-FLOW-BP07-EditorialStageTracker-v1_0.md",
  "JMP-AGENT-BP08-EditorialAgent-v1_0.md",
  "JMP-FLOW-BP09-CoverValidation-v1_0.md",
  "JMP-FLOW-BP10-ReleaseLock-v1_0.md",
  "JMP-FLOW-BP11-LaunchReadiness-v1_0.md",
  "JMP-AGENT-BP12-MarketingAgent-v1_0.md",
  "JMP-FLOW-BP14-BP15-J8-AnnualReview-LoyaltyProgression-v1_0.md",
  "JMP-IncludedServices-NonTransferability-Clause-v1_0.md",
  "jm1-author-book-marketing-SKILL.md",
  "jm1-publishing-marketing-SKILL.md",
  "jm1-publishing-strategist-SKILL.md",
  "knowledge.md",
  "editorial-review.md",
  "developmental-editing.md",
  "line-copyedit-proof.md",
  "faith-editorial-overlay.md",
  "publishing-strategy.md",
  "blog-editorial.md"
];

describe("260619 canon alignment manifest", () => {
  test("accounts for every required source file before Milestone 9", () => {
    const files = ALIGNMENT.map((entry) => entry.file).sort();

    assert.deepEqual(files, requiredFiles.sort());
    assert.equal(CANON_SOURCE_FOLDER, "/Users/jmerrillone/Downloads/260619");
  });

  test("keeps all newly documented execution gates false by default", () => {
    assert.deepEqual(GATES, {
      JM1_EDITORIAL_COMMAND_CENTER_ENABLED: false,
      JM1_EDITORIAL_STAGE_TRACKER_ENABLED: false,
      JM1_EDITORIAL_AGENT_ENABLED: false,
      JM1_AI_DISCLOSURE_CAPTURE_ENABLED: false,
      JM1_COVER_VALIDATION_ENABLED: false,
      JM1_RELEASE_LOCK_ENABLED: false,
      JM1_LAUNCH_READINESS_ENABLED: false,
      JM1_MARKETING_AGENT_ENABLED: false
    });
  });

  test("maps BP-07 to resolved schema-backed M7C readiness", () => {
    const alignment = getCanonAlignment();
    const bp07 = alignment.files.find((entry) => entry.file === "JMP-FLOW-BP07-EditorialStageTracker-v1_0.md");
    const blocker = alignment.preMilestone9Blockers.find((entry) => entry.code === "JM1PUB_EDITORIALSTAGE_SCHEMA");

    assert.equal(bp07.milestone, "M7C");
    assert.equal(bp07.status, "SCHEMA_BACKED");
    assert.equal(blocker.status, "RESOLVED");
    assert.equal(blocker.evidence.includes("jm1pub_editorialstage"), true);
  });

  test("maps launch readiness to Milestone 9 and annual review to Milestone 10", () => {
    const alignment = getCanonAlignment();
    const bp11 = alignment.files.find((entry) => entry.file === "JMP-FLOW-BP11-LaunchReadiness-v1_0.md");
    const marketingAgent = alignment.files.find((entry) => entry.file === "JMP-AGENT-BP12-MarketingAgent-v1_0.md");
    const bp14bp15 = alignment.files.find((entry) => entry.file === "JMP-FLOW-BP14-BP15-J8-AnnualReview-LoyaltyProgression-v1_0.md");

    assert.equal(bp11.milestone, "M9");
    assert.equal(bp11.status, "M9_SOURCE");
    assert.equal(marketingAgent.status, "SCAFFOLDED_NOT_ACTIVE");
    assert.equal(bp14bp15.milestone, "M10");
    assert.equal(bp14bp15.status, "M10_SOURCE");
  });

  test("does not authorize Milestone 9, distribution, launch, release, royalty, or agent activation", () => {
    const alignment = getCanonAlignment();

    assert.equal(alignment.liveActions.startsMilestone9, false);
    assert.equal(alignment.liveActions.startsPublicLaunchRelease, false);
    assert.equal(alignment.liveActions.setsPublicReleaseDate, false);
    assert.equal(alignment.liveActions.submitsToDistributionPlatforms, false);
    assert.equal(alignment.liveActions.sendsLaunchEmail, false);
    assert.equal(alignment.liveActions.createsRoyaltySetup, false);
    assert.equal(alignment.liveActions.startsPostReleaseWork, false);
    assert.equal(alignment.liveActions.activatesEditorialAgent, false);
    assert.equal(alignment.liveActions.activatesMarketingAgent, false);
    assert.equal(alignment.liveActions.usesQboForNewLogic, false);
  });
});
