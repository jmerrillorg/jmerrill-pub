const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

// Inline the patterns from runStage0Diagnostic.js for isolated unit testing.
const DIAGNOSTIC_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REFERENCE_PATTERN = /^JMP-INT-\d{6}-[A-Z0-9-]+$/i;
const CORRELATION_ID_PATTERN = /^[0-9a-zA-Z_-]{1,100}$/;

// Pilot allowlist — mirrors constants in runStage0Diagnostic.js
const AUTHORIZED_PILOT_DIAGNOSTIC_ID  = "64e387e0-7e6a-f111-a826-00224820105b";
const AUTHORIZED_PILOT_REFERENCE_CODE = "JMP-INT-202606-UFYG60";

const VALID_DIAGNOSTIC_ID = "6490a7de-b868-f111-a826-000d3a14673b";
const VALID_REFERENCE = "JMP-INT-240601-TESTAUTH";
const VALID_CORRELATION = "corr-abc123";

describe("diagnosticId validation", () => {
  it("accepts a valid UUID", () => {
    assert.ok(DIAGNOSTIC_ID_PATTERN.test(VALID_DIAGNOSTIC_ID));
  });

  it("rejects an empty string", () => {
    assert.ok(!DIAGNOSTIC_ID_PATTERN.test(""));
  });

  it("rejects a non-UUID string", () => {
    assert.ok(!DIAGNOSTIC_ID_PATTERN.test("not-a-uuid"));
  });

  it("rejects a UUID with wrong segment lengths", () => {
    assert.ok(!DIAGNOSTIC_ID_PATTERN.test("6490a7de-b868-f111-a826"));
  });
});

describe("intakeReferenceCode validation", () => {
  it("accepts a valid reference code", () => {
    assert.ok(REFERENCE_PATTERN.test(VALID_REFERENCE));
  });

  it("is case-insensitive", () => {
    assert.ok(REFERENCE_PATTERN.test("jmp-int-240601-testauth"));
  });

  it("rejects a code missing the prefix", () => {
    assert.ok(!REFERENCE_PATTERN.test("INT-240601-TESTAUTH"));
  });

  it("rejects an empty string", () => {
    assert.ok(!REFERENCE_PATTERN.test(""));
  });

  it("rejects a code with a non-numeric date segment", () => {
    assert.ok(!REFERENCE_PATTERN.test("JMP-INT-ABCDEF-TESTAUTH"));
  });
});

describe("correlationId validation", () => {
  it("accepts a valid correlation ID", () => {
    assert.ok(CORRELATION_ID_PATTERN.test(VALID_CORRELATION));
  });

  it("accepts alphanumeric with underscores and hyphens", () => {
    assert.ok(CORRELATION_ID_PATTERN.test("abc_123-XYZ"));
  });

  it("rejects an empty string", () => {
    assert.ok(!CORRELATION_ID_PATTERN.test(""));
  });

  it("rejects a string with spaces", () => {
    assert.ok(!CORRELATION_ID_PATTERN.test("corr id"));
  });

  it("rejects a string exceeding 100 characters", () => {
    assert.ok(!CORRELATION_ID_PATTERN.test("a".repeat(101)));
  });
});

// ---------------------------------------------------------------------------
// Pilot authorization guard — dual allowlist
// ---------------------------------------------------------------------------

describe("pilot authorization guard", () => {
  function pilotGuard(diagnosticId, intakeReferenceCode) {
    const idMatch  = diagnosticId.toLowerCase()       === AUTHORIZED_PILOT_DIAGNOSTIC_ID;
    const refMatch = intakeReferenceCode.toUpperCase() === AUTHORIZED_PILOT_REFERENCE_CODE;
    return idMatch && refMatch;
  }

  it("authorizes the one approved pilot record", () => {
    assert.ok(pilotGuard(AUTHORIZED_PILOT_DIAGNOSTIC_ID, AUTHORIZED_PILOT_REFERENCE_CODE));
  });

  it("authorizes regardless of diagnosticId letter case", () => {
    assert.ok(pilotGuard(AUTHORIZED_PILOT_DIAGNOSTIC_ID.toUpperCase(), AUTHORIZED_PILOT_REFERENCE_CODE));
  });

  it("authorizes regardless of intakeReferenceCode letter case", () => {
    assert.ok(pilotGuard(AUTHORIZED_PILOT_DIAGNOSTIC_ID, AUTHORIZED_PILOT_REFERENCE_CODE.toLowerCase()));
  });

  it("blocks when diagnosticId does not match", () => {
    assert.ok(!pilotGuard("00000000-0000-0000-0000-000000000000", AUTHORIZED_PILOT_REFERENCE_CODE));
  });

  it("blocks when intakeReferenceCode does not match", () => {
    assert.ok(!pilotGuard(AUTHORIZED_PILOT_DIAGNOSTIC_ID, "JMP-INT-202606-WRONG1"));
  });

  it("blocks when both values are wrong", () => {
    assert.ok(!pilotGuard("00000000-0000-0000-0000-000000000000", "JMP-INT-202606-WRONG1"));
  });

  it("blocks an empty diagnosticId", () => {
    assert.ok(!pilotGuard("", AUTHORIZED_PILOT_REFERENCE_CODE));
  });

  it("blocks an empty intakeReferenceCode", () => {
    assert.ok(!pilotGuard(AUTHORIZED_PILOT_DIAGNOSTIC_ID, ""));
  });

  it("authorized diagnosticId matches the Approval 2 pilot record exactly", () => {
    assert.equal(AUTHORIZED_PILOT_DIAGNOSTIC_ID, "64e387e0-7e6a-f111-a826-00224820105b");
  });

  it("authorized intakeReferenceCode matches the Approval 2 pilot intake exactly", () => {
    assert.equal(AUTHORIZED_PILOT_REFERENCE_CODE, "JMP-INT-202606-UFYG60");
  });
});
