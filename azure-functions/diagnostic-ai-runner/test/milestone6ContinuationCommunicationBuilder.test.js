"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildMilestone6ContinuationCommunication,
  PACKAGE_DISPLAY_NAMES,
  INTERNAL_VISIBILITY_MAILBOX
} = require("../src/author/milestone6ContinuationCommunicationBuilder");

const REAL_DIAGNOSTIC_ID = "64e387e0-7e6a-f111-a826-00224820105b";
const REAL_INTAKE_REFERENCE = "JMP-INT-202606-UFYG60";

const VALID_PAYMENT_OPTIONS = Object.freeze([
  { payments: 1, totalPerInstallmentUsd: 4500.00 },
  { payments: 2, totalPerInstallmentUsd: 2340.00 },
  { payments: 4, totalPerInstallmentUsd: 1170.00 },
  { payments: 8, totalPerInstallmentUsd: 585.00 },
  { payments: 12, totalPerInstallmentUsd: 390.00 }
]);

function validInput(overrides = {}) {
  return {
    diagnosticId: REAL_DIAGNOSTIC_ID,
    intakeReferenceCode: REAL_INTAKE_REFERENCE,
    authorName: "Jackie Smith Jr",
    authorEmail: "chosen2k7@gmail.com",
    projectTitle: "Establishing Glory: The Library",
    selectedPackageCode: "JMP-PKG-PRO",
    paymentOptions: VALID_PAYMENT_OPTIONS,
    approvedBy: "Jackie (J Merrill Publishing)",
    ...overrides
  };
}

describe("buildMilestone6ContinuationCommunication — successful build", () => {
  test("returns ok with a sendApproval object", () => {
    const result = buildMilestone6ContinuationCommunication(validInput());
    assert.equal(result.ok, true);
    assert.ok(result.sendApproval);
  });

  test("sendApproval has decision APPROVE_AUTHOR_SEND and sendApproved true", () => {
    const result = buildMilestone6ContinuationCommunication(validInput());
    assert.equal(result.sendApproval.decision, "APPROVE_AUTHOR_SEND");
    assert.equal(result.sendApproval.sendApproved, true);
  });

  test("sendApproval targets the confirmed author email and internal visibility mailbox", () => {
    const result = buildMilestone6ContinuationCommunication(validInput());
    assert.equal(result.sendApproval.authorEmail, "chosen2k7@gmail.com");
    assert.equal(result.sendApproval.internalVisibilityMailbox, INTERNAL_VISIBILITY_MAILBOX);
  });

  test("subject includes the project title and package display name", () => {
    const result = buildMilestone6ContinuationCommunication(validInput());
    assert.ok(result.sendApproval.draftSubject.includes("Establishing Glory: The Library"));
    assert.ok(result.sendApproval.draftSubject.includes("Professional Publishing Package"));
  });

  test("body includes the package confirmation", () => {
    const result = buildMilestone6ContinuationCommunication(validInput());
    assert.ok(result.sendApproval.draftBody.includes("Professional Publishing Package"));
  });

  test("body includes all five payment options with correct dollar amounts", () => {
    const result = buildMilestone6ContinuationCommunication(validInput());
    const body = result.sendApproval.draftBody;
    assert.ok(body.includes("Single payment: $4,500.00"));
    assert.ok(body.includes("2 payments: $2,340.00 each"));
    assert.ok(body.includes("4 payments: $1,170.00 each"));
    assert.ok(body.includes("8 payments: $585.00 each"));
    assert.ok(body.includes("12 payments: $390.00 each"));
  });

  test("body discloses the 4% processing fee scoped to multi-payment options only", () => {
    const result = buildMilestone6ContinuationCommunication(validInput());
    assert.ok(result.sendApproval.draftBody.includes(
      "The 4% processing fee applies only to multi-payment options"
    ));
  });

  test("body does not state the fee applies to the package/all options generally", () => {
    const result = buildMilestone6ContinuationCommunication(validInput());
    assert.ok(!result.sendApproval.draftBody.includes("including a 4% processing fee"));
  });

  test("single-payment amount does not include the 4% fee (matches package cost exactly)", () => {
    const result = buildMilestone6ContinuationCommunication(validInput());
    assert.ok(result.sendApproval.draftBody.includes("Single payment: $4,500.00"));
    assert.ok(!result.sendApproval.draftBody.includes("Single payment: $4,680.00"));
  });

  test("body includes agreement/onboarding next-step language", () => {
    const result = buildMilestone6ContinuationCommunication(validInput());
    const body = result.sendApproval.draftBody.toLowerCase();
    assert.ok(body.includes("agreement"));
    assert.ok(body.includes("onboarding"));
  });

  test("body includes a scheduling/meeting option", () => {
    const result = buildMilestone6ContinuationCommunication(validInput());
    const body = result.sendApproval.draftBody.toLowerCase();
    assert.ok(body.includes("schedule") || body.includes("call"));
  });

  test("body states nothing moves to production until payment/agreement/onboarding are complete", () => {
    const result = buildMilestone6ContinuationCommunication(validInput());
    const body = result.sendApproval.draftBody.toLowerCase();
    assert.ok(body.includes("nothing moves forward into production"));
  });

  test("future-send flags are both true", () => {
    const result = buildMilestone6ContinuationCommunication(validInput());
    assert.equal(result.sendApproval.futureSendRequiresInternalCopy, true);
    assert.equal(result.sendApproval.futureSendRequiresDataverseLog, true);
  });

  test("records approvedBy and a default approvedOn timestamp", () => {
    const result = buildMilestone6ContinuationCommunication(validInput());
    assert.equal(result.sendApproval.approvedBy, "Jackie (J Merrill Publishing)");
    assert.ok(result.sendApproval.approvedOn);
  });
});

describe("buildMilestone6ContinuationCommunication — content safety (no diagnostic/AI content)", () => {
  test("input surface has no field for manuscript, prompt, or AI model output", () => {
    const result = buildMilestone6ContinuationCommunication(validInput({
      diagnosticOutputSummary: "should be ignored",
      manuscriptText: "should be ignored",
      promptBody: "should be ignored"
    }));
    const body = result.sendApproval.draftBody;
    assert.ok(!body.includes("should be ignored"));
  });

  test("body never contains the words manuscript, diagnostic, confidence, or risk flag", () => {
    const result = buildMilestone6ContinuationCommunication(validInput());
    const body = result.sendApproval.draftBody.toLowerCase();
    assert.ok(!body.includes("manuscript"));
    assert.ok(!body.includes("diagnostic"));
    assert.ok(!body.includes("confidence"));
    assert.ok(!body.includes("risk flag"));
  });

  test("body contains no tax language", () => {
    const result = buildMilestone6ContinuationCommunication(validInput());
    assert.ok(!result.sendApproval.draftBody.toLowerCase().includes("tax"));
  });

  test("body contains no pressure language (deadline, urgent, act now, limited time)", () => {
    const result = buildMilestone6ContinuationCommunication(validInput());
    const body = result.sendApproval.draftBody.toLowerCase();
    for (const phrase of ["urgent", "act now", "limited time", "deadline", "hurry"]) {
      assert.ok(!body.includes(phrase), `body must not contain pressure phrase: ${phrase}`);
    }
  });

  test("uses templateName MILESTONE_6_PACKAGE_PAYMENT_ONBOARDING_NEXT_STEP, not a diagnostic template", () => {
    const result = buildMilestone6ContinuationCommunication(validInput());
    assert.equal(result.sendApproval.templateName, "MILESTONE_6_PACKAGE_PAYMENT_ONBOARDING_NEXT_STEP");
    assert.notEqual(result.sendApproval.templateName, "INITIAL_DIAGNOSTIC_REVIEW_NEXT_STEP");
  });
});

describe("buildMilestone6ContinuationCommunication — validation rejections", () => {
  test("rejects missing diagnosticId", () => {
    const result = buildMilestone6ContinuationCommunication(validInput({ diagnosticId: "" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "DIAGNOSTIC_ID_MISSING");
  });

  test("rejects missing authorName", () => {
    const result = buildMilestone6ContinuationCommunication(validInput({ authorName: "" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "AUTHOR_NAME_MISSING");
  });

  test("rejects an invalid author email", () => {
    const result = buildMilestone6ContinuationCommunication(validInput({ authorEmail: "not-an-email" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "AUTHOR_EMAIL_INVALID");
  });

  test("rejects a @jmerrill.pub author email", () => {
    const result = buildMilestone6ContinuationCommunication(validInput({ authorEmail: "x@jmerrill.pub" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "JMERRILL_PUB_MAILBOX_NOT_ALLOWED");
  });

  test("rejects missing projectTitle", () => {
    const result = buildMilestone6ContinuationCommunication(validInput({ projectTitle: "" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "PROJECT_TITLE_MISSING");
  });

  test("rejects an unknown package code", () => {
    const result = buildMilestone6ContinuationCommunication(validInput({ selectedPackageCode: "JMP-PKG-NOPE" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "SELECTED_PACKAGE_CODE_INVALID");
  });

  test("rejects an empty paymentOptions array", () => {
    const result = buildMilestone6ContinuationCommunication(validInput({ paymentOptions: [] }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "PAYMENT_OPTIONS_MISSING");
  });

  test("rejects a non-array paymentOptions", () => {
    const result = buildMilestone6ContinuationCommunication(validInput({ paymentOptions: "not-an-array" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "PAYMENT_OPTIONS_MISSING");
  });

  test("rejects a malformed payment option entry", () => {
    const result = buildMilestone6ContinuationCommunication(validInput({
      paymentOptions: [{ payments: 1, totalPerInstallmentUsd: "not-a-number" }]
    }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "PAYMENT_OPTIONS_INVALID");
  });

  test("rejects missing approvedBy", () => {
    const result = buildMilestone6ContinuationCommunication(validInput({ approvedBy: "" }));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "APPROVED_BY_MISSING");
  });

  test("rejects non-object input", () => {
    assert.equal(buildMilestone6ContinuationCommunication("not an object").ok, false);
    assert.equal(buildMilestone6ContinuationCommunication(null).ok, false);
  });
});

describe("PACKAGE_DISPLAY_NAMES — all four governed packages mapped", () => {
  test("contains all four package codes", () => {
    assert.equal(PACKAGE_DISPLAY_NAMES["JMP-PKG-STARTER"], "Starter Publishing Package");
    assert.equal(PACKAGE_DISPLAY_NAMES["JMP-PKG-PRO"], "Professional Publishing Package");
    assert.equal(PACKAGE_DISPLAY_NAMES["JMP-PKG-PREMIER"], "Premier Publishing Package");
    assert.equal(PACKAGE_DISPLAY_NAMES["JMP-PKG-CHILD"], "Children's Publishing Package");
  });
});
