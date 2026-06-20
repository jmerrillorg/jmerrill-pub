"use strict";

const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  writeMilestone6OpportunityUpdate,
  writeMilestone6EvidenceOnlyLog,
  validateOpportunityPayload,
  buildMilestone6WriterExecutionLogPayload,
  buildMilestone6EvidenceRecoveryLogPayload,
  OPPORTUNITY_GATE_NAME,
  ALLOWED_ENTITY_SET,
  ALLOWED_OPPORTUNITY_FIELDS,
  EVIDENCE_RECOVERY_REASON
} = require("../src/author/milestone6OpportunityWriter");

const originalFetch = global.fetch;
const originalEnv = {
  [OPPORTUNITY_GATE_NAME]: process.env[OPPORTUNITY_GATE_NAME],
  DATAVERSE_WEB_API_BASE_URL: process.env.DATAVERSE_WEB_API_BASE_URL,
  DATAVERSE_RESOURCE_URL: process.env.DATAVERSE_RESOURCE_URL
};

const REAL_DIAGNOSTIC_ID = "64e387e0-7e6a-f111-a826-00224820105b";
const REAL_INTAKE_REFERENCE = "JMP-INT-202606-UFYG60";
const REAL_OPPORTUNITY_ID = "2653fca9-eacd-4c44-b3ed-1764dd5d35aa";

const VALID_PAYLOAD = Object.freeze({
  jm1pub_packagerecommended: "JMP-PKG-PRO",
  jm1_m6packageselectionstatus: "PACKAGE_SELECTED",
  jm1_m6authorselectedpackagecode: "JMP-PKG-PRO",
  jm1_m6stripeproductmappingstatus: "STRIPE_MAPPING_CONFIRMED",
  jm1_m6stripepricemappingstatus: "STRIPE_MAPPING_CONFIRMED",
  jm1_m6paymentoptionpreparationstatus: "PAYMENT_OPTIONS_READY_AFTER_PACKAGE_SELECTION",
  jm1_m6agreementpreparationstatus: "AGREEMENT_PREPARATION_READY",
  jm1_m6onboardingstatus: "ONBOARDING_READY",
  jm1_m6businesshandoffstatus: "BUSINESS_HANDOFF_READY"
});

function baseInput(overrides = {}) {
  return {
    diagnosticId: REAL_DIAGNOSTIC_ID,
    intakeReferenceCode: REAL_INTAKE_REFERENCE,
    entitySet: ALLOWED_ENTITY_SET,
    opportunityId: REAL_OPPORTUNITY_ID,
    opportunityPayload: { ...VALID_PAYLOAD },
    selectedPackageCode: "JMP-PKG-PRO",
    recommendedPackageCode: "JMP-PKG-PRO",
    alternatePackageCode: "JMP-PKG-STARTER",
    correlationId: "INT-PUB-005-M6-WRITER-TEST",
    ...overrides
  };
}

// Test-only token injection — bypasses real managed-identity credential
// resolution so unit tests never make a live Azure AD network call.
const FAKE_TOKEN_DEPS = { getToken: async () => "fake-test-token" };

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

function okPatchResponse() {
  return {
    ok: true,
    async json() {
      return { opportunityid: REAL_OPPORTUNITY_ID, "@odata.etag": "W/\"opp-etag-1\"" };
    }
  };
}

function okExecutionLogResponse() {
  return {
    ok: true,
    async json() {
      return { jm1_executionlogid: "11111111-1111-1111-1111-111111111111", "@odata.etag": "W/\"log-etag-1\"" };
    }
  };
}

beforeEach(() => {
  delete process.env[OPPORTUNITY_GATE_NAME];
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

// ── validateOpportunityPayload ────────────────────────────────────────────────

describe("validateOpportunityPayload — allowlist enforcement", () => {
  test("accepts a fully valid allowlisted payload", () => {
    const result = validateOpportunityPayload({ ...VALID_PAYLOAD });
    assert.equal(result.valid, true);
  });

  test("rejects a non-object payload", () => {
    assert.equal(validateOpportunityPayload("not an object").valid, false);
    assert.equal(validateOpportunityPayload(null).valid, false);
    assert.equal(validateOpportunityPayload(undefined).valid, false);
    assert.equal(validateOpportunityPayload([]).valid, false);
  });

  test("rejects an empty payload", () => {
    const result = validateOpportunityPayload({});
    assert.equal(result.valid, false);
    assert.equal(result.reason, "EMPTY_PAYLOAD");
  });

  test("rejects a payload containing an unknown field", () => {
    const result = validateOpportunityPayload({ ...VALID_PAYLOAD, unexpectedField: "value" });
    assert.equal(result.valid, false);
    assert.equal(result.reason, "UNKNOWN_FIELD_PRESENT");
    assert.ok(result.unknownFields.includes("unexpectedField"));
  });

  test("rejects a payload containing a forbidden live-action field", () => {
    const result = validateOpportunityPayload({ ...VALID_PAYLOAD, stripePaymentLinkUrl: "https://stripe.com/x" });
    assert.equal(result.valid, false);
    assert.equal(result.reason, "UNKNOWN_FIELD_PRESENT");
  });

  test("rejects a payload with a non-string field value", () => {
    const result = validateOpportunityPayload({ jm1pub_packagerecommended: 12345 });
    assert.equal(result.valid, false);
    assert.equal(result.reason, "INVALID_FIELD_VALUE");
  });

  test("rejects a payload with an empty-string field value", () => {
    const result = validateOpportunityPayload({ jm1pub_packagerecommended: "   " });
    assert.equal(result.valid, false);
    assert.equal(result.reason, "INVALID_FIELD_VALUE");
  });

  test("ALLOWED_OPPORTUNITY_FIELDS has exactly the nine Milestone 6 fields", () => {
    assert.equal(ALLOWED_OPPORTUNITY_FIELDS.length, 9);
    for (const f of Object.keys(VALID_PAYLOAD)) {
      assert.ok(ALLOWED_OPPORTUNITY_FIELDS.includes(f), `${f} must be in the allowlist`);
    }
  });
});

// ── writeMilestone6OpportunityUpdate — gate enforcement ───────────────────────

describe("writeMilestone6OpportunityUpdate — gate enforcement", () => {
  test("rejects when gate is absent (defaults closed)", async () => {
    const calls = mockFetchSequence([okPatchResponse(), okExecutionLogResponse()]);
    const result = await writeMilestone6OpportunityUpdate(baseInput());
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
    assert.equal(result.gate, OPPORTUNITY_GATE_NAME);
    assert.equal(calls.length, 0, "no fetch call must occur when gate is closed");
  });

  test("rejects when gate is explicitly false", async () => {
    process.env[OPPORTUNITY_GATE_NAME] = "false";
    const calls = mockFetchSequence([okPatchResponse(), okExecutionLogResponse()]);
    const result = await writeMilestone6OpportunityUpdate(baseInput());
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
    assert.equal(calls.length, 0);
  });

  test("rejects when gate value is not exactly 'true' (e.g. '1')", async () => {
    process.env[OPPORTUNITY_GATE_NAME] = "1";
    const result = await writeMilestone6OpportunityUpdate(baseInput());
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
  });

  test("gate check happens before any Dataverse network call", async () => {
    const calls = mockFetchSequence([okPatchResponse(), okExecutionLogResponse()]);
    await writeMilestone6OpportunityUpdate(baseInput({ opportunityPayload: { unexpected: "x" } }));
    // validation rejects before gate check too — but with gate closed AND bad payload, no fetch either way
    assert.equal(calls.length, 0);
  });
});

// ── writeMilestone6OpportunityUpdate — entity set allowlist ───────────────────

describe("writeMilestone6OpportunityUpdate — entity set allowlist", () => {
  test("rejects an unknown entity set even with gate open", async () => {
    process.env[OPPORTUNITY_GATE_NAME] = "true";
    const calls = mockFetchSequence([okPatchResponse(), okExecutionLogResponse()]);
    const result = await writeMilestone6OpportunityUpdate(baseInput({ entitySet: "contacts" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "ENTITY_SET_NOT_ALLOWED");
    assert.equal(result.entitySet, "contacts");
    assert.equal(calls.length, 0, "no fetch call must occur for a disallowed entity set");
  });

  test("rejects a missing entity set", async () => {
    process.env[OPPORTUNITY_GATE_NAME] = "true";
    const result = await writeMilestone6OpportunityUpdate(baseInput({ entitySet: "" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "ENTITY_SET_NOT_ALLOWED");
  });

  test("accepts only the exact string 'opportunities'", async () => {
    process.env[OPPORTUNITY_GATE_NAME] = "true";
    mockFetchSequence([okPatchResponse(), okExecutionLogResponse()]);
    const result = await writeMilestone6OpportunityUpdate(baseInput({ entitySet: "Opportunities" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "ENTITY_SET_NOT_ALLOWED", "entity set match must be case-sensitive exact");
  });
});

// ── writeMilestone6OpportunityUpdate — record creation rejection ─────────────

describe("writeMilestone6OpportunityUpdate — no create/POST capability for Opportunities", () => {
  test("module exposes no create/POST function for opportunities", () => {
    const mod = require("../src/author/milestone6OpportunityWriter");
    const fnNames = Object.keys(mod).filter((k) => typeof mod[k] === "function");
    for (const name of fnNames) {
      assert.ok(
        !/create/i.test(name) || name === "writeMilestone6OpportunityUpdate",
        `module must not export a create-style function: ${name}`
      );
    }
  });

  test("rejects a malformed Opportunity ID before any network call", async () => {
    process.env[OPPORTUNITY_GATE_NAME] = "true";
    const calls = mockFetchSequence([okPatchResponse(), okExecutionLogResponse()]);
    const result = await writeMilestone6OpportunityUpdate(baseInput({ opportunityId: "not-a-guid" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "OPPORTUNITY_ID_INVALID");
    assert.equal(calls.length, 0);
  });

  test("rejects an empty Opportunity ID", async () => {
    process.env[OPPORTUNITY_GATE_NAME] = "true";
    const result = await writeMilestone6OpportunityUpdate(baseInput({ opportunityId: "" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "OPPORTUNITY_ID_INVALID");
  });
});

// ── writeMilestone6OpportunityUpdate — payload validation pass-through ──────

describe("writeMilestone6OpportunityUpdate — payload validation enforced", () => {
  test("rejects unknown fields before any network call", async () => {
    process.env[OPPORTUNITY_GATE_NAME] = "true";
    const calls = mockFetchSequence([okPatchResponse(), okExecutionLogResponse()]);
    const result = await writeMilestone6OpportunityUpdate(
      baseInput({ opportunityPayload: { ...VALID_PAYLOAD, stripeCheckoutUrl: "https://x" } })
    );
    assert.equal(result.ok, false);
    assert.equal(result.reason, "UNKNOWN_FIELD_PRESENT");
    assert.equal(calls.length, 0);
  });

  test("rejects an empty opportunityPayload before any network call", async () => {
    process.env[OPPORTUNITY_GATE_NAME] = "true";
    const calls = mockFetchSequence([okPatchResponse(), okExecutionLogResponse()]);
    const result = await writeMilestone6OpportunityUpdate(baseInput({ opportunityPayload: {} }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "EMPTY_PAYLOAD");
    assert.equal(calls.length, 0);
  });

  test("rejects malformed diagnosticId before any network call", async () => {
    process.env[OPPORTUNITY_GATE_NAME] = "true";
    const calls = mockFetchSequence([okPatchResponse(), okExecutionLogResponse()]);
    const result = await writeMilestone6OpportunityUpdate(baseInput({ diagnosticId: "not-a-guid" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "DIAGNOSTIC_ID_INVALID");
    assert.equal(calls.length, 0);
  });

  test("rejects malformed intakeReferenceCode before any network call", async () => {
    process.env[OPPORTUNITY_GATE_NAME] = "true";
    const calls = mockFetchSequence([okPatchResponse(), okExecutionLogResponse()]);
    const result = await writeMilestone6OpportunityUpdate(baseInput({ intakeReferenceCode: "not-valid" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "INTAKE_REFERENCE_CODE_INVALID");
    assert.equal(calls.length, 0);
  });
});

// ── writeMilestone6OpportunityUpdate — successful controlled update ─────────

describe("writeMilestone6OpportunityUpdate — successful allowlisted PATCH", () => {
  test("performs exactly one PATCH and one execution-log POST when gate is open and payload is valid", async () => {
    process.env[OPPORTUNITY_GATE_NAME] = "true";
    const calls = mockFetchSequence([okPatchResponse(), okExecutionLogResponse()]);

    const result = await writeMilestone6OpportunityUpdate(baseInput(), FAKE_TOKEN_DEPS);

    assert.equal(result.ok, true);
    assert.equal(result.code, "MILESTONE_6_OPPORTUNITY_UPDATED");
    assert.equal(result.opportunityId, REAL_OPPORTUNITY_ID);
    assert.equal(result.diagnosticId, REAL_DIAGNOSTIC_ID);
    assert.equal(result.intakeReferenceCode, REAL_INTAKE_REFERENCE);
    assert.equal(result.selectedPackageCode, "JMP-PKG-PRO");
    assert.deepEqual(result.fieldsUpdated.sort(), Object.keys(VALID_PAYLOAD).sort());
    assert.equal(result.gateUsed, OPPORTUNITY_GATE_NAME);

    // Exactly two network calls: one PATCH (Opportunity), one POST (execution log)
    assert.equal(calls.length, 2);
    assert.equal(calls[0].options.method, "PATCH");
    assert.ok(calls[0].url.includes(`opportunities(${REAL_OPPORTUNITY_ID})`));
    assert.deepEqual(JSON.parse(calls[0].options.body), VALID_PAYLOAD);
    assert.equal(calls[1].options.method, "POST");
    assert.ok(calls[1].url.includes("jm1_executionlogs"));
  });

  test("execution log is reported as created on success", async () => {
    process.env[OPPORTUNITY_GATE_NAME] = "true";
    mockFetchSequence([okPatchResponse(), okExecutionLogResponse()]);
    const result = await writeMilestone6OpportunityUpdate(baseInput(), FAKE_TOKEN_DEPS);
    assert.equal(result.executionLog.created, true);
    assert.equal(result.executionLog.id, "11111111-1111-1111-1111-111111111111");
    assert.equal(result.executionLog.error, null);
  });

  test("all liveActions flags are false except updatedOpportunity", async () => {
    process.env[OPPORTUNITY_GATE_NAME] = "true";
    mockFetchSequence([okPatchResponse(), okExecutionLogResponse()]);
    const result = await writeMilestone6OpportunityUpdate(baseInput(), FAKE_TOKEN_DEPS);
    assert.equal(result.liveActions.updatedOpportunity, true);
    for (const [key, value] of Object.entries(result.liveActions)) {
      if (key === "updatedOpportunity") continue;
      assert.equal(value, false, `${key} must be false`);
    }
  });

  test("execution log write failure is reported but does not unwind a successful Opportunity update", async () => {
    process.env[OPPORTUNITY_GATE_NAME] = "true";
    mockFetchSequence([
      okPatchResponse(),
      { ok: false, status: 500, async json() { return { error: { message: "log write failed" } }; } }
    ]);
    const result = await writeMilestone6OpportunityUpdate(baseInput(), FAKE_TOKEN_DEPS);
    assert.equal(result.ok, true, "Opportunity update success must stand even if log write fails");
    assert.equal(result.executionLog.created, false);
    assert.equal(result.executionLog.error, "DATAVERSE_WRITE_FAILED");
  });
});

// ── writeMilestone6OpportunityUpdate — Dataverse PATCH failure paths ─────────

describe("writeMilestone6OpportunityUpdate — Dataverse failure handling", () => {
  test("returns DATAVERSE_CONFIG_MISSING when env vars are absent", async () => {
    process.env[OPPORTUNITY_GATE_NAME] = "true";
    delete process.env.DATAVERSE_WEB_API_BASE_URL;
    delete process.env.DATAVERSE_RESOURCE_URL;
    const result = await writeMilestone6OpportunityUpdate(baseInput());
    assert.equal(result.ok, false);
    assert.equal(result.reason, "DATAVERSE_CONFIG_MISSING");
  });

  test("returns a blocked result when the PATCH itself fails (e.g. record not found)", async () => {
    process.env[OPPORTUNITY_GATE_NAME] = "true";
    mockFetchSequence([
      { ok: false, status: 404, async json() { return { error: { message: "Not Found" } }; } }
    ]);
    const result = await writeMilestone6OpportunityUpdate(baseInput(), FAKE_TOKEN_DEPS);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "DATAVERSE_WRITE_FAILED");
    assert.equal(result.httpStatus, 404);
  });
});

// ── buildMilestone6WriterExecutionLogPayload — safety invariants ────────────

describe("buildMilestone6WriterExecutionLogPayload — safe evidence only", () => {
  function logInput(overrides = {}) {
    return {
      diagnosticId: REAL_DIAGNOSTIC_ID,
      intakeReferenceCode: REAL_INTAKE_REFERENCE,
      opportunityId: REAL_OPPORTUNITY_ID,
      selectedPackageCode: "JMP-PKG-PRO",
      recommendedPackageCode: "JMP-PKG-PRO",
      alternatePackageCode: "JMP-PKG-STARTER",
      paymentOptionPreparationStatus: "PAYMENT_OPTIONS_READY_AFTER_PACKAGE_SELECTION",
      agreementPreparationStatus: "AGREEMENT_PREPARATION_READY",
      onboardingStatus: "ONBOARDING_READY",
      correlationId: "INT-PUB-005-M6-WRITER-TEST",
      completedAt: "2026-06-20T12:00:00.000Z",
      ...overrides
    };
  }

  test("includes intake reference and diagnostic ID", () => {
    const p = buildMilestone6WriterExecutionLogPayload(logInput());
    assert.equal(p.jm1_sourcerecordid, REAL_DIAGNOSTIC_ID);
    assert.ok(p.jm1_actiondescription.includes(REAL_INTAKE_REFERENCE));
  });

  test("includes Opportunity ID and selected package", () => {
    const p = buildMilestone6WriterExecutionLogPayload(logInput());
    assert.ok(p.jm1_actiondescription.includes(REAL_OPPORTUNITY_ID));
    assert.ok(p.jm1_actiondescription.includes("JMP-PKG-PRO"));
  });

  test("includes the gate name used", () => {
    const p = buildMilestone6WriterExecutionLogPayload(logInput());
    assert.ok(p.jm1_actiondescription.includes(OPPORTUNITY_GATE_NAME));
  });

  test("explicitly states no Stripe/email/production/distribution/launch/royalty action", () => {
    const p = buildMilestone6WriterExecutionLogPayload(logInput());
    const desc = p.jm1_actiondescription.toLowerCase();
    assert.ok(desc.includes("no payment link"));
    assert.ok(desc.includes("no author email") || desc.includes("author email"));
    assert.ok(desc.includes("flow d activation"));
    assert.ok(desc.includes("production automation"));
    assert.ok(desc.includes("distribution submission"));
    assert.ok(desc.includes("launch/release"));
    assert.ok(desc.includes("royalty setup"));
  });

  test("explicitly states no manuscript text, prompt body, raw model output, secrets, tokens, or headers stored", () => {
    const p = buildMilestone6WriterExecutionLogPayload(logInput());
    const desc = p.jm1_actiondescription.toLowerCase();
    assert.ok(desc.includes("manuscript text"));
    assert.ok(desc.includes("prompt body"));
    assert.ok(desc.includes("raw model output"));
    assert.ok(desc.includes("secrets"));
    assert.ok(desc.includes("tokens"));
    assert.ok(desc.includes("headers"));
  });

  test("does not contain manuscript content, prompt instructions, or secret-like values", () => {
    const p = buildMilestone6WriterExecutionLogPayload(logInput());
    const all = JSON.stringify(p).toLowerCase();
    assert.ok(!all.includes("you are a"));
    assert.ok(!all.includes("given the manuscript"));
    assert.ok(!all.includes("bearer "));
    assert.ok(!all.includes("sk-"));
  });

  test("actiondescription is truncated to 1000 chars", () => {
    const p = buildMilestone6WriterExecutionLogPayload(logInput({ alternatePackageCode: "X".repeat(2000) }));
    assert.ok(p.jm1_actiondescription.length <= 1000);
  });

  test("jm1_flowrunid is correlationId when present", () => {
    const p = buildMilestone6WriterExecutionLogPayload(logInput());
    assert.equal(p.jm1_flowrunid, "INT-PUB-005-M6-WRITER-TEST");
  });

  test("jm1_flowrunid is null when correlationId absent", () => {
    const p = buildMilestone6WriterExecutionLogPayload(logInput({ correlationId: null }));
    assert.equal(p.jm1_flowrunid, null);
  });
});

// ── writeMilestone6EvidenceOnlyLog — evidence-only recovery path ────────────

function evidenceInput(overrides = {}) {
  return {
    diagnosticId: REAL_DIAGNOSTIC_ID,
    intakeReferenceCode: REAL_INTAKE_REFERENCE,
    opportunityId: REAL_OPPORTUNITY_ID,
    selectedPackageCode: "JMP-PKG-PRO",
    recommendedPackageCode: "JMP-PKG-PRO",
    alternatePackageCode: "JMP-PKG-STARTER",
    correlationId: "INT-PUB-005-M6-EVIDENCE-RECOVERY-TEST",
    ...overrides
  };
}

describe("writeMilestone6EvidenceOnlyLog — never touches Opportunity", () => {
  test("module never imports patchDataverseRecord usage from this function — no PATCH call occurs", async () => {
    process.env[OPPORTUNITY_GATE_NAME] = "true";
    const calls = mockFetchSequence([okExecutionLogResponse()]);
    await writeMilestone6EvidenceOnlyLog(evidenceInput(), FAKE_TOKEN_DEPS);
    assert.equal(calls.length, 1, "exactly one network call must occur: the execution-log POST");
    assert.equal(calls[0].options.method, "POST");
    assert.ok(calls[0].url.includes("jm1_executionlogs"));
    assert.ok(!calls[0].url.includes("opportunities"), "no Opportunity URL must ever be touched");
  });

  test("rejects when gate is absent (defaults closed), with zero network calls", async () => {
    const calls = mockFetchSequence([okExecutionLogResponse()]);
    const result = await writeMilestone6EvidenceOnlyLog(evidenceInput());
    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
    assert.equal(calls.length, 0);
  });

  test("rejects malformed diagnosticId before any network call", async () => {
    process.env[OPPORTUNITY_GATE_NAME] = "true";
    const calls = mockFetchSequence([okExecutionLogResponse()]);
    const result = await writeMilestone6EvidenceOnlyLog(evidenceInput({ diagnosticId: "not-a-guid" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "DIAGNOSTIC_ID_INVALID");
    assert.equal(calls.length, 0);
  });

  test("rejects malformed intakeReferenceCode before any network call", async () => {
    process.env[OPPORTUNITY_GATE_NAME] = "true";
    const calls = mockFetchSequence([okExecutionLogResponse()]);
    const result = await writeMilestone6EvidenceOnlyLog(evidenceInput({ intakeReferenceCode: "not-valid" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "INTAKE_REFERENCE_CODE_INVALID");
    assert.equal(calls.length, 0);
  });

  test("rejects malformed opportunityId before any network call", async () => {
    process.env[OPPORTUNITY_GATE_NAME] = "true";
    const calls = mockFetchSequence([okExecutionLogResponse()]);
    const result = await writeMilestone6EvidenceOnlyLog(evidenceInput({ opportunityId: "not-a-guid" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "OPPORTUNITY_ID_INVALID");
    assert.equal(calls.length, 0);
  });

  test("returns DATAVERSE_CONFIG_MISSING when env vars are absent", async () => {
    process.env[OPPORTUNITY_GATE_NAME] = "true";
    delete process.env.DATAVERSE_WEB_API_BASE_URL;
    delete process.env.DATAVERSE_RESOURCE_URL;
    const result = await writeMilestone6EvidenceOnlyLog(evidenceInput());
    assert.equal(result.ok, false);
    assert.equal(result.reason, "DATAVERSE_CONFIG_MISSING");
  });

  test("succeeds and returns the created execution-log record ID", async () => {
    process.env[OPPORTUNITY_GATE_NAME] = "true";
    mockFetchSequence([okExecutionLogResponse()]);
    const result = await writeMilestone6EvidenceOnlyLog(evidenceInput(), FAKE_TOKEN_DEPS);
    assert.equal(result.ok, true);
    assert.equal(result.code, "MILESTONE_6_EVIDENCE_RECOVERY_LOGGED");
    assert.equal(result.executionLog.created, true);
    assert.equal(result.executionLog.id, "11111111-1111-1111-1111-111111111111");
    assert.equal(result.diagnosticId, REAL_DIAGNOSTIC_ID);
    assert.equal(result.opportunityId, REAL_OPPORTUNITY_ID);
  });

  test("reports failure code when the log write itself fails, with zero Opportunity exposure", async () => {
    process.env[OPPORTUNITY_GATE_NAME] = "true";
    mockFetchSequence([
      { ok: false, status: 403, async json() { return { error: { message: "Create privilege missing" } }; } }
    ]);
    const result = await writeMilestone6EvidenceOnlyLog(evidenceInput(), FAKE_TOKEN_DEPS);
    assert.equal(result.ok, false);
    assert.equal(result.code, "MILESTONE_6_EVIDENCE_RECOVERY_LOG_FAILED");
    assert.equal(result.executionLog.created, false);
  });

  test("all liveActions flags are false, including updatedOpportunity", async () => {
    process.env[OPPORTUNITY_GATE_NAME] = "true";
    mockFetchSequence([okExecutionLogResponse()]);
    const result = await writeMilestone6EvidenceOnlyLog(evidenceInput(), FAKE_TOKEN_DEPS);
    for (const [key, value] of Object.entries(result.liveActions)) {
      assert.equal(value, false, `${key} must be false in the evidence-only path`);
    }
  });

  test("module exports no Opportunity-patching dependency reachable from the evidence path", () => {
    // Static guarantee: the evidence-only function's own source does not
    // reference patchDataverseRecord or ALLOWED_OPPORTUNITY_FIELDS at all.
    const fnSource = writeMilestone6EvidenceOnlyLog.toString();
    assert.ok(!fnSource.includes("patchDataverseRecord"), "evidence-only path must never reference the PATCH function");
  });
});

// ── buildMilestone6EvidenceRecoveryLogPayload — safety invariants ───────────

describe("buildMilestone6EvidenceRecoveryLogPayload — safe evidence only", () => {
  test("includes the evidence recovery reason constant", () => {
    const p = buildMilestone6EvidenceRecoveryLogPayload(evidenceInput({ completedAt: "2026-06-20T13:00:00.000Z" }));
    assert.ok(p.jm1_actiondescription.includes(EVIDENCE_RECOVERY_REASON));
  });

  test("states the Opportunity update result as SUCCEEDED", () => {
    const p = buildMilestone6EvidenceRecoveryLogPayload(evidenceInput({ completedAt: "2026-06-20T13:00:00.000Z" }));
    assert.ok(p.jm1_actiondescription.includes("Opportunity update result: SUCCEEDED"));
  });

  test("states that no Opportunity write occurs in this recovery path", () => {
    const p = buildMilestone6EvidenceRecoveryLogPayload(evidenceInput({ completedAt: "2026-06-20T13:00:00.000Z" }));
    assert.ok(p.jm1_actiondescription.toLowerCase().includes("no opportunity write occurs"));
  });

  test("includes intake reference, diagnostic ID, and Opportunity ID", () => {
    const p = buildMilestone6EvidenceRecoveryLogPayload(evidenceInput({ completedAt: "2026-06-20T13:00:00.000Z" }));
    assert.equal(p.jm1_sourcerecordid, REAL_DIAGNOSTIC_ID);
    assert.ok(p.jm1_actiondescription.includes(REAL_INTAKE_REFERENCE));
    assert.ok(p.jm1_actiondescription.includes(REAL_OPPORTUNITY_ID));
  });

  test("includes selected, recommended, and alternate package codes", () => {
    const p = buildMilestone6EvidenceRecoveryLogPayload(evidenceInput({ completedAt: "2026-06-20T13:00:00.000Z" }));
    assert.ok(p.jm1_actiondescription.includes("JMP-PKG-PRO"));
    assert.ok(p.jm1_actiondescription.includes("JMP-PKG-STARTER"));
  });

  test("does not contain manuscript content, prompt instructions, or secret-like values", () => {
    const p = buildMilestone6EvidenceRecoveryLogPayload(evidenceInput({ completedAt: "2026-06-20T13:00:00.000Z" }));
    const all = JSON.stringify(p).toLowerCase();
    assert.ok(!all.includes("you are a"));
    assert.ok(!all.includes("bearer "));
    assert.ok(!all.includes("sk-"));
  });

  test("actiondescription is truncated to 1000 chars", () => {
    const p = buildMilestone6EvidenceRecoveryLogPayload(
      evidenceInput({ alternatePackageCode: "X".repeat(2000), completedAt: "2026-06-20T13:00:00.000Z" })
    );
    assert.ok(p.jm1_actiondescription.length <= 1000);
  });

  test("jm1_actiontype is the dedicated evidence-recovery event type", () => {
    const p = buildMilestone6EvidenceRecoveryLogPayload(evidenceInput({ completedAt: "2026-06-20T13:00:00.000Z" }));
    assert.equal(p.jm1_actiontype, "MILESTONE_6_EVIDENCE_RECOVERY_LOG");
  });
});
