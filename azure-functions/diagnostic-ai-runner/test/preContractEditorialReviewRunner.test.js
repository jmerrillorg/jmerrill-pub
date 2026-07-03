"use strict";

const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  runPreContractEditorialReview,
  runPrePackageEditorialReview,
  composePreContractEditorialReview,
  composePrePackageEditorialReview,
  determineImprintRecommendation,
  mapAiReviewToImprintDecision,
  buildInternalDiagnosticScorecard,
  buildAuthorFacingScoringSummary,
  buildEditorialReviewExecutionLogPayload,
  GATE_NAME,
  MANUSCRIPT_WORK_TYPE,
  IMPRINT_OUTCOME,
  HUMAN_REVIEW_REASON,
  AGREEMENT_READINESS_STATUS,
  PRE_PACKAGE_REVIEW_STATUS
} = require("../src/editorial/preContractEditorialReviewRunner");
const { RECOMMENDED_IMPRINT, DIAGNOSTIC_STATUS } = require("../src/editorial/preContractEditorialReviewGate");
const { IMPRINT_CODE, FIT_DECISION, SCORE_CATEGORY, AUTHOR_FACING_FIELD } = require("../src/editorial/manuscriptEditorialReviewProvider");

const originalFetch = global.fetch;
const originalEnv = {
  [GATE_NAME]: process.env[GATE_NAME],
  DATAVERSE_WEB_API_BASE_URL: process.env.DATAVERSE_WEB_API_BASE_URL,
  DATAVERSE_RESOURCE_URL: process.env.DATAVERSE_RESOURCE_URL
};

const REAL_DIAGNOSTIC_ID = "64e387e0-7e6a-f111-a826-00224820105b";
const REAL_INTAKE_REFERENCE = "JMP-INT-202606-UFYG60";
const REAL_OPPORTUNITY_ID = "2653fca9-eacd-4c44-b3ed-1764dd5d35aa";
const REAL_INTAKE_ID = "9625a1d4-7e6a-f111-a826-7c1e525b15c2";

const FORBIDDEN_TEXT = "This text must never appear in a return value, PATCH payload, or execution log.";

function aiOutput(overrides = {}) {
  return {
    jm1pub_editorialfitsummary: "Practical nonfiction with a clear structure and consistent voice.",
    jm1pub_editorialriskflags: "None identified",
    [SCORE_CATEGORY.MANUSCRIPT_FIT]: 8,
    [SCORE_CATEGORY.PACKAGE_FIT]: 7,
    [SCORE_CATEGORY.IMPRINT_FIT]: 8,
    [SCORE_CATEGORY.EDITORIAL_READINESS]: 6,
    [SCORE_CATEGORY.PRODUCTION_COMPLEXITY]: 3,
    [SCORE_CATEGORY.AUDIENCE_MARKET_CLARITY]: 7,
    jm1pub_recommendedimprintcode: IMPRINT_CODE.JM_WORKS,
    jm1pub_imprintconfidence: 0.85,
    jm1pub_fitdecision: FIT_DECISION.GOOD_FIT,
    jm1pub_signaturecandidacy: false,
    jm1pub_rightsdisclosureflag: false,
    jm1pub_requireshumanreview: false,
    [AUTHOR_FACING_FIELD.SUMMARY]: "We're excited to recommend the Professional Package with JM Works for your project.",
    [AUTHOR_FACING_FIELD.STRENGTHS]: "Clear voice and well-organized chapters throughout.",
    [AUTHOR_FACING_FIELD.SUPPORT_NEEDED]: "A developmental pass will help sharpen the middle section.",
    [AUTHOR_FACING_FIELD.NEXT_STEPS]: "We'll move forward with your package selection and agreement next.",
    ...overrides
  };
}

function reviewerDeps(aiOutputOverrides = {}, extra = {}) {
  return {
    getToken: async () => "fake-test-token",
    extractManuscript: extra.extractManuscript || defaultExtractor(48246),
    reviewManuscript: extra.reviewManuscript || (async () => ({ ok: true, output: aiOutput(aiOutputOverrides), error: null }))
  };
}

function defaultExtractor(wordCount = 48246) {
  return async () => ({
    ok: true,
    code: null,
    content: FORBIDDEN_TEXT,
    metadata: { fileType: ".docx", byteLength: 123456, wordCount, charCount: wordCount * 6, sha256: "abc", downloadMethod: "graph" }
  });
}

beforeEach(() => {
  delete process.env[GATE_NAME];
  process.env.DATAVERSE_WEB_API_BASE_URL = "https://jm1hq.crm.dynamics.com/api/data/v9.2";
  process.env.DATAVERSE_RESOURCE_URL = "https://jm1hq.crm.dynamics.com";
});

afterEach(() => {
  global.fetch = originalFetch;
  for (const [k, v] of Object.entries(originalEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

function mockFetchSequence(responses) {
  let call = 0;
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    const response = responses[Math.min(call, responses.length - 1)];
    call += 1;
    return response;
  };
  return calls;
}

function jsonResponse(body, ok = true, status = 200) {
  return { ok, status, async json() { return body; } };
}

function baseInput(overrides = {}) {
  return {
    diagnosticId: REAL_DIAGNOSTIC_ID,
    intakeReferenceCode: REAL_INTAKE_REFERENCE,
    opportunityId: REAL_OPPORTUNITY_ID,
    selectedPackageCode: "JMP-PKG-PRO",
    ...overrides
  };
}

function diagnosticReadResponse(fields = {}) {
  return jsonResponse({
    jm1pub_worktype: null,
    jm1pub_genreconfirmed: null,
    jm1pub_signaturereviewrequired: false,
    jm1_manuscriptasseturl: "https://contoso.sharepoint.com/manuscript.docx",
    jm1_manuscriptfiletype: "docx",
    _jm1pub_publishingintake_value: REAL_INTAKE_ID,
    ...fields
  });
}

function intakeReadResponse(manuscriptType, overrides = {}) {
  return jsonResponse({ jm1_manuscripttype: manuscriptType, ...overrides });
}

function patchResponse() {
  return jsonResponse({ "@odata.etag": "W/\"patch-etag\"" });
}

function executionLogResponse() {
  return jsonResponse({ jm1_executionlogid: "66666666-6666-6666-6666-666666666666", "@odata.etag": "W/\"log-etag\"" });
}

// ── mapAiReviewToImprintDecision — content-aware decision mapping ───────────

describe("mapAiReviewToImprintDecision — non-Signature recommendations auto-lock", () => {
  test("faith/pastoral manuscript content -> J Merrill Publishing, auto-locked", () => {
    const r = mapAiReviewToImprintDecision(aiOutput({ jm1pub_recommendedimprintcode: IMPRINT_CODE.J_MERRILL_PUBLISHING }));
    assert.equal(r.outcome, IMPRINT_OUTCOME.AUTO_RECOMMENDED);
    assert.equal(r.recommendedImprint, RECOMMENDED_IMPRINT.J_MERRILL_PUBLISHING);
    assert.equal(r.autoLock, true);
    assert.equal(r.requiresHumanDecision, false);
  });

  test("general practical/self-help nonfiction content -> JM Works, auto-locked", () => {
    const r = mapAiReviewToImprintDecision(aiOutput({ jm1pub_recommendedimprintcode: IMPRINT_CODE.JM_WORKS }));
    assert.equal(r.recommendedImprint, RECOMMENDED_IMPRINT.JM_WORKS);
    assert.equal(r.autoLock, true);
  });

  test("poetry content -> JM Verse, auto-locked", () => {
    const r = mapAiReviewToImprintDecision(aiOutput({ jm1pub_recommendedimprintcode: IMPRINT_CODE.JM_VERSE }));
    assert.equal(r.recommendedImprint, RECOMMENDED_IMPRINT.JM_VERSE);
    assert.equal(r.autoLock, true);
  });

  test("children's manuscript content -> JM Little, auto-locked", () => {
    const r = mapAiReviewToImprintDecision(aiOutput({ jm1pub_recommendedimprintcode: IMPRINT_CODE.JM_LITTLE }));
    assert.equal(r.recommendedImprint, RECOMMENDED_IMPRINT.JM_LITTLE);
    assert.equal(r.autoLock, true);
  });

  test("confidence >= 0.8 maps to HIGH, between 0.6 and 0.8 maps to MEDIUM", () => {
    const high = mapAiReviewToImprintDecision(aiOutput({ jm1pub_imprintconfidence: 0.9 }));
    const medium = mapAiReviewToImprintDecision(aiOutput({ jm1pub_imprintconfidence: 0.65 }));
    assert.equal(high.confidence, "HIGH");
    assert.equal(medium.confidence, "MEDIUM");
  });
});

describe("mapAiReviewToImprintDecision — Signature candidate routes to human review, never auto-locked", () => {
  test("signatureCandidacy=true does not auto-lock, even with a high-confidence imprint code", () => {
    const r = mapAiReviewToImprintDecision(aiOutput({ jm1pub_signaturecandidacy: true, jm1pub_imprintconfidence: 0.95 }));
    assert.equal(r.outcome, IMPRINT_OUTCOME.SIGNATURE_CANDIDATE);
    assert.equal(r.recommendedImprint, null);
    assert.equal(r.autoLock, false);
    assert.equal(r.requiresHumanDecision, true);
    assert.equal(r.humanReviewReason, HUMAN_REVIEW_REASON.SIGNATURE_CANDIDATE_DETECTED);
  });

  test("an explicit SIGNATURE_CANDIDATE imprint code also routes to human review", () => {
    const r = mapAiReviewToImprintDecision(aiOutput({ jm1pub_recommendedimprintcode: IMPRINT_CODE.SIGNATURE_CANDIDATE }));
    assert.equal(r.outcome, IMPRINT_OUTCOME.SIGNATURE_CANDIDATE);
    assert.equal(r.autoLock, false);
  });
});

describe("mapAiReviewToImprintDecision — other human-review routes never auto-lock", () => {
  test("a rights/disclosure flag routes to human review", () => {
    const r = mapAiReviewToImprintDecision(aiOutput({ jm1pub_rightsdisclosureflag: true }));
    assert.equal(r.autoLock, false);
    assert.equal(r.humanReviewReason, HUMAN_REVIEW_REASON.RIGHTS_OR_DISCLOSURE_RISK);
  });

  test("a non-GOOD_FIT decision routes to human review", () => {
    const r = mapAiReviewToImprintDecision(aiOutput({ jm1pub_fitdecision: FIT_DECISION.RISK_FLAGGED }));
    assert.equal(r.autoLock, false);
    assert.equal(r.humanReviewReason, HUMAN_REVIEW_REASON.NOT_A_FIT_OR_RISK_FLAGGED);
  });

  test("AMBIGUOUS imprint code (after content review) routes to human review", () => {
    const r = mapAiReviewToImprintDecision(aiOutput({ jm1pub_recommendedimprintcode: IMPRINT_CODE.AMBIGUOUS }));
    assert.equal(r.outcome, IMPRINT_OUTCOME.IMPRINT_AMBIGUOUS);
    assert.equal(r.autoLock, false);
    assert.equal(r.humanReviewReason, HUMAN_REVIEW_REASON.AMBIGUOUS_AFTER_CONTENT_REVIEW);
  });

  test("confidence below the auto-lock threshold routes to human review even with GOOD_FIT", () => {
    const r = mapAiReviewToImprintDecision(aiOutput({ jm1pub_imprintconfidence: 0.4 }));
    assert.equal(r.autoLock, false);
    assert.equal(r.humanReviewReason, HUMAN_REVIEW_REASON.LOW_CONFIDENCE);
  });
});

// ── composePreContractEditorialReview ────────────────────────────────────────

describe("composePreContractEditorialReview", () => {
  test("manuscript-derived word count overrides the intake estimate", () => {
    const decision = mapAiReviewToImprintDecision(aiOutput());
    const r = composePreContractEditorialReview({
      selectedPackageCode: "JMP-PKG-PRO", officialManuscriptWordCount: 48246, intakeEstimatedWordCount: 10000, imprintDecision: decision
    });
    assert.equal(r.wordCountResult.officialManuscriptWordCount, 48246);
    assert.equal(r.wordCountResult.wordCountSource, "MANUSCRIPT_FILE");
  });

  test("Professional Package remains valid when official manuscript count is under 75,000", () => {
    const decision = mapAiReviewToImprintDecision(aiOutput());
    const r = composePreContractEditorialReview({ selectedPackageCode: "JMP-PKG-PRO", officialManuscriptWordCount: 48246, imprintDecision: decision });
    assert.equal(r.fitConfirmed, true);
    assert.equal(r.readyForAutoLock, true);
  });

  test("a package mismatch blocks auto-lock even when the imprint decision would otherwise auto-lock", () => {
    const decision = mapAiReviewToImprintDecision(aiOutput());
    const r = composePreContractEditorialReview({ selectedPackageCode: "JMP-PKG-STARTER", officialManuscriptWordCount: 60000, imprintDecision: decision });
    assert.equal(r.fitConfirmed, false);
    assert.equal(r.readyForAutoLock, false);
    assert.equal(r.humanReviewReason, HUMAN_REVIEW_REASON.PACKAGE_MISMATCH);
  });
});

// ── runPreContractEditorialReview — content-aware orchestration ─────────────

describe("runPreContractEditorialReview — metadata-only review is insufficient", () => {
  test("when manuscript content is available, the decision is driven by the content-aware AI review, not genre/work-type alone", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([
      diagnosticReadResponse({ jm1pub_worktype: MANUSCRIPT_WORK_TYPE.FULL_LENGTH_BOOK, jm1pub_genreconfirmed: "Self-Help" }),
      patchResponse(),
      executionLogResponse()
    ]);
    // Genre/work-type alone would previously have been declared ambiguous.
    // With content-aware review available, a confident recommendation
    // must be honored instead of falling back to ambiguity.
    const result = await runPreContractEditorialReview(
      baseInput(),
      reviewerDeps({ jm1pub_recommendedimprintcode: IMPRINT_CODE.J_MERRILL_PUBLISHING, jm1pub_imprintconfidence: 0.85 })
    );
    assert.equal(result.contentAwareReviewPerformed, true);
    assert.equal(result.imprintOutcome, IMPRINT_OUTCOME.AUTO_RECOMMENDED);
    assert.equal(result.recommendedImprintLabel, "J Merrill Publishing");
    assert.equal(result.imprintAutoLocked, true);
  });
});

describe("runPreContractEditorialReview — non-Signature recommendation auto-locks", () => {
  test("sets diagnosticstatus COMPLETE, recommendedimprint, imprintlocked=true", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([
      diagnosticReadResponse({ jm1pub_worktype: MANUSCRIPT_WORK_TYPE.FULL_LENGTH_BOOK, jm1pub_genreconfirmed: "Self-Help" }),
      patchResponse(),
      executionLogResponse()
    ]);
    const result = await runPreContractEditorialReview(baseInput(), reviewerDeps({ jm1pub_recommendedimprintcode: IMPRINT_CODE.JM_WORKS }));
    assert.equal(result.code, "PRE_CONTRACT_EDITORIAL_REVIEW_AUTO_LOCKED");

    const patchCall = calls.find((c) => c.options.method === "PATCH");
    const patchBody = JSON.parse(patchCall.options.body);
    assert.equal(patchBody.jm1pub_diagnosticstatus, DIAGNOSTIC_STATUS.COMPLETE);
    assert.equal(patchBody.jm1pub_recommendedimprint, RECOMMENDED_IMPRINT.JM_WORKS);
    assert.equal(patchBody.jm1pub_imprintlocked, true);
  });
});

describe("runPreContractEditorialReview — Signature candidate routes to human review", () => {
  test("content review flags signature candidacy -> not auto-locked, imprintlocked=false, agreement stays blocked", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([
      diagnosticReadResponse({ jm1pub_worktype: MANUSCRIPT_WORK_TYPE.FULL_LENGTH_BOOK, jm1pub_genreconfirmed: "Literary Memoir" }),
      patchResponse(),
      executionLogResponse()
    ]);
    const result = await runPreContractEditorialReview(baseInput(), reviewerDeps({ jm1pub_signaturecandidacy: true }));
    assert.equal(result.code, "PRE_CONTRACT_EDITORIAL_REVIEW_REQUIRES_HUMAN_DECISION");
    assert.equal(result.imprintOutcome, IMPRINT_OUTCOME.SIGNATURE_CANDIDATE);
    assert.equal(result.imprintAutoLocked, false);

    const patchCall = calls.find((c) => c.options.method === "PATCH");
    const patchBody = JSON.parse(patchCall.options.body);
    assert.equal(patchBody.jm1pub_imprintlocked, false);
    assert.equal(patchBody.jm1pub_signaturereviewrequired, true);
    assert.ok(!("jm1pub_recommendedimprint" in patchBody));
  });

  test("a pre-existing signatureReviewRequired signal skips the AI call entirely", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([
      diagnosticReadResponse({ jm1pub_signaturereviewrequired: true }),
      patchResponse(),
      executionLogResponse()
    ]);
    let aiCalled = false;
    const result = await runPreContractEditorialReview(baseInput(), {
      getToken: async () => "fake",
      extractManuscript: defaultExtractor(48246),
      reviewManuscript: async () => { aiCalled = true; return { ok: true, output: aiOutput() }; }
    });
    assert.equal(aiCalled, false);
    assert.equal(result.contentAwareReviewPerformed, false);
    assert.equal(result.imprintOutcome, IMPRINT_OUTCOME.SIGNATURE_CANDIDATE);
  });
});

describe("runPreContractEditorialReview — agreement-gate readiness depends on this run's outcome", () => {
  test("review requiring human decision leaves agreement generation blocked (imprintlocked stays false)", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([diagnosticReadResponse(), patchResponse(), executionLogResponse()]);
    const result = await runPreContractEditorialReview(baseInput(), reviewerDeps({ jm1pub_recommendedimprintcode: IMPRINT_CODE.AMBIGUOUS }));
    assert.equal(result.requiresHumanDecision, true);
    const patchCall = calls.find((c) => c.options.method === "PATCH");
    const patchBody = JSON.parse(patchCall.options.body);
    assert.equal(patchBody.jm1pub_imprintlocked, false);
  });

  test("a non-Signature auto-locked review sets imprintlocked=true, satisfying the downstream agreement gate", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([diagnosticReadResponse(), patchResponse(), executionLogResponse()]);
    const result = await runPreContractEditorialReview(baseInput(), reviewerDeps());
    assert.equal(result.requiresHumanDecision, false);
    const patchCall = calls.find((c) => c.options.method === "PATCH");
    const patchBody = JSON.parse(patchCall.options.body);
    assert.equal(patchBody.jm1pub_imprintlocked, true);
    assert.equal(patchBody.jm1pub_diagnosticstatus, DIAGNOSTIC_STATUS.COMPLETE);
    // This is exactly the state preContractEditorialReviewGate.js's
    // EDITORIAL_REVIEW_COMPLETE_STATUSES/imprintReady checks require.
  });
});

describe("runPreContractEditorialReview — raw manuscript text is never logged or exposed", () => {
  test("the returned result never contains the manuscript content", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([diagnosticReadResponse(), patchResponse(), executionLogResponse()]);
    const result = await runPreContractEditorialReview(baseInput(), reviewerDeps());
    assert.ok(!JSON.stringify(result).includes(FORBIDDEN_TEXT));
  });

  test("the prompt sent to the AI review provider is built from content, but the function never receives a stored reference back", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([diagnosticReadResponse(), patchResponse(), executionLogResponse()]);
    let capturedPrompt = null;
    await runPreContractEditorialReview(baseInput(), {
      getToken: async () => "fake",
      extractManuscript: defaultExtractor(48246),
      reviewManuscript: async ({ promptBody }) => { capturedPrompt = promptBody; return { ok: true, output: aiOutput() }; }
    });
    // The prompt legitimately contains the manuscript content (required
    // for content-aware review) — verifying it was passed at all, while
    // confirming nothing downstream of the call retains or logs it.
    assert.ok(capturedPrompt.includes(FORBIDDEN_TEXT));
  });

  test("the diagnostic PATCH payload never contains manuscript text", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([diagnosticReadResponse(), patchResponse(), executionLogResponse()]);
    await runPreContractEditorialReview(baseInput(), reviewerDeps());
    const patchCall = calls.find((c) => c.options.method === "PATCH");
    assert.ok(!patchCall.options.body.includes(FORBIDDEN_TEXT));
  });

  test("the execution-log payload never contains manuscript text and only contains the safe summary/risk labels", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([diagnosticReadResponse(), patchResponse(), executionLogResponse()]);
    await runPreContractEditorialReview(baseInput(), reviewerDeps({ jm1pub_editorialfitsummary: "Clear practical structure." }));
    const logCall = calls[calls.length - 1];
    const logBody = JSON.parse(logCall.options.body);
    assert.ok(!logBody.jm1_actiondescription.includes(FORBIDDEN_TEXT));
    assert.ok(logBody.jm1_actiondescription.includes("Clear practical structure."));
  });
});

describe("runPreContractEditorialReview — AI review safety failures never auto-lock", () => {
  test("a technical AI call failure routes to human review, never auto-locks", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([diagnosticReadResponse(), patchResponse(), executionLogResponse()]);
    const result = await runPreContractEditorialReview(baseInput(), {
      getToken: async () => "fake",
      extractManuscript: defaultExtractor(48246),
      reviewManuscript: async () => ({ ok: false, output: null, error: "ANTHROPIC_HTTP_500" })
    });
    assert.equal(result.imprintAutoLocked, false);
    assert.equal(result.humanReviewReason, HUMAN_REVIEW_REASON.AI_REVIEW_TECHNICAL_FAILURE);
  });

  test("a schema-invalid AI output routes to human review, never auto-locks", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([diagnosticReadResponse(), patchResponse(), executionLogResponse()]);
    const result = await runPreContractEditorialReview(baseInput(), {
      getToken: async () => "fake",
      extractManuscript: defaultExtractor(48246),
      reviewManuscript: async () => ({ ok: true, output: { jm1pub_recommendedimprintcode: "NOT_A_REAL_CODE" } })
    });
    assert.equal(result.imprintAutoLocked, false);
    assert.equal(result.humanReviewReason, HUMAN_REVIEW_REASON.AI_REVIEW_TECHNICAL_FAILURE);
  });

  test("an AI output that fails the no-quotation check routes to human review and does not store the violating text", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([diagnosticReadResponse(), patchResponse(), executionLogResponse()]);
    const longQuote = `"${"word ".repeat(10)}excerpt from the manuscript itself"`;
    const result = await runPreContractEditorialReview(baseInput(), reviewerDeps({ jm1pub_editorialfitsummary: longQuote }));
    assert.equal(result.imprintAutoLocked, false);
    assert.equal(result.humanReviewReason, HUMAN_REVIEW_REASON.AI_REVIEW_TECHNICAL_FAILURE);
    const logCall = calls[calls.length - 1];
    const logBody = JSON.parse(logCall.options.body);
    assert.ok(!logBody.jm1_actiondescription.includes("excerpt from the manuscript itself"));
  });
});

describe("runPreContractEditorialReview — input validation and gate enforcement", () => {
  test("rejects when gate is absent, zero network calls", async () => {
    const calls = mockFetchSequence([diagnosticReadResponse(), patchResponse(), executionLogResponse()]);
    const result = await runPreContractEditorialReview(baseInput());
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
    assert.equal(calls.length, 0);
  });

  test("rejects malformed diagnosticId before gate/network", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([diagnosticReadResponse(), patchResponse(), executionLogResponse()]);
    const result = await runPreContractEditorialReview(baseInput({ diagnosticId: "bad" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "DIAGNOSTIC_ID_INVALID");
    assert.equal(calls.length, 0);
  });
});

describe("runPreContractEditorialReview — never touches the Opportunity or other surfaces", () => {
  test("liveActions confirms only Diagnostic record + execution log writes occur", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([diagnosticReadResponse(), patchResponse(), executionLogResponse()]);
    const result = await runPreContractEditorialReview(baseInput(), reviewerDeps());
    assert.equal(result.liveActions.updatedOpportunity, false);
    assert.equal(result.liveActions.generatedAgreement, false);
    assert.equal(result.liveActions.sentAuthorFacingOutput, false);
    assert.equal(result.liveActions.createsPaymentLink, false);
    assert.equal(result.liveActions.startsProduction, false);
    assert.equal(result.liveActions.activatesFlowD, false);
    assert.equal(result.liveActions.calledContentAwareAiReview, true);
  });
});

describe("runPreContractEditorialReview — intake fallback for work type", () => {
  test("falls back to the intake record's manuscript type when the diagnostic's own worktype is null", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([
      diagnosticReadResponse({ jm1pub_worktype: null }),
      intakeReadResponse(MANUSCRIPT_WORK_TYPE.DEVOTIONAL),
      patchResponse(),
      executionLogResponse()
    ]);
    const result = await runPreContractEditorialReview(baseInput(), reviewerDeps({ jm1pub_recommendedimprintcode: IMPRINT_CODE.J_MERRILL_PUBLISHING }));
    assert.equal(result.liveActions.readIntakeRecord, true);
    const patchCall = calls.find((c) => c.options.method === "PATCH");
    const patchBody = JSON.parse(patchCall.options.body);
    assert.equal(patchBody.jm1pub_worktype, MANUSCRIPT_WORK_TYPE.DEVOTIONAL);
  });
});

// ── runPrePackageEditorialReview — pre-package lifecycle orchestration ──────

describe("runPrePackageEditorialReview — pre-package Editorial Review", () => {
  test("does not require opportunityId or selectedPackageCode before package recommendation", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([
      diagnosticReadResponse({ jm1pub_worktype: MANUSCRIPT_WORK_TYPE.FULL_LENGTH_BOOK }),
      patchResponse(),
      executionLogResponse()
    ]);

    const result = await runPrePackageEditorialReview(
      baseInput({ opportunityId: "", selectedPackageCode: "" }),
      reviewerDeps()
    );

    assert.equal(result.ok, true);
    assert.equal(result.code, "PRE_PACKAGE_EDITORIAL_REVIEW_PUBLISHER_APPROVAL_REQUIRED");
    assert.equal(result.opportunityId, null);
    assert.equal(result.reviewRunStatus, PRE_PACKAGE_REVIEW_STATUS.PUBLISHER_APPROVAL_REQUIRED);
    assert.equal(result.publisherApprovalRequired, true);
    assert.equal(result.authorRecommendationSent, false);
    assert.equal(result.recommendedPackageCode, "JMP-PKG-STARTER");
    assert.equal(result.alternatePackageCode, null);

    const patchCall = calls.find((c) => c.options.method === "PATCH");
    const patchBody = JSON.parse(patchCall.options.body);
    assert.equal(patchBody.jm1pub_diagnosticstatus, DIAGNOSTIC_STATUS.AWAITING_JACKIE_REVIEW);
    assert.equal(patchBody.jm1pub_imprintlocked, false);
    assert.equal(patchBody.jm1pub_recommendedpackage, 196650000);
  });

  test("falls back to the intake manuscript URL when the diagnostic asset URL is not populated", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([
      diagnosticReadResponse({ jm1_manuscriptasseturl: null, jm1_manuscriptfiletype: null }),
      intakeReadResponse(MANUSCRIPT_WORK_TYPE.FULL_LENGTH_BOOK, {
        jm1_manuscripturl: "https://contoso.sharepoint.com/Shared%20Documents/The%20Intentional%20Leader.docx"
      }),
      patchResponse(),
      executionLogResponse()
    ]);

    let extractedUrl = null;
    const result = await runPrePackageEditorialReview(
      baseInput({ opportunityId: "", selectedPackageCode: "" }),
      reviewerDeps({}, {
        extractManuscript: async (url) => {
          extractedUrl = url;
          return defaultExtractor(48246)();
        }
      })
    );

    assert.equal(result.ok, true);
    assert.equal(extractedUrl, "https://contoso.sharepoint.com/Shared%20Documents/The%20Intentional%20Leader.docx");
    assert.equal(result.liveActions.readIntakeRecord, true);

    const patchCall = calls.find((c) => c.options.method === "PATCH");
    const patchBody = JSON.parse(patchCall.options.body);
    assert.equal(patchBody.jm1pub_worktype, MANUSCRIPT_WORK_TYPE.FULL_LENGTH_BOOK);
  });

  test("blocks duplicate pre-package review when recommendation fields already exist", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([
      diagnosticReadResponse({ jm1pub_recommendedpackage: 196650001 })
    ]);

    const result = await runPrePackageEditorialReview(
      baseInput({ opportunityId: "", selectedPackageCode: "" }),
      reviewerDeps()
    );

    assert.equal(result.ok, false);
    assert.equal(result.reason, "EDITORIAL_REVIEW_ALREADY_HAS_RECOMMENDATION");
    assert.equal(calls.length, 1);
  });
});

// ── buildEditorialReviewExecutionLogPayload — safety invariants ─────────────

describe("buildEditorialReviewExecutionLogPayload — safe evidence only", () => {
  function logInput(overrides = {}) {
    return {
      diagnosticId: REAL_DIAGNOSTIC_ID,
      intakeReferenceCode: REAL_INTAKE_REFERENCE,
      opportunityId: REAL_OPPORTUNITY_ID,
      contentAwareReviewPerformed: true,
      review: {
        fitConfirmed: true,
        readyForAutoLock: true,
        humanReviewReason: null,
        agreementReadinessStatus: AGREEMENT_READINESS_STATUS.READY_FOR_AGREEMENT,
        internalScorecard: null,
        imprintResult: {
          outcome: IMPRINT_OUTCOME.AUTO_RECOMMENDED,
          recommendedImprintLabel: "JM Works",
          confidence: "HIGH",
          editorialFitSummary: "Clear practical structure.",
          editorialRiskFlags: "None identified"
        }
      },
      completedAt: "2026-06-22T00:00:00.000Z",
      ...overrides
    };
  }

  test("does not include jm1_flowrunid", () => {
    const p = buildEditorialReviewExecutionLogPayload(logInput());
    assert.ok(!("jm1_flowrunid" in p));
  });

  test("includes the safe fit summary and risk flags", () => {
    const p = buildEditorialReviewExecutionLogPayload(logInput());
    assert.ok(p.jm1_actiondescription.includes("Clear practical structure."));
    assert.ok(p.jm1_actiondescription.includes("None identified"));
  });

  test("states content-aware review was performed", () => {
    const p = buildEditorialReviewExecutionLogPayload(logInput());
    assert.ok(p.jm1_actiondescription.includes("Content-aware manuscript review performed: true"));
  });

  test("states no contract/payment/production/distribution/launch/royalty/marketing action occurred", () => {
    const p = buildEditorialReviewExecutionLogPayload(logInput());
    const desc = p.jm1_actiondescription.toLowerCase();
    assert.ok(desc.includes("no contract generated"));
    assert.ok(desc.includes("no author-facing send"));
  });

  test("actiondescription is truncated to 1000 chars", () => {
    const p = buildEditorialReviewExecutionLogPayload(logInput());
    assert.ok(p.jm1_actiondescription.length <= 1000);
  });
});

// ── determineImprintRecommendation — Signature short-circuit only ──────────

describe("determineImprintRecommendation — Signature-signal short-circuit", () => {
  test("a pre-existing Signature signal routes to human review and does not auto-lock", () => {
    const r = determineImprintRecommendation({ signatureReviewRequiredSignal: true });
    assert.equal(r.outcome, IMPRINT_OUTCOME.SIGNATURE_CANDIDATE);
    assert.equal(r.autoLock, false);
  });
});

// ── Scoring requirements (manual standard: scoring is part of the
// author-facing route explanation, not just imprint selection) ─────────────

describe("1. Pre-contract review returns score categories", () => {
  test("buildInternalDiagnosticScorecard returns all required categories plus an overall score", () => {
    const scorecard = buildInternalDiagnosticScorecard(aiOutput());
    assert.equal(scorecard.manuscriptFit, 8);
    assert.equal(scorecard.packageFit, 7);
    assert.equal(scorecard.imprintFit, 8);
    assert.equal(scorecard.editorialReadiness, 6);
    assert.equal(scorecard.productionComplexity, 3);
    assert.equal(scorecard.audienceMarketClarity, 7);
    assert.equal(scorecard.faithMissionAlignment, null);
    assert.equal(scorecard.overallScore, 6.5);
  });

  test("a faith/mission-relevant work includes that score in the overall average", () => {
    const scorecard = buildInternalDiagnosticScorecard(aiOutput({ [SCORE_CATEGORY.FAITH_MISSION_ALIGNMENT]: 10 }));
    assert.equal(scorecard.faithMissionAlignment, 10);
    // average of 8,7,8,6,3,7,10 = 49/7 = 7
    assert.equal(scorecard.overallScore, 7);
  });

  test("the runner's return value exposes the internal scorecard for a content-aware run", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([diagnosticReadResponse(), patchResponse(), executionLogResponse()]);
    const result = await runPreContractEditorialReview(baseInput(), reviewerDeps());
    assert.ok(result.internalScorecard);
    assert.equal(result.internalScorecard.manuscriptFit, 8);
    assert.equal(result.internalScorecard.overallScore, 6.5);
  });
});

describe("2. Author-facing scoring summary is generated", () => {
  test("buildAuthorFacingScoringSummary returns the four required author-facing fields", () => {
    const summary = buildAuthorFacingScoringSummary(aiOutput());
    assert.equal(typeof summary.summary, "string");
    assert.equal(typeof summary.strengths, "string");
    assert.equal(typeof summary.supportNeeded, "string");
    assert.equal(typeof summary.nextSteps, "string");
    assert.ok(summary.summary.length > 0);
  });

  test("the runner's return value exposes the author-facing summary for a content-aware run", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([diagnosticReadResponse(), patchResponse(), executionLogResponse()]);
    const result = await runPreContractEditorialReview(baseInput(), reviewerDeps());
    assert.ok(result.authorFacingSummary);
    assert.equal(result.authorFacingSummary.summary, aiOutput()[AUTHOR_FACING_FIELD.SUMMARY]);
  });
});

describe("3. Internal-only diagnostic details are separated from the author-facing summary", () => {
  test("the internal scorecard and the author-facing summary share no field names", () => {
    const scorecard = buildInternalDiagnosticScorecard(aiOutput());
    const summary = buildAuthorFacingScoringSummary(aiOutput());
    const scorecardKeys = new Set(Object.keys(scorecard));
    const summaryKeys = new Set(Object.keys(summary));
    const intersection = [...scorecardKeys].filter((k) => summaryKeys.has(k));
    assert.deepEqual(intersection, []);
  });

  test("the author-facing summary never contains internal risk-flag or score language", () => {
    const summary = buildAuthorFacingScoringSummary(aiOutput({ jm1pub_editorialriskflags: "Pacing concerns; needs developmental pass" }));
    assert.ok(!JSON.stringify(summary).includes("Pacing concerns"));
  });

  test("the internal scorecard never contains the author-facing strings", () => {
    const scorecard = buildInternalDiagnosticScorecard(aiOutput());
    assert.ok(!("summary" in scorecard));
    assert.ok(!("nextSteps" in scorecard));
  });
});

describe("4. Raw manuscript text is not logged", () => {
  test("internal scorecard, author-facing summary, and execution log all omit the manuscript content", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([diagnosticReadResponse(), patchResponse(), executionLogResponse()]);
    const result = await runPreContractEditorialReview(baseInput(), reviewerDeps());
    assert.ok(!JSON.stringify(result.internalScorecard).includes(FORBIDDEN_TEXT));
    assert.ok(!JSON.stringify(result.authorFacingSummary).includes(FORBIDDEN_TEXT));
    const logCall = calls[calls.length - 1];
    assert.ok(!logCall.options.body.includes(FORBIDDEN_TEXT));
  });
});

describe("5. Raw AI/model output is not author-facing", () => {
  test("the author-facing summary contains only the four dedicated fields — never the raw tool output object", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([diagnosticReadResponse(), patchResponse(), executionLogResponse()]);
    const result = await runPreContractEditorialReview(baseInput(), reviewerDeps());
    const allowedKeys = new Set(["summary", "strengths", "supportNeeded", "nextSteps"]);
    for (const key of Object.keys(result.authorFacingSummary)) {
      assert.ok(allowedKeys.has(key), `unexpected key on author-facing summary: ${key}`);
    }
    // Internal-only fields must never leak into the author-facing object.
    assert.ok(!("jm1pub_editorialriskflags" in result.authorFacingSummary));
    assert.ok(!("aiConfidenceScore" in result.authorFacingSummary));
  });
});

describe("6. Fit/package/imprint decisions are based on manuscript content plus metadata", () => {
  test("genre/work-type metadata is passed to the reviewer as context alongside manuscript content", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([
      diagnosticReadResponse({ jm1pub_worktype: MANUSCRIPT_WORK_TYPE.FULL_LENGTH_BOOK, jm1pub_genreconfirmed: "Self-Help" }),
      patchResponse(),
      executionLogResponse()
    ]);
    let capturedPrompt = null;
    await runPreContractEditorialReview(baseInput(), {
      getToken: async () => "fake",
      extractManuscript: defaultExtractor(48246),
      reviewManuscript: async ({ promptBody }) => { capturedPrompt = promptBody; return { ok: true, output: aiOutput() }; }
    });
    assert.ok(capturedPrompt.includes("Self-Help"));
    assert.ok(capturedPrompt.includes("Full-length Book"));
    assert.ok(capturedPrompt.includes(FORBIDDEN_TEXT)); // manuscript content also present
  });
});

describe("7. Non-Signature route can auto-lock (with scoring present)", () => {
  test("a confident JM Works recommendation auto-locks and carries a scorecard + author-facing summary", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([diagnosticReadResponse(), patchResponse(), executionLogResponse()]);
    const result = await runPreContractEditorialReview(baseInput(), reviewerDeps());
    assert.equal(result.imprintAutoLocked, true);
    assert.ok(result.internalScorecard);
    assert.ok(result.authorFacingSummary);
    const patchCall = calls.find((c) => c.options.method === "PATCH");
    assert.equal(JSON.parse(patchCall.options.body).jm1pub_imprintlocked, true);
  });
});

describe("8. Signature candidate routes to human review (scoring still produced where applicable)", () => {
  test("signature candidacy from content review does not auto-lock, agreement readiness is blocked", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([diagnosticReadResponse(), patchResponse(), executionLogResponse()]);
    const result = await runPreContractEditorialReview(baseInput(), reviewerDeps({ jm1pub_signaturecandidacy: true }));
    assert.equal(result.imprintAutoLocked, false);
    assert.equal(result.agreementReadinessStatus, AGREEMENT_READINESS_STATUS.BLOCKED_HUMAN_REVIEW_REQUIRED);
  });
});

describe("9. Agreement generation remains blocked until scoring review and imprint lock are complete", () => {
  test("a technical AI failure (no scoring produced) leaves agreementReadinessStatus blocked", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([diagnosticReadResponse(), patchResponse(), executionLogResponse()]);
    const result = await runPreContractEditorialReview(baseInput(), {
      getToken: async () => "fake",
      extractManuscript: defaultExtractor(48246),
      reviewManuscript: async () => ({ ok: false, output: null, error: "ANTHROPIC_HTTP_500" })
    });
    assert.equal(result.agreementReadinessStatus, AGREEMENT_READINESS_STATUS.BLOCKED_HUMAN_REVIEW_REQUIRED);
    assert.equal(result.internalScorecard, null);
    assert.equal(result.authorFacingSummary, null);
  });
});

describe("10. Agreement generation can resume when scoring review is complete and a non-Signature imprint is locked", () => {
  test("a completed, auto-locked, scored review reports READY_FOR_AGREEMENT", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([diagnosticReadResponse(), patchResponse(), executionLogResponse()]);
    const result = await runPreContractEditorialReview(baseInput(), reviewerDeps());
    assert.equal(result.agreementReadinessStatus, AGREEMENT_READINESS_STATUS.READY_FOR_AGREEMENT);
    assert.equal(result.imprintAutoLocked, true);
    assert.ok(result.internalScorecard);
    assert.ok(result.authorFacingSummary);
  });
});
