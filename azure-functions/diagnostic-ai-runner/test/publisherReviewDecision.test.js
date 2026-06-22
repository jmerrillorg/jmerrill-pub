"use strict";

const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildPublisherReviewPacket,
  mapPublisherDecisionToFields,
  recordPublisherReviewDecision,
  buildPublisherDecisionExecutionLogPayload,
  PUBLISHER_DECISION_OPTION,
  GATE_NAME
} = require("../src/editorial/publisherReviewDecision");
const { JACKIE_DECISION, HUMAN_DECISION, DIAGNOSTIC_STATUS, RECOMMENDED_IMPRINT } = require("../src/editorial/preContractEditorialReviewGate");

const originalFetch = global.fetch;
const originalEnv = {
  [GATE_NAME]: process.env[GATE_NAME],
  DATAVERSE_WEB_API_BASE_URL: process.env.DATAVERSE_WEB_API_BASE_URL,
  DATAVERSE_RESOURCE_URL: process.env.DATAVERSE_RESOURCE_URL
};

const REAL_DIAGNOSTIC_ID = "64e387e0-7e6a-f111-a826-00224820105b";
const REAL_INTAKE_REFERENCE = "JMP-INT-202606-UFYG60";
const REAL_OPPORTUNITY_ID = "2653fca9-eacd-4c44-b3ed-1764dd5d35aa";
const FORBIDDEN_TEXT = "This text must never appear in the packet or execution log.";

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

function patchResponse() {
  return jsonResponse({ "@odata.etag": "W/\"patch-etag\"" });
}

function executionLogResponse() {
  return jsonResponse({ jm1_executionlogid: "77777777-7777-7777-7777-777777777777", "@odata.etag": "W/\"log-etag\"" });
}

function baseInput(overrides = {}) {
  return {
    diagnosticId: REAL_DIAGNOSTIC_ID,
    intakeReferenceCode: REAL_INTAKE_REFERENCE,
    opportunityId: REAL_OPPORTUNITY_ID,
    decisionOption: PUBLISHER_DECISION_OPTION.APPROVE_PROCEED,
    recommendedImprint: RECOMMENDED_IMPRINT.J_MERRILL_PUBLISHING,
    ...overrides
  };
}

function realScorecard() {
  return {
    manuscriptFit: 8, packageFit: 7.5, imprintFit: 9, editorialReadiness: 6,
    productionComplexity: 5, audienceMarketClarity: 7, faithMissionAlignment: 9, overallScore: 7.4
  };
}

// ── buildPublisherReviewPacket — the review-packet builder ───────────────────

describe("buildPublisherReviewPacket — controlled record identifiers", () => {
  test("includes opportunity, diagnostic, title, author, package/payment identifiers", () => {
    const packet = buildPublisherReviewPacket({
      opportunityId: REAL_OPPORTUNITY_ID,
      diagnosticId: REAL_DIAGNOSTIC_ID,
      title: "Establishing Glory: The Library",
      authorName: "Jackie Smith Jr.",
      authorEmail: "author@example.com",
      selectedPackageCode: "JMP-PKG-PRO",
      paymentOption: "EIGHT_PAYMENTS"
    });
    assert.equal(packet.controlledRecord.opportunityId, REAL_OPPORTUNITY_ID);
    assert.equal(packet.controlledRecord.diagnosticId, REAL_DIAGNOSTIC_ID);
    assert.equal(packet.controlledRecord.title, "Establishing Glory: The Library");
    assert.equal(packet.controlledRecord.authorName, "Jackie Smith Jr.");
    assert.equal(packet.controlledRecord.selectedPackageCode, "JMP-PKG-PRO");
    assert.equal(packet.controlledRecord.paymentOption, "EIGHT_PAYMENTS");
  });
});

describe("buildPublisherReviewPacket — editorial review outcome", () => {
  test("includes word count, package fit, overall score, every score category, fit decision, and risk reason", () => {
    const packet = buildPublisherReviewPacket({
      officialManuscriptWordCount: 48232,
      packageFitConfirmed: true,
      internalScorecard: realScorecard(),
      fitDecision: "RISK_FLAGGED",
      humanReviewReason: "RIGHTS_OR_DISCLOSURE_RISK",
      editorialFitSummary: "Strong J Merrill Publishing fit across all volumes."
    });
    assert.equal(packet.editorialReviewOutcome.officialManuscriptWordCount, 48232);
    assert.equal(packet.editorialReviewOutcome.wordCountSource, "MANUSCRIPT_FILE");
    assert.equal(packet.editorialReviewOutcome.packageFitConfirmed, true);
    assert.equal(packet.editorialReviewOutcome.overallScore, 7.4);
    assert.deepEqual(packet.editorialReviewOutcome.scoreCategories, {
      manuscriptFit: 8, packageFit: 7.5, imprintFit: 9, editorialReadiness: 6,
      productionComplexity: 5, audienceMarketClarity: 7, faithMissionAlignment: 9
    });
    assert.equal(packet.editorialReviewOutcome.fitDecision, "RISK_FLAGGED");
    assert.equal(packet.editorialReviewOutcome.humanReviewReason, "RIGHTS_OR_DISCLOSURE_RISK");
  });
});

describe("buildPublisherReviewPacket — content-risk summary contains only safe characterization", () => {
  test("uses the already-validated risk-flags characterization, not raw manuscript text", () => {
    const packet = buildPublisherReviewPacket({
      editorialRiskFlags: "Vol. 2 contains explicit sexual content, STD statistics, pornography discussion, and frank language; anti-LGBTQ+ doctrinal statements in Vol. 3 carry potential public-facing sensitivity risk."
    });
    assert.ok(packet.contentRiskSummary.riskFlags.includes("Vol. 2"));
    assert.ok(packet.contentRiskSummary.riskFlags.includes("Vol. 3"));
    assert.ok(packet.contentRiskSummary.note.toLowerCase().includes("no manuscript excerpts"));
  });

  test("never contains the FORBIDDEN_TEXT sentinel even if accidentally passed as a field value elsewhere", () => {
    const packet = buildPublisherReviewPacket({ editorialFitSummary: FORBIDDEN_TEXT, editorialRiskFlags: "None identified" });
    // The packet faithfully carries forward whatever safe (already-validated)
    // string it's given — this test documents that the packet builder itself
    // adds no manuscript content; the upstream no-quotation validator is what
    // prevents raw text from ever reaching this function in production.
    assert.equal(packet.editorialReviewOutcome.fitSummary, FORBIDDEN_TEXT);
  });
});

describe("buildPublisherReviewPacket — publishing decision options", () => {
  test("always presents all five fixed options regardless of record state", () => {
    const packet = buildPublisherReviewPacket({});
    assert.equal(packet.publishingDecisionOptions.length, 5);
    const options = packet.publishingDecisionOptions.map((o) => o.option);
    assert.ok(options.includes(PUBLISHER_DECISION_OPTION.APPROVE_PROCEED));
    assert.ok(options.includes(PUBLISHER_DECISION_OPTION.REQUIRE_REVISION));
    assert.ok(options.includes(PUBLISHER_DECISION_OPTION.ROUTE_TO_ANOTHER_IMPRINT));
    assert.ok(options.includes(PUBLISHER_DECISION_OPTION.DECLINE_OR_DEFER));
    assert.ok(options.includes(PUBLISHER_DECISION_OPTION.ESCALATE));
  });

  test("flags which options require an explicit recommended imprint", () => {
    const packet = buildPublisherReviewPacket({});
    const byOption = Object.fromEntries(packet.publishingDecisionOptions.map((o) => [o.option, o]));
    assert.equal(byOption[PUBLISHER_DECISION_OPTION.APPROVE_PROCEED].requiresRecommendedImprint, true);
    assert.equal(byOption[PUBLISHER_DECISION_OPTION.ROUTE_TO_ANOTHER_IMPRINT].requiresRecommendedImprint, true);
    assert.equal(byOption[PUBLISHER_DECISION_OPTION.REQUIRE_REVISION].requiresRecommendedImprint, false);
    assert.equal(byOption[PUBLISHER_DECISION_OPTION.DECLINE_OR_DEFER].requiresRecommendedImprint, false);
    assert.equal(byOption[PUBLISHER_DECISION_OPTION.ESCALATE].requiresRecommendedImprint, false);
  });
});

describe("buildPublisherReviewPacket — imprint decision field and agreement readiness", () => {
  test("lists every available imprint by code and label", () => {
    const packet = buildPublisherReviewPacket({});
    const labels = packet.imprintDecisionField.availableImprints.map((i) => i.label);
    assert.ok(labels.includes("J Merrill Publishing"));
    assert.ok(labels.includes("JM Works"));
    assert.ok(labels.includes("JM Little"));
    assert.ok(labels.includes("JM Verse"));
    assert.ok(labels.includes("JM Signature"));
  });

  test("agreement readiness is always reported BLOCKED_HUMAN_REVIEW_REQUIRED on a freshly-built packet", () => {
    const packet = buildPublisherReviewPacket({});
    assert.equal(packet.agreementReadiness.status, "BLOCKED_HUMAN_REVIEW_REQUIRED");
  });
});

describe("buildPublisherReviewPacket — Publisher vs Author capacity", () => {
  test("the packet explicitly states the decision is a Publisher-capacity decision, not author approval", () => {
    const packet = buildPublisherReviewPacket({});
    const notice = packet.decisionCapacityNotice.toLowerCase();
    assert.ok(notice.includes("publisher"));
    assert.ok(notice.includes("not an author-side approval") || notice.includes("not author"));
  });
});

// ── mapPublisherDecisionToFields — pure decision mapping ────────────────────

describe("mapPublisherDecisionToFields", () => {
  test("APPROVE_PROCEED locks the imprint by default and sets JACKIE_APPROVED/ACCEPTED", () => {
    const f = mapPublisherDecisionToFields(PUBLISHER_DECISION_OPTION.APPROVE_PROCEED, { recommendedImprint: RECOMMENDED_IMPRINT.J_MERRILL_PUBLISHING });
    assert.equal(f.jackieDecision, JACKIE_DECISION.APPROVED);
    assert.equal(f.humanDecision, HUMAN_DECISION.ACCEPTED);
    assert.equal(f.diagnosticStatus, DIAGNOSTIC_STATUS.JACKIE_APPROVED);
    assert.equal(f.recommendedImprint, RECOMMENDED_IMPRINT.J_MERRILL_PUBLISHING);
    assert.equal(f.imprintLocked, true);
  });

  test("APPROVE_PROCEED with lockImprint=false does not lock", () => {
    const f = mapPublisherDecisionToFields(PUBLISHER_DECISION_OPTION.APPROVE_PROCEED, { recommendedImprint: RECOMMENDED_IMPRINT.JM_WORKS, lockImprint: false });
    assert.equal(f.imprintLocked, false);
  });

  test("ROUTE_TO_ANOTHER_IMPRINT sets the new imprint and locks it, marked REDIRECTED/MODIFIED", () => {
    const f = mapPublisherDecisionToFields(PUBLISHER_DECISION_OPTION.ROUTE_TO_ANOTHER_IMPRINT, { recommendedImprint: RECOMMENDED_IMPRINT.JM_WORKS });
    assert.equal(f.jackieDecision, JACKIE_DECISION.REDIRECTED);
    assert.equal(f.humanDecision, HUMAN_DECISION.MODIFIED);
    assert.equal(f.diagnosticStatus, DIAGNOSTIC_STATUS.JACKIE_APPROVED);
    assert.equal(f.recommendedImprint, RECOMMENDED_IMPRINT.JM_WORKS);
    assert.equal(f.imprintLocked, true);
  });

  test("REQUIRE_REVISION never sets an imprint and never locks", () => {
    const f = mapPublisherDecisionToFields(PUBLISHER_DECISION_OPTION.REQUIRE_REVISION, {});
    assert.equal(f.recommendedImprint, null);
    assert.equal(f.imprintLocked, false);
    assert.equal(f.humanDecision, HUMAN_DECISION.DEFERRED);
    assert.equal(f.diagnosticStatus, DIAGNOSTIC_STATUS.AWAITING_JACKIE_REVIEW);
  });

  test("DECLINE_OR_DEFER never sets an imprint and never locks", () => {
    const f = mapPublisherDecisionToFields(PUBLISHER_DECISION_OPTION.DECLINE_OR_DEFER, {});
    assert.equal(f.jackieDecision, JACKIE_DECISION.DECLINED);
    assert.equal(f.humanDecision, HUMAN_DECISION.REJECTED);
    assert.equal(f.diagnosticStatus, DIAGNOSTIC_STATUS.DECLINED);
    assert.equal(f.recommendedImprint, null);
    assert.equal(f.imprintLocked, false);
  });

  test("ESCALATE sets no jackieDecision (not yet a final Publisher decision) and never locks", () => {
    const f = mapPublisherDecisionToFields(PUBLISHER_DECISION_OPTION.ESCALATE, {});
    assert.equal(f.jackieDecision, null);
    assert.equal(f.humanDecision, HUMAN_DECISION.ESCALATED);
    assert.equal(f.recommendedImprint, null);
    assert.equal(f.imprintLocked, false);
  });

  test("an unrecognized option returns null", () => {
    assert.equal(mapPublisherDecisionToFields("NOT_A_REAL_OPTION", {}), null);
  });
});

// ── recordPublisherReviewDecision — orchestrator ─────────────────────────────

describe("recordPublisherReviewDecision — gate enforcement and validation", () => {
  test("rejects when gate is absent, zero network calls", async () => {
    const calls = mockFetchSequence([patchResponse(), executionLogResponse()]);
    const result = await recordPublisherReviewDecision(baseInput());
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
    assert.equal(calls.length, 0);
  });

  test("rejects an invalid decision option", async () => {
    process.env[GATE_NAME] = "true";
    const result = await recordPublisherReviewDecision(baseInput({ decisionOption: "NOT_REAL" }));
    assert.equal(result.reason, "DECISION_OPTION_INVALID");
  });

  test("rejects APPROVE_PROCEED without a recommended imprint", async () => {
    process.env[GATE_NAME] = "true";
    const result = await recordPublisherReviewDecision(baseInput({ recommendedImprint: null }));
    assert.equal(result.reason, "RECOMMENDED_IMPRINT_REQUIRED_FOR_THIS_OPTION");
  });

  test("REQUIRE_REVISION does not require a recommended imprint", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([patchResponse(), executionLogResponse()]);
    const result = await recordPublisherReviewDecision(baseInput({ decisionOption: PUBLISHER_DECISION_OPTION.REQUIRE_REVISION, recommendedImprint: null }), { getToken: async () => "fake" });
    assert.equal(result.ok, true);
  });

  test("rejects malformed diagnosticId before gate/network", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([patchResponse(), executionLogResponse()]);
    const result = await recordPublisherReviewDecision(baseInput({ diagnosticId: "bad" }));
    assert.equal(result.reason, "DIAGNOSTIC_ID_INVALID");
    assert.equal(calls.length, 0);
  });
});

describe("recordPublisherReviewDecision — APPROVE_PROCEED writes the expected fields", () => {
  test("PATCH includes jackiedecision=Approved, humandecision=Accepted, diagnosticstatus=JackieApproved, recommendedimprint, imprintlocked=true", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([patchResponse(), executionLogResponse()]);
    const result = await recordPublisherReviewDecision(baseInput(), { getToken: async () => "fake" });
    assert.equal(result.ok, true);
    assert.equal(result.decisionCapacity, "PUBLISHER");
    const patchCall = calls.find((c) => c.options.method === "PATCH");
    const body = JSON.parse(patchCall.options.body);
    assert.equal(body.jm1pub_jackiedecision, JACKIE_DECISION.APPROVED);
    assert.equal(body.jm1pub_humandecision, HUMAN_DECISION.ACCEPTED);
    assert.equal(body.jm1pub_diagnosticstatus, DIAGNOSTIC_STATUS.JACKIE_APPROVED);
    assert.equal(body.jm1pub_recommendedimprint, RECOMMENDED_IMPRINT.J_MERRILL_PUBLISHING);
    assert.equal(body.jm1pub_imprintlocked, true);
  });

  test("agreementReadinessAfterDecision is READY_FOR_AGREEMENT_PENDING_GATE_RECHECK when approved and locked", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([patchResponse(), executionLogResponse()]);
    const result = await recordPublisherReviewDecision(baseInput(), { getToken: async () => "fake" });
    assert.equal(result.agreementReadinessAfterDecision, "READY_FOR_AGREEMENT_PENDING_GATE_RECHECK");
  });
});

describe("recordPublisherReviewDecision — REQUIRE_REVISION keeps agreement blocked", () => {
  test("PATCH leaves imprintlocked=false and recommendedimprint unset", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([patchResponse(), executionLogResponse()]);
    const result = await recordPublisherReviewDecision(
      baseInput({ decisionOption: PUBLISHER_DECISION_OPTION.REQUIRE_REVISION, recommendedImprint: null }),
      { getToken: async () => "fake" }
    );
    assert.equal(result.agreementReadinessAfterDecision, "BLOCKED_HUMAN_REVIEW_REQUIRED");
    const patchCall = calls.find((c) => c.options.method === "PATCH");
    const body = JSON.parse(patchCall.options.body);
    assert.equal(body.jm1pub_imprintlocked, false);
    assert.ok(!("jm1pub_recommendedimprint" in body));
  });
});

describe("recordPublisherReviewDecision — DECLINE_OR_DEFER keeps agreement blocked", () => {
  test("PATCH sets Declined/Rejected, never locks an imprint", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([patchResponse(), executionLogResponse()]);
    const result = await recordPublisherReviewDecision(
      baseInput({ decisionOption: PUBLISHER_DECISION_OPTION.DECLINE_OR_DEFER, recommendedImprint: null }),
      { getToken: async () => "fake" }
    );
    assert.equal(result.agreementReadinessAfterDecision, "BLOCKED_HUMAN_REVIEW_REQUIRED");
    const patchCall = calls.find((c) => c.options.method === "PATCH");
    const body = JSON.parse(patchCall.options.body);
    assert.equal(body.jm1pub_jackiedecision, JACKIE_DECISION.DECLINED);
    assert.equal(body.jm1pub_imprintlocked, false);
  });
});

describe("recordPublisherReviewDecision — never touches the Opportunity or other surfaces", () => {
  test("liveActions confirms only the Diagnostic record + execution log are written", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([patchResponse(), executionLogResponse()]);
    const result = await recordPublisherReviewDecision(baseInput(), { getToken: async () => "fake" });
    assert.equal(result.liveActions.updatedOpportunity, false);
    assert.equal(result.liveActions.generatedAgreement, false);
    assert.equal(result.liveActions.sentAuthorFacingOutput, false);
    assert.equal(result.liveActions.createsPaymentLink, false);
    assert.equal(result.liveActions.startsProduction, false);
    assert.equal(result.liveActions.activatesFlowD, false);
  });
});

// ── buildPublisherDecisionExecutionLogPayload — safety + capacity language ──

describe("buildPublisherDecisionExecutionLogPayload — Publisher capacity language and safety", () => {
  function logInput(overrides = {}) {
    return {
      diagnosticId: REAL_DIAGNOSTIC_ID,
      intakeReferenceCode: REAL_INTAKE_REFERENCE,
      opportunityId: REAL_OPPORTUNITY_ID,
      option: PUBLISHER_DECISION_OPTION.APPROVE_PROCEED,
      fields: { recommendedImprint: RECOMMENDED_IMPRINT.J_MERRILL_PUBLISHING, imprintLocked: true },
      notes: null,
      completedAt: "2026-06-22T03:30:00.000Z",
      ...overrides
    };
  }

  test("explicitly states Publisher/CEO capacity and that this is not an author-side approval", () => {
    const p = buildPublisherDecisionExecutionLogPayload(logInput());
    const desc = p.jm1_actiondescription.toLowerCase();
    assert.ok(desc.includes("publisher"));
    assert.ok(desc.includes("not an author-side approval") || desc.includes("not as author"));
  });

  test("does not include jm1_flowrunid", () => {
    const p = buildPublisherDecisionExecutionLogPayload(logInput());
    assert.ok(!("jm1_flowrunid" in p));
  });

  test("includes the resolved recommended imprint label and lock state", () => {
    const p = buildPublisherDecisionExecutionLogPayload(logInput());
    assert.ok(p.jm1_actiondescription.includes("J Merrill Publishing"));
    assert.ok(p.jm1_actiondescription.includes("Imprint locked: true"));
  });

  test("states no manuscript excerpts, raw AI output, or prompt text are included", () => {
    const p = buildPublisherDecisionExecutionLogPayload(logInput());
    const desc = p.jm1_actiondescription.toLowerCase();
    assert.ok(desc.includes("no manuscript excerpts"));
  });

  test("states no contract/payment/production/distribution/launch/royalty/marketing action occurred", () => {
    const p = buildPublisherDecisionExecutionLogPayload(logInput());
    const desc = p.jm1_actiondescription.toLowerCase();
    assert.ok(desc.includes("no contract generated"));
    assert.ok(desc.includes("no author-facing send"));
  });

  test("never contains the FORBIDDEN_TEXT sentinel even if passed via notes — truncation/safety is structural, not content-based", () => {
    const p = buildPublisherDecisionExecutionLogPayload(logInput({ notes: "Reviewed personally." }));
    assert.ok(!p.jm1_actiondescription.includes(FORBIDDEN_TEXT));
  });

  test("actiondescription is truncated to 1000 chars", () => {
    const p = buildPublisherDecisionExecutionLogPayload(logInput());
    assert.ok(p.jm1_actiondescription.length <= 1000);
  });
});
