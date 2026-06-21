"use strict";

const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  checkPreContractEditorialReviewGate,
  evaluatePreContractEditorialReviewReadiness,
  buildEditorialReviewGateExecutionLogPayload,
  GATE_NAME,
  DIAGNOSTIC_STATUS,
  JACKIE_DECISION,
  HUMAN_DECISION,
  RECOMMENDED_IMPRINT
} = require("../src/editorial/preContractEditorialReviewGate");

const originalFetch = global.fetch;
const originalEnv = {
  [GATE_NAME]: process.env[GATE_NAME],
  DATAVERSE_WEB_API_BASE_URL: process.env.DATAVERSE_WEB_API_BASE_URL,
  DATAVERSE_RESOURCE_URL: process.env.DATAVERSE_RESOURCE_URL
};

const REAL_DIAGNOSTIC_ID = "64e387e0-7e6a-f111-a826-00224820105b";
const REAL_INTAKE_REFERENCE = "JMP-INT-202606-UFYG60";
const REAL_OPPORTUNITY_ID = "2653fca9-eacd-4c44-b3ed-1764dd5d35aa";
const FAKE_TOKEN_DEPS = { getToken: async () => "fake-test-token" };

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

function okDiagnosticReadResponse(fields = {}) {
  return {
    ok: true,
    async json() {
      return {
        jm1pub_diagnosticstatus: null,
        jm1pub_jackiedecision: null,
        jm1pub_humandecision: null,
        jm1pub_editorialrecommendation: null,
        jm1pub_recommendedimprint: null,
        jm1pub_imprintlocked: false,
        jm1pub_imprintoverride: null,
        jm1pub_recommendedpackage: null,
        jm1pub_packageoverride: null,
        ...fields
      };
    }
  };
}

function okExecutionLogResponse() {
  return {
    ok: true,
    async json() {
      return { jm1_executionlogid: "55555555-5555-5555-5555-555555555555", "@odata.etag": "W/\"log-etag\"" };
    }
  };
}

function baseInput(overrides = {}) {
  return {
    diagnosticId: REAL_DIAGNOSTIC_ID,
    intakeReferenceCode: REAL_INTAKE_REFERENCE,
    opportunityId: REAL_OPPORTUNITY_ID,
    ...overrides
  };
}

// ── Pure evaluator — the actual enforcement logic ────────────────────────────

describe("evaluatePreContractEditorialReviewReadiness — the real controlled record's actual state", () => {
  test("the controlled record's real field values (as confirmed live) are correctly BLOCKED", () => {
    // These are the exact values confirmed via direct Dataverse read for
    // diagnosticId 64e387e0-7e6a-f111-a826-00224820105b on 2026-06-21:
    // diagnosticStatus=AWAITING_JACKIE_REVIEW, humanDecision=NO_DECISION,
    // recommendedImprint=null, imprintLocked=false.
    const result = evaluatePreContractEditorialReviewReadiness({
      diagnosticStatus: DIAGNOSTIC_STATUS.AWAITING_JACKIE_REVIEW,
      jackieDecision: null,
      humanDecision: HUMAN_DECISION.NO_DECISION,
      editorialRecommendation: null,
      recommendedImprint: null,
      imprintLocked: false,
      imprintOverride: null,
      recommendedPackage: null,
      packageOverride: null
    });
    assert.equal(result.readyForAgreement, false);
    assert.equal(result.editorialReviewComplete, false);
    assert.equal(result.imprintReady, false);
    assert.equal(result.recommendedImprintLabel, null);
    assert.deepEqual(result.blockingReasons, ["EDITORIAL_REVIEW_NOT_COMPLETE", "IMPRINT_NOT_RECOMMENDED_OR_LOCKED"]);
    assert.equal(result.routeBackTo, "EDITORIAL_REVIEW");
  });
});

describe("evaluatePreContractEditorialReviewReadiness — editorial review completion criteria", () => {
  test("diagnosticStatus COMPLETE alone satisfies editorial review completion", () => {
    const r = evaluatePreContractEditorialReviewReadiness({ diagnosticStatus: DIAGNOSTIC_STATUS.COMPLETE });
    assert.equal(r.editorialReviewComplete, true);
  });

  test("diagnosticStatus JACKIE_APPROVED alone satisfies editorial review completion", () => {
    const r = evaluatePreContractEditorialReviewReadiness({ diagnosticStatus: DIAGNOSTIC_STATUS.JACKIE_APPROVED });
    assert.equal(r.editorialReviewComplete, true);
  });

  test("jackieDecision APPROVED alone satisfies editorial review completion", () => {
    const r = evaluatePreContractEditorialReviewReadiness({
      diagnosticStatus: DIAGNOSTIC_STATUS.AWAITING_JACKIE_REVIEW,
      jackieDecision: JACKIE_DECISION.APPROVED
    });
    assert.equal(r.editorialReviewComplete, true);
  });

  test("a real human decision (ACCEPTED) satisfies editorial review completion even without diagnosticStatus complete", () => {
    const r = evaluatePreContractEditorialReviewReadiness({
      diagnosticStatus: DIAGNOSTIC_STATUS.IN_PROGRESS,
      humanDecision: HUMAN_DECISION.ACCEPTED
    });
    assert.equal(r.editorialReviewComplete, true);
  });

  test("AWAITING_JACKIE_REVIEW status alone does NOT satisfy completion", () => {
    const r = evaluatePreContractEditorialReviewReadiness({ diagnosticStatus: DIAGNOSTIC_STATUS.AWAITING_JACKIE_REVIEW });
    assert.equal(r.editorialReviewComplete, false);
  });

  test("PENDING status does NOT satisfy completion", () => {
    const r = evaluatePreContractEditorialReviewReadiness({ diagnosticStatus: DIAGNOSTIC_STATUS.PENDING });
    assert.equal(r.editorialReviewComplete, false);
  });

  test("humanDecision NO_DECISION does NOT satisfy completion", () => {
    const r = evaluatePreContractEditorialReviewReadiness({ humanDecision: HUMAN_DECISION.NO_DECISION });
    assert.equal(r.editorialReviewComplete, false);
  });

  test("humanDecision REJECTED does NOT satisfy completion (a real decision, but not an approval to proceed)", () => {
    const r = evaluatePreContractEditorialReviewReadiness({ humanDecision: HUMAN_DECISION.REJECTED });
    assert.equal(r.editorialReviewComplete, false);
  });

  test("humanDecision DEFERRED does NOT satisfy completion", () => {
    const r = evaluatePreContractEditorialReviewReadiness({ humanDecision: HUMAN_DECISION.DEFERRED });
    assert.equal(r.editorialReviewComplete, false);
  });
});

describe("evaluatePreContractEditorialReviewReadiness — imprint readiness criteria", () => {
  test("a recommended imprint alone satisfies imprint readiness", () => {
    const r = evaluatePreContractEditorialReviewReadiness({ recommendedImprint: RECOMMENDED_IMPRINT.J_MERRILL_PUBLISHING });
    assert.equal(r.imprintReady, true);
    assert.equal(r.recommendedImprintLabel, "J Merrill Publishing");
  });

  test("imprintLocked=true alone satisfies imprint readiness even without a recommendation value", () => {
    const r = evaluatePreContractEditorialReviewReadiness({ imprintLocked: true });
    assert.equal(r.imprintReady, true);
  });

  test("an imprint override satisfies imprint readiness and its label takes precedence over the recommendation", () => {
    const r = evaluatePreContractEditorialReviewReadiness({
      recommendedImprint: RECOMMENDED_IMPRINT.JM_WORKS,
      imprintOverride: RECOMMENDED_IMPRINT.JM_SIGNATURE
    });
    assert.equal(r.imprintReady, true);
    assert.equal(r.recommendedImprintLabel, "JM Signature");
  });

  test("no imprint recommendation, no lock, no override -> imprint not ready", () => {
    const r = evaluatePreContractEditorialReviewReadiness({});
    assert.equal(r.imprintReady, false);
    assert.equal(r.recommendedImprintLabel, null);
  });

  test("all five named imprint candidates resolve to a correct label", () => {
    const expectations = {
      [RECOMMENDED_IMPRINT.J_MERRILL_PUBLISHING]: "J Merrill Publishing",
      [RECOMMENDED_IMPRINT.JM_WORKS]: "JM Works",
      [RECOMMENDED_IMPRINT.JM_LITTLE]: "JM Little",
      [RECOMMENDED_IMPRINT.JM_VERSE]: "JM Verse",
      [RECOMMENDED_IMPRINT.JM_SIGNATURE]: "JM Signature"
    };
    for (const [code, label] of Object.entries(expectations)) {
      const r = evaluatePreContractEditorialReviewReadiness({ recommendedImprint: Number(code) });
      assert.equal(r.recommendedImprintLabel, label);
    }
  });
});

describe("evaluatePreContractEditorialReviewReadiness — readyForAgreement requires BOTH conditions", () => {
  test("review complete but imprint not ready -> still blocked", () => {
    const r = evaluatePreContractEditorialReviewReadiness({ diagnosticStatus: DIAGNOSTIC_STATUS.COMPLETE });
    assert.equal(r.readyForAgreement, false);
    assert.deepEqual(r.blockingReasons, ["IMPRINT_NOT_RECOMMENDED_OR_LOCKED"]);
  });

  test("imprint ready but review not complete -> still blocked", () => {
    const r = evaluatePreContractEditorialReviewReadiness({ imprintLocked: true });
    assert.equal(r.readyForAgreement, false);
    assert.deepEqual(r.blockingReasons, ["EDITORIAL_REVIEW_NOT_COMPLETE"]);
  });

  test("both conditions met -> ready for agreement, no blocking reasons, no route-back", () => {
    const r = evaluatePreContractEditorialReviewReadiness({
      diagnosticStatus: DIAGNOSTIC_STATUS.JACKIE_APPROVED,
      recommendedImprint: RECOMMENDED_IMPRINT.J_MERRILL_PUBLISHING
    });
    assert.equal(r.readyForAgreement, true);
    assert.deepEqual(r.blockingReasons, []);
    assert.equal(r.routeBackTo, null);
  });

  test("non-object input does not throw and is treated as fully blocked", () => {
    const r = evaluatePreContractEditorialReviewReadiness(null);
    assert.equal(r.readyForAgreement, false);
    assert.equal(r.blockingReasons.length, 2);
  });
});

// ── checkPreContractEditorialReviewGate — orchestrator ───────────────────────

describe("checkPreContractEditorialReviewGate — gate enforcement", () => {
  test("rejects when gate is absent (defaults closed), zero network calls", async () => {
    const calls = mockFetchSequence([okDiagnosticReadResponse(), okExecutionLogResponse()]);
    const result = await checkPreContractEditorialReviewGate(baseInput());
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
    assert.equal(calls.length, 0);
  });

  test("rejects when gate is explicitly false", async () => {
    process.env[GATE_NAME] = "false";
    const calls = mockFetchSequence([okDiagnosticReadResponse(), okExecutionLogResponse()]);
    const result = await checkPreContractEditorialReviewGate(baseInput());
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
    assert.equal(calls.length, 0);
  });
});

describe("checkPreContractEditorialReviewGate — input validation", () => {
  test("rejects malformed diagnosticId before gate/network", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([okDiagnosticReadResponse(), okExecutionLogResponse()]);
    const result = await checkPreContractEditorialReviewGate(baseInput({ diagnosticId: "bad" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "DIAGNOSTIC_ID_INVALID");
    assert.equal(calls.length, 0);
  });

  test("rejects missing opportunityId", async () => {
    const result = await checkPreContractEditorialReviewGate(baseInput({ opportunityId: "" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "OPPORTUNITY_ID_MISSING");
  });
});

describe("checkPreContractEditorialReviewGate — never writes to Opportunity or Diagnostic record", () => {
  test("only a GET (diagnostic read) and a POST (execution log) ever occur — no PATCH", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([okDiagnosticReadResponse(), okExecutionLogResponse()]);
    await checkPreContractEditorialReviewGate(baseInput(), FAKE_TOKEN_DEPS);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].options.method, "GET");
    assert.equal(calls[1].options.method, "POST");
    assert.ok(!calls.some((c) => c.options.method === "PATCH"));
  });

  test("the diagnostic read never selects the manuscript URL or raw AI output fields", async () => {
    process.env[GATE_NAME] = "true";
    const calls = mockFetchSequence([okDiagnosticReadResponse(), okExecutionLogResponse()]);
    await checkPreContractEditorialReviewGate(baseInput(), FAKE_TOKEN_DEPS);
    assert.ok(!calls[0].url.includes("manuscriptasseturl"));
    assert.ok(!calls[0].url.includes("airawresponse"));
    assert.ok(!calls[0].url.includes("diagnosticstructuredoutputjson"));
  });
});

describe("checkPreContractEditorialReviewGate — blocked result for the controlled record's real state", () => {
  test("returns readyForAgreement=false and routeBackTo=EDITORIAL_REVIEW when fields match the real record", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([
      okDiagnosticReadResponse({
        jm1pub_diagnosticstatus: DIAGNOSTIC_STATUS.AWAITING_JACKIE_REVIEW,
        jm1pub_humandecision: HUMAN_DECISION.NO_DECISION
      }),
      okExecutionLogResponse()
    ]);
    const result = await checkPreContractEditorialReviewGate(baseInput(), FAKE_TOKEN_DEPS);
    assert.equal(result.ok, true);
    assert.equal(result.code, "PRE_CONTRACT_EDITORIAL_REVIEW_GATE_BLOCKED");
    assert.equal(result.readyForAgreement, false);
    assert.equal(result.routeBackTo, "EDITORIAL_REVIEW");
    assert.ok(result.blockingReasons.includes("EDITORIAL_REVIEW_NOT_COMPLETE"));
    assert.ok(result.blockingReasons.includes("IMPRINT_NOT_RECOMMENDED_OR_LOCKED"));
  });

  test("execution log is still created on a blocked result (evidence of the check, not of success)", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([okDiagnosticReadResponse(), okExecutionLogResponse()]);
    const result = await checkPreContractEditorialReviewGate(baseInput(), FAKE_TOKEN_DEPS);
    assert.equal(result.executionLog.created, true);
    assert.equal(result.executionLog.id, "55555555-5555-5555-5555-555555555555");
  });

  test("all liveActions flags are false except readDiagnosticRecord", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([okDiagnosticReadResponse(), okExecutionLogResponse()]);
    const result = await checkPreContractEditorialReviewGate(baseInput(), FAKE_TOKEN_DEPS);
    assert.equal(result.liveActions.readDiagnosticRecord, true);
    for (const [key, value] of Object.entries(result.liveActions)) {
      if (key === "readDiagnosticRecord") continue;
      assert.equal(value, false, `${key} must be false`);
    }
  });
});

describe("checkPreContractEditorialReviewGate — passes when review/imprint are complete", () => {
  test("returns readyForAgreement=true when diagnosticStatus is JACKIE_APPROVED and an imprint is recommended", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([
      okDiagnosticReadResponse({
        jm1pub_diagnosticstatus: DIAGNOSTIC_STATUS.JACKIE_APPROVED,
        jm1pub_recommendedimprint: RECOMMENDED_IMPRINT.J_MERRILL_PUBLISHING
      }),
      okExecutionLogResponse()
    ]);
    const result = await checkPreContractEditorialReviewGate(baseInput(), FAKE_TOKEN_DEPS);
    assert.equal(result.code, "PRE_CONTRACT_EDITORIAL_REVIEW_GATE_PASSED");
    assert.equal(result.readyForAgreement, true);
    assert.equal(result.recommendedImprintLabel, "J Merrill Publishing");
    assert.deepEqual(result.blockingReasons, []);
  });
});

describe("checkPreContractEditorialReviewGate — Dataverse failure handling", () => {
  test("returns DATAVERSE_CONFIG_MISSING when env vars are absent", async () => {
    process.env[GATE_NAME] = "true";
    delete process.env.DATAVERSE_WEB_API_BASE_URL;
    delete process.env.DATAVERSE_RESOURCE_URL;
    const result = await checkPreContractEditorialReviewGate(baseInput());
    assert.equal(result.ok, false);
    assert.equal(result.reason, "DATAVERSE_CONFIG_MISSING");
  });

  test("returns a blocked result when the diagnostic read fails", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([{ ok: false, status: 404, async json() { return {}; } }]);
    const result = await checkPreContractEditorialReviewGate(baseInput(), FAKE_TOKEN_DEPS);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "DATAVERSE_READ_FAILED");
  });

  test("execution-log write failure does not unwind a successful check", async () => {
    process.env[GATE_NAME] = "true";
    mockFetchSequence([
      okDiagnosticReadResponse(),
      { ok: false, status: 403, async json() { return { error: { code: "X" } }; } }
    ]);
    const result = await checkPreContractEditorialReviewGate(baseInput(), FAKE_TOKEN_DEPS);
    assert.equal(result.ok, true);
    assert.equal(result.executionLog.created, false);
  });
});

// ── buildEditorialReviewGateExecutionLogPayload — safety invariants ─────────

describe("buildEditorialReviewGateExecutionLogPayload — safe evidence only", () => {
  function logInput(overrides = {}) {
    return {
      diagnosticId: REAL_DIAGNOSTIC_ID,
      intakeReferenceCode: REAL_INTAKE_REFERENCE,
      opportunityId: REAL_OPPORTUNITY_ID,
      readiness: {
        editorialReviewComplete: false,
        imprintReady: false,
        recommendedImprintLabel: null,
        readyForAgreement: false,
        blockingReasons: ["EDITORIAL_REVIEW_NOT_COMPLETE", "IMPRINT_NOT_RECOMMENDED_OR_LOCKED"],
        routeBackTo: "EDITORIAL_REVIEW"
      },
      completedAt: "2026-06-21T13:00:00.000Z",
      ...overrides
    };
  }

  test("does not include jm1_flowrunid", () => {
    const p = buildEditorialReviewGateExecutionLogPayload(logInput());
    assert.ok(!("jm1_flowrunid" in p));
  });

  test("states no raw AI output, raw manuscript text, prompt body, or secrets stored", () => {
    const p = buildEditorialReviewGateExecutionLogPayload(logInput());
    const desc = p.jm1_actiondescription.toLowerCase();
    assert.ok(desc.includes("raw ai output"));
    assert.ok(desc.includes("raw manuscript text"));
    assert.ok(desc.includes("secrets"));
  });

  test("states no contract generated and no author-facing send occurred", () => {
    const p = buildEditorialReviewGateExecutionLogPayload(logInput());
    const desc = p.jm1_actiondescription.toLowerCase();
    assert.ok(desc.includes("no contract generated"));
    assert.ok(desc.includes("no author-facing send"));
  });

  test("includes the blocking reasons and route-back target when blocked", () => {
    const p = buildEditorialReviewGateExecutionLogPayload(logInput());
    assert.ok(p.jm1_actiondescription.includes("EDITORIAL_REVIEW_NOT_COMPLETE"));
    assert.ok(p.jm1_actiondescription.includes("IMPRINT_NOT_RECOMMENDED_OR_LOCKED"));
    assert.ok(p.jm1_actiondescription.includes("EDITORIAL_REVIEW"));
  });

  test("omits blocking-reasons text when the gate passed", () => {
    const p = buildEditorialReviewGateExecutionLogPayload(logInput({
      readiness: {
        editorialReviewComplete: true,
        imprintReady: true,
        recommendedImprintLabel: "J Merrill Publishing",
        readyForAgreement: true,
        blockingReasons: [],
        routeBackTo: null
      }
    }));
    assert.ok(!p.jm1_actiondescription.includes("Blocking reasons"));
    assert.ok(p.jm1_actiondescription.includes("J Merrill Publishing"));
  });

  test("jm1_actiontype is the dedicated gate-check event type", () => {
    const p = buildEditorialReviewGateExecutionLogPayload(logInput());
    assert.equal(p.jm1_actiontype, "PRE_CONTRACT_EDITORIAL_REVIEW_GATE_CHECKED");
  });

  test("actiondescription is truncated to 1000 chars", () => {
    const p = buildEditorialReviewGateExecutionLogPayload(logInput());
    assert.ok(p.jm1_actiondescription.length <= 1000);
  });
});
