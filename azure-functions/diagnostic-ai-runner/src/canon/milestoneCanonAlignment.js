"use strict";

/**
 * 260619 canon alignment manifest.
 *
 * This manifest accounts for the full /Users/jmerrillone/Downloads/260619
 * canon set before Milestone #9. It is source mapping only; it does not enable
 * launch/release, public marketing, royalty setup, agents, production, or live
 * author-facing execution.
 */

const CANON_SOURCE_FOLDER = "/Users/jmerrillone/Downloads/260619";

const GATES = Object.freeze({
  JM1_EDITORIAL_COMMAND_CENTER_ENABLED: false,
  JM1_EDITORIAL_STAGE_TRACKER_ENABLED: false,
  JM1_EDITORIAL_AGENT_ENABLED: false,
  JM1_AI_DISCLOSURE_CAPTURE_ENABLED: false,
  JM1_COVER_VALIDATION_ENABLED: false,
  JM1_RELEASE_LOCK_ENABLED: false,
  JM1_LAUNCH_READINESS_ENABLED: false,
  JM1_MARKETING_AGENT_ENABLED: false
});

const ALIGNMENT = Object.freeze([
  Object.freeze({
    file: "JMP-COMMAND-CENTER-MANIFEST-v1_0.md",
    governs: "Canon index and command-center authority",
    milestone: "ALL",
    stage: "GOVERNANCE",
    status: "ACCOUNTED_FOR",
    action: "Treat full 260619 folder as source authority; do not treat it as editorial-only."
  }),
  Object.freeze({
    file: "JMP-PIPELINE-BLUEPRINT-v1_0.md",
    governs: "J0-J8 doctrine, data, automation, execution map",
    milestone: "ALL",
    stage: "PIPELINE",
    status: "ACCOUNTED_FOR",
    action: "Use as cross-stage sequencing authority through M10."
  }),
  Object.freeze({
    file: "JMP-FLOW-BP04-AgreementExecution-v1_0.md",
    governs: "Agreement execution and G1 evidence",
    milestone: "M6",
    stage: "PRE_M9",
    status: "COMPLETED_MILESTONE_SOURCE",
    action: "Agreement readiness remains M6; live contract sending stays blocked without authorization."
  }),
  Object.freeze({
    file: "JMP-FLOW-BP05-ContractPaymentAccepted-v1_0.md",
    governs: "Payment accepted, G2, and project creation boundary",
    milestone: "M6",
    stage: "PRE_M9",
    status: "COMPLETED_MILESTONE_SOURCE",
    action: "Payment acceptance remains a production precondition; no new payment/invoice action here."
  }),
  Object.freeze({
    file: "JMP-FLOW-BP06-AIDisclosureCapture-v1_0.md",
    governs: "AI disclosure capture before AI-assisted editorial/production execution",
    milestone: "PRE_M9",
    stage: "J2_EXIT",
    status: "PRE_M9_BLOCKER_TO_RESPECT",
    action: "Gate documented as JM1_AI_DISCLOSURE_CAPTURE_ENABLED=false; capture must be respected before AI-assisted editorial execution."
  }),
  Object.freeze({
    file: "JMP-FLOW-BP07-EditorialStageTracker-v1_0.md",
    governs: "Editorial stage tracker, J3 event vocabulary, G3 exit",
    milestone: "M7C",
    stage: "J3",
    status: "SCHEMA_BACKED",
    action: "jm1pub_editorialstage created/confirmed in JM1_Publishing; tracker remains gated false."
  }),
  Object.freeze({
    file: "JMP-AGENT-BP08-EditorialAgent-v1_0.md",
    governs: "Future supervised editorial execution agent",
    milestone: "M7C_FUTURE_AGENT_READINESS",
    stage: "J3",
    status: "SCAFFOLDED_NOT_ACTIVE",
    action: "No autonomous editorial agent, manuscript rewrite, or author delivery."
  }),
  Object.freeze({
    file: "JMP-FLOW-BP09-CoverValidation-v1_0.md",
    governs: "Cover validation before production/distribution release",
    milestone: "M7_M8_PRE_M9",
    stage: "J4",
    status: "PRE_M9_BLOCKER_TO_RESPECT",
    action: "Gate documented as JM1_COVER_VALIDATION_ENABLED=false; no cover validation automation activated."
  }),
  Object.freeze({
    file: "JMP-FLOW-BP10-ReleaseLock-v1_0.md",
    governs: "Release lock before date commitments and downstream submissions",
    milestone: "PRE_M9",
    stage: "J4",
    status: "PRE_M9_BLOCKER_TO_RESPECT",
    action: "Gate documented as JM1_RELEASE_LOCK_ENABLED=false; release lock must precede M9 launch/release."
  }),
  Object.freeze({
    file: "JMP-FLOW-BP11-LaunchReadiness-v1_0.md",
    governs: "Launch readiness check",
    milestone: "M9",
    stage: "J6",
    status: "M9_SOURCE",
    action: "Do not start until pre-M9 blockers are resolved and launch readiness gate is explicitly authorized."
  }),
  Object.freeze({
    file: "JMP-AGENT-BP12-MarketingAgent-v1_0.md",
    governs: "Future marketing agent support",
    milestone: "M9_FUTURE_AGENT_READINESS",
    stage: "J6",
    status: "SCAFFOLDED_NOT_ACTIVE",
    action: "No autonomous public campaign execution; JM1_MARKETING_AGENT_ENABLED=false."
  }),
  Object.freeze({
    file: "JMP-FLOW-BP14-BP15-J8-AnnualReview-LoyaltyProgression-v1_0.md",
    governs: "Annual review and loyalty progression",
    milestone: "M10",
    stage: "J8",
    status: "M10_SOURCE",
    action: "Post-release lifecycle source; no royalty/post-release work starts here."
  }),
  Object.freeze({
    file: "JMP-IncludedServices-NonTransferability-Clause-v1_0.md",
    governs: "Included services, package, onboarding, agreement policy",
    milestone: "M6",
    stage: "J1_J2",
    status: "COMPLETED_MILESTONE_SOURCE",
    action: "Agreement/onboarding/package governance source; no contract clause automation here."
  }),
  Object.freeze({
    file: "jm1-author-book-marketing-SKILL.md",
    governs: "Per-title author marketing kit and launch support",
    milestone: "M9",
    stage: "J6",
    status: "M9_SOURCE",
    action: "Launch support source; public scheduling remains gated and human-approved."
  }),
  Object.freeze({
    file: "jm1-publishing-marketing-SKILL.md",
    governs: "JMP brand marketing and acquisition messaging",
    milestone: "M9",
    stage: "J6",
    status: "M9_SOURCE",
    action: "Brand marketing source; marketing agent stays inactive."
  }),
  Object.freeze({
    file: "jm1-publishing-strategist-SKILL.md",
    governs: "Strategic advisory, package/release/channel economics",
    milestone: "M6_M8_M9",
    stage: "J1_J5_J6",
    status: "ACCOUNTED_FOR",
    action: "Strategy source for packages/distribution/launch planning; no live payment or release action."
  }),
  Object.freeze({
    file: "knowledge.md",
    governs: "Imprint definitions, style guide matrix, hard-stop flags",
    milestone: "M7C",
    stage: "J3",
    status: "ACCOUNTED_FOR",
    action: "Editorial Command Center doctrine source; final imprint remains G3 human authority."
  }),
  Object.freeze({
    file: "editorial-review.md",
    governs: "Editorial review and triage",
    milestone: "M7C",
    stage: "J3",
    status: "ACCOUNTED_FOR",
    action: "Review stage source; no author-facing AI editorial output."
  }),
  Object.freeze({
    file: "developmental-editing.md",
    governs: "Developmental editing doctrine",
    milestone: "M7C",
    stage: "J3",
    status: "ACCOUNTED_FOR",
    action: "Developmental stage source; no autonomous manuscript editing."
  }),
  Object.freeze({
    file: "line-copyedit-proof.md",
    governs: "Line edit, copyedit, proofread, mandatory style sheet",
    milestone: "M7C_M7_M8",
    stage: "J3_J4",
    status: "ACCOUNTED_FOR",
    action: "Style sheet/proofing source; final handoff requires safe style-sheet reference."
  }),
  Object.freeze({
    file: "faith-editorial-overlay.md",
    governs: "Internal faith/street-lit/children's editorial overlays",
    milestone: "M7C",
    stage: "J3",
    status: "ACCOUNTED_FOR",
    action: "Internal-only overlay source; not named in author-facing output."
  }),
  Object.freeze({
    file: "publishing-strategy.md",
    governs: "Distribution review, cover intelligence, brand infrastructure",
    milestone: "M8_M9",
    stage: "J5_J6",
    status: "ACCOUNTED_FOR",
    action: "Distribution/launch planning source; no submission or release action."
  }),
  Object.freeze({
    file: "blog-editorial.md",
    governs: "Blog and web content standards",
    milestone: "M9",
    stage: "J6",
    status: "M9_SOURCE",
    action: "Launch/content support source; public campaign execution remains gated."
  })
]);

function getCanonAlignment() {
  return {
    sourceFolder: CANON_SOURCE_FOLDER,
    gates: GATES,
    files: ALIGNMENT,
    preMilestone9Blockers: [
      {
        code: "JM1PUB_EDITORIALSTAGE_SCHEMA",
        status: "RESOLVED",
        evidence: "jm1pub_editorialstage confirmed in JM1_Publishing"
      },
      {
        code: "AI_DISCLOSURE_CAPTURE_GATE",
        status: "DOCUMENTED_GATE_FALSE",
        evidence: "JM1_AI_DISCLOSURE_CAPTURE_ENABLED=false"
      },
      {
        code: "COVER_VALIDATION_GATE",
        status: "DOCUMENTED_GATE_FALSE",
        evidence: "JM1_COVER_VALIDATION_ENABLED=false"
      },
      {
        code: "RELEASE_LOCK_GATE",
        status: "DOCUMENTED_GATE_FALSE",
        evidence: "JM1_RELEASE_LOCK_ENABLED=false"
      }
    ],
    liveActions: {
      startsMilestone9: false,
      startsPublicLaunchRelease: false,
      setsPublicReleaseDate: false,
      submitsToDistributionPlatforms: false,
      sendsLaunchEmail: false,
      createsRoyaltySetup: false,
      startsPostReleaseWork: false,
      activatesEditorialAgent: false,
      activatesMarketingAgent: false,
      usesQboForNewLogic: false
    }
  };
}

module.exports = {
  CANON_SOURCE_FOLDER,
  GATES,
  ALIGNMENT,
  getCanonAlignment
};
