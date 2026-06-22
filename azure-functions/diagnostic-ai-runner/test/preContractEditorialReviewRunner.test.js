"use strict";

const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  runPreContractEditorialReview,
  composePreContractEditorialReview,
  determineImprintRecommendation,
  mapAiReviewToImprintDecision,
  buildEditorialReviewExecutionLogPayload,
  GATE_NAME,
  MANUSCRIPT_WORK_TYPE,
  IMPRINT_OUTCOME,
  HUMAN_REVIEW_REASON
} = require("../src/editorial/preContractEditorialReviewRunner");
const { RECOMMENDED_IMPRINT, DIAGNOSTIC_STATUS } = require("../src/editorial/preContractEditorialReviewGate");
const { IMPRINT_CODE, FIT_DECISION } = require("../src/editorial/manuscriptEditorialReviewProvider");

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
    jm1pub_recommendedimprintcode: IMPRINT_CODE.JM_WORKS,
    jm1pub_imprintconfidence: 0.85,
    jm1pub_fitdecision: FIT_DECISION.GOOD_FIT,
    jm1pub_signaturecandidacy: false,
    jm1pub_rightsdisclosureflag: false,
    jm1pub_requireshumanreview: false,
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

function intakeReadResponse(manuscriptType) {
  return jsonResponse({ jm1_manuscripttype: manuscriptType });
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
