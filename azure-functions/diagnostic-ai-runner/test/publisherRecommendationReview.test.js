"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildRecommendationView,
  buildDraftPayloadFromView,
  parseLogDescription,
  preparePublisherRecommendationDraft
} = require("../src/editorial/publisherRecommendationReview");

const DIAGNOSTIC_ID = "18cb5c53-6076-f111-ab0f-000d3a9eacee";
const INTAKE_REFERENCE = "JMP-INT-202607-0W5PTQ";

function context(overrides = {}) {
  return {
    diagnostic: {
      jm1pub_diagnosticstatus: 196650004,
      jm1pub_recommendedpackage: 196650001,
      jm1pub_recommendedimprint: null,
      jm1pub_imprintlocked: false,
      jm1pub_signaturereviewrequired: false,
      jm1pub_worktype: 196650000,
      jm1pub_genreconfirmed: "Executive Devotional",
      jm1pub_manuscriptwordcount: 165482,
      jm1pub_hardstopflag: false,
      jm1pub_rightsconcernflag: false,
      jm1pub_legalflag: false,
      jm1pub_ethicsflag: false,
      jm1pub_permissionsrequired: false,
      jm1pub_thirdpartycontentdetected: false,
      ...overrides.diagnostic
    },
    intake: {
      jm1_referencecode: INTAKE_REFERENCE,
      jm1_firstname: "Jackie",
      jm1_lastname: "Smith Jr",
      jm1_email: "author@example.com",
      jm1_projecttitle: "The Intentional Leader",
      ...overrides.intake
    },
    contact: {
      fullname: "Jackie Smith Jr.",
      emailaddress1: "author@example.com",
      ...overrides.contact
    },
    executionLog: {
      jm1_executionlogid: "fb5a42d2-7d76-f111-ab0f-00224820105b",
      jm1_name: "PRE-CONTRACT-EDITORIAL-REVIEW-18cb5c53-6076-f111-ab0f-000d3a9eacee",
      jm1_actiontype: "PRE_PACKAGE_EDITORIAL_REVIEW_PERFORMED",
      createdon: "2026-07-03T01:23:41Z",
      jm1_actiondescription: "Pre-package editorial review performed by the pipeline for intake JMP-INT-202607-0W5PTQ. Content-aware manuscript review performed: true. Word count fit confirmed: false. Agreement readiness: BLOCKED_HUMAN_REVIEW_REQUIRED. Imprint outcome: NEEDS_HUMAN_REVIEW. Recommended package: JMP-PKG-PRO. Alternate package: JMP-PKG-STARTER. No imprint auto-recommended. Imprint NOT auto-locked — requires human decision (AI_REVIEW_TECHNICAL_FAILURE). Author-facing scoring summary generated and held internally pending separate send approval — not sent in this run.",
      ...overrides.executionLog
    }
  };
}

describe("parseLogDescription", () => {
  test("extracts safe package, alternate, and readiness fields", () => {
    const summary = parseLogDescription(context().executionLog.jm1_actiondescription);
    assert.equal(summary.contentAwareReviewPerformed, true);
    assert.equal(summary.wordCountFitConfirmed, false);
    assert.equal(summary.agreementReadiness, "BLOCKED_HUMAN_REVIEW_REQUIRED");
    assert.equal(summary.imprintOutcome, "NEEDS_HUMAN_REVIEW");
    assert.equal(summary.recommendedPackageCode, "JMP-PKG-PRO");
    assert.equal(summary.alternatePackageCode, "JMP-PKG-STARTER");
    assert.equal(summary.authorFacingSummaryGenerated, true);
  });
});

describe("buildRecommendationView", () => {
  test("surfaces the publisher recommendation and all three actions", () => {
    const view = buildRecommendationView(context(), {
      diagnosticId: DIAGNOSTIC_ID,
      intakeReferenceCode: INTAKE_REFERENCE
    });
    assert.equal(view.recommendedPackage.code, "JMP-PKG-PRO");
    assert.equal(view.recommendedPackage.label, "JMP-PKG-PRO / Professional Publishing Package");
    assert.equal(view.imprintRecommendation.status, "Publisher confirmation required");
    assert.equal(view.editorialPathRecommendation.status, "Publisher Approval Required");
    assert.deepEqual(view.flags, ["none"]);
    assert.ok(view.actions.includes("Approve & Send Recommendation"));
    assert.ok(view.actions.includes("Override Recommendation"));
    assert.ok(view.actions.includes("Hold / Needs Review"));
  });

  test("author-facing draft is present but not sent", () => {
    const view = buildRecommendationView(context(), {
      diagnosticId: DIAGNOSTIC_ID,
      intakeReferenceCode: INTAKE_REFERENCE
    });
    assert.equal(view.authorFacingRecommendationDraft.sendStatus, "DRAFT_ONLY");
    assert.equal(view.authorFacingRecommendationDraft.approvalStatus, "PENDING_HUMAN_APPROVAL");
    assert.ok(view.authorFacingRecommendationDraft.body.includes("Professional Publishing Package"));
    assert.ok(!JSON.stringify(view).includes("sendNow"));
  });
});

describe("buildDraftPayloadFromView", () => {
  test("builds a safe draft payload for confirmed Dataverse draft fields", () => {
    const view = buildRecommendationView(context(), {
      diagnosticId: DIAGNOSTIC_ID,
      intakeReferenceCode: INTAKE_REFERENCE
    });
    const draft = buildDraftPayloadFromView(view);
    assert.equal(draft.diagnosticId, DIAGNOSTIC_ID);
    assert.equal(draft.intakeReferenceCode, INTAKE_REFERENCE);
    assert.equal(draft.authorEmail, "author@example.com");
    assert.equal(draft.sendStatus, "DRAFT_ONLY");
    assert.equal(draft.approvalStatus, "PENDING_HUMAN_APPROVAL");
    assert.equal(draft.visibilityRule.futureSendMustCopyOrMirror, true);
    assert.equal(draft.visibilityRule.futureSendEventMustBeLoggedInDataverse, true);
  });
});

describe("preparePublisherRecommendationDraft", () => {
  test("persists the draft through the existing author draft persistence path", async () => {
    let persistedInput = null;
    const result = await preparePublisherRecommendationDraft(
      { diagnosticId: DIAGNOSTIC_ID, intakeReferenceCode: INTAKE_REFERENCE },
      {
        apiBase: "https://example.test/api/data/v9.2",
        token: "fake",
        context: { ok: true, ...context() },
        dataverseClient: {
          async persistAuthorDraft(input) {
            persistedInput = input;
            return { dataverseRecordId: input.diagnosticId };
          }
        }
      }
    );
    assert.equal(result.ok, true);
    assert.equal(result.persistence.persisted, true);
    assert.equal(persistedInput.entitySet, "jm1pub_editorialdiagnostics");
    assert.equal(persistedInput.dataverseUpdatePayload.jm1_authordraftsendstatus, "DRAFT_ONLY");
  });
});
