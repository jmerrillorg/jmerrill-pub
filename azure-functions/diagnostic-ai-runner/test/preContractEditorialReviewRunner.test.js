"use strict";

const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  runPreContractEditorialReview,
  composePreContractEditorialReview,
  determineImprintRecommendation,
  buildEditorialReviewExecutionLogPayload,
  GATE_NAME,
  MANUSCRIPT_WORK_TYPE,
  IMPRINT_OUTCOME
} = require("../src/editorial/preContractEditorialReviewRunner");
const { RECOMMENDED_IMPRINT, DIAGNOSTIC_STATUS } = require("../src/editorial/preContractEditorialReviewGate");

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

const FAKE_DEPS = {
  getToken: async () => "fake-test-token",
  getGraphToken: async () => "fake-graph-token"
};

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

function defaultExtractor(wordCount = 48246) {
  return async () => ({
    ok: true,
    code: null,
    content: "This text must never appear in a return value or Dataverse write.",
    metadata: { fileType: ".docx", byteLength: 123456, wordCount, charCount: wordCount * 6, sha256: "abc", downloadMethod: "graph" }
  });
}

// ── determineImprintRecommendation — pure rule engine ────────────────────────

describe("determineImprintRecommendation — Signature exception", () => {
  test("an existing signatureReviewRequired signal routes to human review and does not auto-lock", () => {
    const r = determineImprintRecommendation({ workType: MANUSCRIPT_WORK_TYPE.FULL_LENGTH_BOOK, genreConfirmed: "Self-Help", signatureReviewRequiredSignal: true });
    assert.equal(r.outcome, IMPRINT_OUTCOME.SIGNATURE_CANDIDATE);
    assert.equal(r.recommendedImprint, null);
    assert.equal(r.autoLock, false);
    assert.equal(r.requiresHumanDecision, true);
  });

  test("the Signature signal takes precedence over any structural rule (e.g. Devotional)", () => {
    const r = determineImprintRecommendation({ workType: MANUSCRIPT_WORK_TYPE.DEVOTIONAL, genreConfirmed: "Christian Devotional", signatureReviewRequiredSignal: true });
    assert.equal(r.outcome, IMPRINT_OUTCOME.SIGNATURE_CANDIDATE);
    assert.equal(r.autoLock, false);
  });
});

describe("determineImprintRecommendation — non-Signature structural rules auto-lock", () => {
  test("Children's Picture Book -> JM Little, auto-locked, high confidence", () => {
    const r = determineImprintRecommendation({ workType: MANUSCRIPT_WORK_TYPE.CHILDRENS_PICTURE_BOOK, genreConfirmed: "Children's", signatureReviewRequiredSignal: false });
    assert.equal(r.outcome, IMPRINT_OUTCOME.AUTO_RECOMMENDED);
    assert.equal(r.recommendedImprint, RECOMMENDED_IMPRINT.JM_LITTLE);
    assert.equal(r.autoLock, true);
    assert.equal(r.requiresHumanDecision, false);
    assert.equal(r.confidence, "HIGH");
  });

  test("Poetry Collection -> JM Verse, auto-locked, high confidence", () => {
    const r = determineImprintRecommendation({ workType: MANUSCRIPT_WORK_TYPE.POETRY_COLLECTION, genreConfirmed: "Poetry", signatureReviewRequiredSignal: false });
    assert.equal(r.recommendedImprint, RECOMMENDED_IMPRINT.JM_VERSE);
    assert.equal(r.autoLock, true);
  });

  test("Devotional -> J Merrill Publishing, auto-locked, high confidence", () => {
    const r = determineImprintRecommendation({ workType: MANUSCRIPT_WORK_TYPE.DEVOTIONAL, genreConfirmed: "Devotional", signatureReviewRequiredSignal: false });
    assert.equal(r.recommendedImprint, RECOMMENDED_IMPRINT.J_MERRILL_PUBLISHING);
    assert.equal(r.autoLock, true);
  });

  test("a faith/pastoral genre keyword on a Full-length Book -> J Merrill Publishing, medium confidence, auto-locked", () => {
    const r = determineImprintRecommendation({ workType: MANUSCRIPT_WORK_TYPE.FULL_LENGTH_BOOK, genreConfirmed: "Christian Testimony Memoir", signatureReviewRequiredSignal: false });
    assert.equal(r.recommendedImprint, RECOMMENDED_IMPRINT.J_MERRILL_PUBLISHING);
    assert.equal(r.confidence, "MEDIUM");
    assert.equal(r.autoLock, true);
  });

  test("a general-trade genre keyword on a Full-length Book -> JM Works, medium confidence, auto-locked", () => {
    const r = determineImprintRecommendation({ workType: MANUSCRIPT_WORK_TYPE.FULL_LENGTH_BOOK, genreConfirmed: "Business Leadership Guide", signatureReviewRequiredSignal: false });
    assert.equal(r.recommendedImprint, RECOMMENDED_IMPRINT.JM_WORKS);
    assert.equal(r.autoLock, true);
  });
});

describe("determineImprintRecommendation — does not guess from genre alone", () => {
  test("the controlled record's real genre (Self-Help, Full-length Book) is genuinely ambiguous and is NOT auto-locked", () => {
    const r = determineImprintRecommendation({ workType: MANUSCRIPT_WORK_TYPE.FULL_LENGTH_BOOK, genreConfirmed: "Self-Help", signatureReviewRequiredSignal: false });
    assert.equal(r.outcome, IMPRINT_OUTCOME.IMPRINT_AMBIGUOUS);
    assert.equal(r.recommendedImprint, null);
    assert.equal(r.autoLock, false);
    assert.equal(r.requiresHumanDecision, true);
  });

  test("a null/unset genre and work type is also ambiguous, not guessed", () => {
    const r = determineImprintRecommendation({ workType: null, genreConfirmed: null, signatureReviewRequiredSignal: false });
    assert.equal(r.outcome, IMPRINT_OUTCOME.IMPRINT_AMBIGUOUS);
  });
});

// ── composePreContractEditorialReview — combines fit + imprint ──────────────

describe("composePreContractEditorialReview", () => {
  test("manuscript-derived word count overrides the intake estimate in the underlying fit check", () => {
    const r = composePreContractEditorialReview({
      selectedPackageCode: "JMP-PKG-PRO",
      officialManuscriptWordCount: 48246,
      intakeEstimatedWordCount: 10000,
      workType: MANUSCRIPT_WORK_TYPE.DEVOTIONAL,
      genreConfirmed: "Devotional",
      signatureReviewRequiredSignal: false
    });
    assert.equal(r.wordCountResult.officialManuscriptWordCount, 48246);
    assert.equal(r.wordCountResult.wordCountSource, "MANUSCRIPT_FILE");
    assert.equal(r.wordCountResult.withinPackageScope, true);
  });

  test("Professional Package remains valid when the official manuscript count is under 75,000", () => {
    const r = composePreContractEditorialReview({
      selectedPackageCode: "JMP-PKG-PRO",
      officialManuscriptWordCount: 48246,
      workType: MANUSCRIPT_WORK_TYPE.DEVOTIONAL,
      genreConfirmed: "Devotional",
      signatureReviewRequiredSignal: false
    });
    assert.equal(r.wordCountResult.packageMismatch, false);
    assert.equal(r.fitConfirmed, true);
  });

  test("readyForAutoLock requires fit confirmed AND imprint auto-lockable", () => {
    const okBoth = composePreContractEditorialReview({
      selectedPackageCode: "JMP-PKG-PRO", officialManuscriptWordCount: 48246,
      workType: MANUSCRIPT_WORK_TYPE.DEVOTIONAL, genreConfirmed: "Devotional", signatureReviewRequiredSignal: false
    });
    assert.equal(okBoth.readyForAutoLock, true);

    const fitOnly = composePreContractEditorialReview({
      selectedPackageCode: "JMP-PKG-PRO", officialManuscriptWordCount: 48246,
      workType: MANUSCRIPT_WORK_TYPE.FULL_LENGTH_BOOK, genreConfirmed: "Self-Help", signatureReviewRequiredSignal: false
    });
    assert.equal(fitOnly.readyForAutoLock, false);
    assert.equal(fitOnly.requiresHumanDecision, true);

    const overScope = composePreContractEditorialReview({
      selectedPackageCode: "JMP-PKG-STARTER", officialManuscriptWordCount: 60000,
      workType: MANUSCRIPT_WORK_TYPE.DEVOTIONAL, genreConfirmed: "Devotional", signatureReviewRequiredSignal: false
    });
    assert.equal(overScope.fitConfirmed, false);
    assert.equal(overScope.readyForAutoLock, false);
  });

  test("a Signature-candidate signal blocks auto-lock even when word count fits cleanly", () => {
    const r = composePreContractEditorialReview({
      selectedPackageCode: "JMP-PKG-PRO", officialManuscriptWordCount: 48246,
      workType: MANUSCRIPT_WORK_TYPE.FULL_LENGTH_BOOK, genreConfirmed: "Self-Help", signatureReviewRequiredSignal: true
    });
    assert.equal(r.readyForAutoLock, false);
    assert.equal(r.imprintResult.outcome, IMPRINT_OUTCOME.SIGNATURE_CANDIDATE);
  });
});

// ── runPreContractEditorialReview — orchestrator ─────────────────────────────

describe("runPreContractEditorialReview — gate enforcement", () => {
  test("rejects when gate is absent, zero network calls", async () => {
    const calls = mockFetchSequence([diagnosticReadResponse(), patchResponse(), executionLogResponse()]);
    const result = await runPreContractEditorialReview(baseInput());
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
    assert.equal(calls.length, 0);
  });
});

describe("runPreContractEditorialReview — input validation", () => {
  test("rejects malformed diagnosticId before gate/network", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([diagnosticReadResponse(), patchResponse(), executionLogResponse()]);
    const result = await runPreContractEditorialReview(baseInput({ diagnosticId: "bad" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "DIAGNOSTIC_ID_INVALID");
    assert.equal(calls.length, 0);
  });

  test("rejects missing selectedPackageCode", async () => {
    const result = await runPreContractEditorialReview(baseInput({ selectedPackageCode: "" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "SELECTED_PACKAGE_CODE_MISSING");
  });
});

describe("runPreContractEditorialReview — non-Signature candidate auto-locks", () => {
  test("Devotional work type auto-recommends and locks J Merrill Publishing, sets diagnosticStatus COMPLETE", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([
      diagnosticReadResponse({ jm1pub_worktype: MANUSCRIPT_WORK_TYPE.DEVOTIONAL, jm1pub_genreconfirmed: "Devotional" }),
      patchResponse(),
      executionLogResponse()
    ]);
    const result = await runPreContractEditorialReview(baseInput(), { ...FAKE_DEPS, extractManuscript: defaultExtractor(48246) });

    assert.equal(result.ok, true);
    assert.equal(result.code, "PRE_CONTRACT_EDITORIAL_REVIEW_AUTO_LOCKED");
    assert.equal(result.imprintAutoLocked, true);
    assert.equal(result.requiresHumanDecision, false);
    assert.equal(result.recommendedImprintLabel, "J Merrill Publishing");
    assert.equal(result.officialManuscriptWordCount, 48246);
    assert.equal(result.wordCountSource, "MANUSCRIPT_FILE");

    const patchCall = calls.find((c) => c.options.method === "PATCH");
    const patchBody = JSON.parse(patchCall.options.body);
    assert.equal(patchBody.jm1pub_diagnosticstatus, DIAGNOSTIC_STATUS.COMPLETE);
    assert.equal(patchBody.jm1pub_recommendedimprint, RECOMMENDED_IMPRINT.J_MERRILL_PUBLISHING);
    assert.equal(patchBody.jm1pub_imprintlocked, true);
    assert.equal(patchBody.jm1pub_signaturereviewrequired, false);
  });
});

describe("runPreContractEditorialReview — Signature candidate routes to human review", () => {
  test("an existing signatureReviewRequired signal does not auto-lock, sets imprintlocked=false", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([
      diagnosticReadResponse({ jm1pub_worktype: MANUSCRIPT_WORK_TYPE.FULL_LENGTH_BOOK, jm1pub_genreconfirmed: "Self-Help", jm1pub_signaturereviewrequired: true }),
      patchResponse(),
      executionLogResponse()
    ]);
    const result = await runPreContractEditorialReview(baseInput(), { ...FAKE_DEPS, extractManuscript: defaultExtractor(48246) });

    assert.equal(result.code, "PRE_CONTRACT_EDITORIAL_REVIEW_REQUIRES_HUMAN_DECISION");
    assert.equal(result.imprintAutoLocked, false);
    assert.equal(result.requiresHumanDecision, true);
    assert.equal(result.imprintOutcome, IMPRINT_OUTCOME.SIGNATURE_CANDIDATE);

    const patchCall = calls.find((c) => c.options.method === "PATCH");
    const patchBody = JSON.parse(patchCall.options.body);
    assert.equal(patchBody.jm1pub_imprintlocked, false);
    assert.equal(patchBody.jm1pub_signaturereviewrequired, true);
    assert.ok(!("jm1pub_recommendedimprint" in patchBody));
    assert.equal(patchBody.jm1pub_diagnosticstatus, DIAGNOSTIC_STATUS.AWAITING_JACKIE_REVIEW);
  });
});

describe("runPreContractEditorialReview — the controlled record's real, current data", () => {
  test("Self-Help / Full-length Book / no Signature signal -> ambiguous, requires human decision, not auto-locked", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([
      diagnosticReadResponse({ jm1pub_worktype: null, jm1pub_genreconfirmed: "Self-Help", jm1pub_signaturereviewrequired: false }),
      intakeReadResponse(MANUSCRIPT_WORK_TYPE.FULL_LENGTH_BOOK),
      patchResponse(),
      executionLogResponse()
    ]);
    const result = await runPreContractEditorialReview(baseInput(), { ...FAKE_DEPS, extractManuscript: defaultExtractor(48246) });

    assert.equal(result.code, "PRE_CONTRACT_EDITORIAL_REVIEW_REQUIRES_HUMAN_DECISION");
    assert.equal(result.imprintOutcome, IMPRINT_OUTCOME.IMPRINT_AMBIGUOUS);
    assert.equal(result.imprintAutoLocked, false);
    assert.equal(result.fitConfirmed, true);
    assert.equal(result.officialManuscriptWordCount, 48246);
  });

  test("falls back to the intake record's manuscript type when the diagnostic's own worktype is null", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([
      diagnosticReadResponse({ jm1pub_worktype: null }),
      intakeReadResponse(MANUSCRIPT_WORK_TYPE.DEVOTIONAL),
      patchResponse(),
      executionLogResponse()
    ]);
    const result = await runPreContractEditorialReview(baseInput(), { ...FAKE_DEPS, extractManuscript: defaultExtractor(48246) });
    assert.equal(result.recommendedImprintLabel, "J Merrill Publishing");
    assert.equal(result.liveActions.readIntakeRecord, true);

    const patchCall = calls.find((c) => c.options.method === "PATCH");
    const patchBody = JSON.parse(patchCall.options.body);
    assert.equal(patchBody.jm1pub_worktype, MANUSCRIPT_WORK_TYPE.DEVOTIONAL, "fallback-sourced work type should be written back to the diagnostic record");
  });
});

describe("runPreContractEditorialReview — never exposes manuscript content", () => {
  test("the returned result never contains the extracted manuscript text", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([diagnosticReadResponse({ jm1pub_worktype: MANUSCRIPT_WORK_TYPE.DEVOTIONAL }), patchResponse(), executionLogResponse()]);
    const result = await runPreContractEditorialReview(baseInput(), { ...FAKE_DEPS, extractManuscript: defaultExtractor(48246) });
    const serialized = JSON.stringify(result);
    assert.ok(!serialized.includes("must never appear"));
  });

  test("the diagnostic PATCH payload never contains manuscript text or content keys", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([diagnosticReadResponse({ jm1pub_worktype: MANUSCRIPT_WORK_TYPE.DEVOTIONAL }), patchResponse(), executionLogResponse()]);
    await runPreContractEditorialReview(baseInput(), { ...FAKE_DEPS, extractManuscript: defaultExtractor(48246) });
    const patchCall = calls.find((c) => c.options.method === "PATCH");
    const patchBody = JSON.parse(patchCall.options.body);
    assert.ok(!("content" in patchBody));
    assert.ok(!JSON.stringify(patchBody).includes("must never appear"));
  });

  test("the execution log payload never contains manuscript text or raw model output", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([diagnosticReadResponse({ jm1pub_worktype: MANUSCRIPT_WORK_TYPE.DEVOTIONAL }), patchResponse(), executionLogResponse()]);
    await runPreContractEditorialReview(baseInput(), { ...FAKE_DEPS, extractManuscript: defaultExtractor(48246) });
    const logCall = calls[calls.length - 1];
    const logBody = JSON.parse(logCall.options.body);
    assert.ok(!logBody.jm1_actiondescription.includes("must never appear"));
    assert.ok(logBody.jm1_actiondescription.toLowerCase().includes("no raw manuscript text"));
  });
});

describe("runPreContractEditorialReview — Dataverse/manuscript failure handling", () => {
  test("blocked when DATAVERSE config missing", async () => {
    process.env[GATE_NAME] = "true";
    delete process.env.DATAVERSE_WEB_API_BASE_URL;
    const result = await runPreContractEditorialReview(baseInput());
    assert.equal(result.reason, "DATAVERSE_CONFIG_MISSING");
  });

  test("blocked when manuscript URL is not available on the diagnostic record", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([diagnosticReadResponse({ jm1_manuscriptasseturl: null })]);
    const result = await runPreContractEditorialReview(baseInput(), FAKE_DEPS);
    assert.equal(result.reason, "MANUSCRIPT_URL_NOT_AVAILABLE");
  });

  test("blocked when manuscript extraction fails", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([diagnosticReadResponse()]);
    const result = await runPreContractEditorialReview(baseInput(), {
      ...FAKE_DEPS,
      extractManuscript: async () => ({ ok: false, code: "MANUSCRIPT_FETCH_FAILED:404", content: null, metadata: {} })
    });
    assert.equal(result.ok, false);
    assert.ok(result.reason.startsWith("MANUSCRIPT_EXTRACTION_FAILED"));
  });

  test("execution-log write failure does not unwind a successful run", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([
      diagnosticReadResponse({ jm1pub_worktype: MANUSCRIPT_WORK_TYPE.DEVOTIONAL }),
      patchResponse(),
      jsonResponse({ error: { code: "X" } }, false, 403)
    ]);
    const result = await runPreContractEditorialReview(baseInput(), { ...FAKE_DEPS, extractManuscript: defaultExtractor(48246) });
    assert.equal(result.ok, true);
    assert.equal(result.executionLog.created, false);
  });
});

describe("runPreContractEditorialReview — never touches the Opportunity", () => {
  test("liveActions.updatedOpportunity is always false", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([diagnosticReadResponse({ jm1pub_worktype: MANUSCRIPT_WORK_TYPE.DEVOTIONAL }), patchResponse(), executionLogResponse()]);
    const result = await runPreContractEditorialReview(baseInput(), { ...FAKE_DEPS, extractManuscript: defaultExtractor(48246) });
    assert.equal(result.liveActions.updatedOpportunity, false);
    assert.equal(result.liveActions.generatedAgreement, false);
    assert.equal(result.liveActions.sentAuthorFacingOutput, false);
    assert.equal(result.liveActions.createsPaymentLink, false);
    assert.equal(result.liveActions.startsProduction, false);
    assert.equal(result.liveActions.activatesFlowD, false);
  });
});

// ── buildEditorialReviewExecutionLogPayload — safety invariants ─────────────

describe("buildEditorialReviewExecutionLogPayload — safe evidence only", () => {
  function logInput(overrides = {}) {
    return {
      diagnosticId: REAL_DIAGNOSTIC_ID,
      intakeReferenceCode: REAL_INTAKE_REFERENCE,
      opportunityId: REAL_OPPORTUNITY_ID,
      review: {
        fitConfirmed: true,
        readyForAutoLock: true,
        imprintResult: { outcome: IMPRINT_OUTCOME.AUTO_RECOMMENDED, recommendedImprintLabel: "J Merrill Publishing", confidence: "HIGH" }
      },
      completedAt: "2026-06-22T00:00:00.000Z",
      ...overrides
    };
  }

  test("does not include jm1_flowrunid", () => {
    const p = buildEditorialReviewExecutionLogPayload(logInput());
    assert.ok(!("jm1_flowrunid" in p));
  });

  test("states word count source is MANUSCRIPT_FILE, not the intake estimate", () => {
    const p = buildEditorialReviewExecutionLogPayload(logInput());
    assert.ok(p.jm1_actiondescription.includes("MANUSCRIPT_FILE"));
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

  test("jm1_actiontype is the dedicated review-performed event type", () => {
    const p = buildEditorialReviewExecutionLogPayload(logInput());
    assert.equal(p.jm1_actiontype, "PRE_CONTRACT_EDITORIAL_REVIEW_PERFORMED");
  });
});
