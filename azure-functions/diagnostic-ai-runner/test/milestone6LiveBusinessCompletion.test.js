"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  PACKAGE_CODES
} = require("../src/author/milestone6BusinessSourceLayer");
const {
  buildMilestone6CompletionPayloads,
  INTERNAL_VISIBILITY_MAILBOX,
  MILESTONE6_EVENT_TYPE,
  STATUS
} = require("../src/author/milestone6LiveBusinessCompletion");

const baseInput = Object.freeze({
  diagnosticId: "64e387e0-7e6a-f111-a826-00224820105b",
  intakeReferenceCode: "JMP-INT-202606-UFYG60",
  diagnosticPackage: {
    recommendedPackage: PACKAGE_CODES.PROFESSIONAL,
    packageRationale: "Professional fit after human editorial review."
  },
  opportunity: {
    opportunityId: "2653fca9-eacd-4c44-b3ed-1764dd5d35aa",
    active: true,
    name: "Publishing Intake - Establishing Glory: The Library",
    stepName: "2-Develop"
  },
  project: {
    title: "Establishing Glory: The Library"
  },
  author: {
    name: "Jackie Smith Jr",
    email: "chosen2k7@gmail.com"
  },
  completedAt: "2026-06-19T12:00:00.000Z"
});

function input(overrides = {}) {
  return {
    ...baseInput,
    ...overrides,
    diagnosticPackage: {
      ...baseInput.diagnosticPackage,
      ...(overrides.diagnosticPackage || {})
    },
    opportunity: {
      ...baseInput.opportunity,
      ...(overrides.opportunity || {})
    }
  };
}

describe("Milestone 6 live-business completion payloads", () => {
  test("builds safe Opportunity, Diagnostic, execution-log, and internal notification payloads", () => {
    const result = buildMilestone6CompletionPayloads(input());

    assert.equal(result.ok, true);
    assert.equal(result.opportunityId, baseInput.opportunity.opportunityId);
    assert.equal(result.payloads.opportunityPayload.jm1pub_packagerecommended, PACKAGE_CODES.PROFESSIONAL);
    assert.equal(result.payloads.diagnosticPayload.jm1_m6alternatepackagecode, PACKAGE_CODES.STARTER);
    assert.equal(result.payloads.opportunityPayload.jm1_m6packageselectionstatus, STATUS.packageSelectionPending);
    assert.equal(result.payloads.opportunityPayload.jm1_m6stripeproductmappingstatus, STATUS.stripeMappingConfirmed);
    assert.equal(result.payloads.opportunityPayload.jm1_m6stripepricemappingstatus, STATUS.stripeMappingConfirmed);
    assert.equal(result.payloads.opportunityPayload.jm1_m6paymentoptionpreparationstatus, STATUS.paymentOptionsPendingSelection);
    assert.equal(result.payloads.opportunityPayload.jm1_m6agreementpreparationstatus, STATUS.agreementReady);
    assert.equal(result.payloads.opportunityPayload.jm1_m6onboardingstatus, STATUS.onboardingReady);
    assert.equal(result.payloads.opportunityPayload.jm1_m6businesshandoffstatus, STATUS.businessHandoffReady);
    assert.equal(Object.hasOwn(result.payloads.opportunityPayload, "jm1_m6authorselectedpackagecode"), false);
    assert.equal(result.internalNotification.to, INTERNAL_VISIBILITY_MAILBOX);
    assert.deepEqual(result.internalNotification.cc, []);
    assert.deepEqual(result.internalNotification.bcc, []);
    assert.equal(result.internalNotification.type, MILESTONE6_EVENT_TYPE);
    assert.equal(result.internalNotification.safePreview.includes("No payment link"), true);
    assert.equal(result.payloads.executionLogPayload.jm1_actiontype, MILESTONE6_EVENT_TYPE);
  });

  test("records selected package and payment-option readiness only after author selection", () => {
    const result = buildMilestone6CompletionPayloads(input({
      authorSelectedPackageCode: PACKAGE_CODES.PROFESSIONAL
    }));

    assert.equal(result.ok, true);
    assert.equal(result.payloads.opportunityPayload.jm1_m6authorselectedpackagecode, PACKAGE_CODES.PROFESSIONAL);
    assert.equal(result.payloads.opportunityPayload.jm1_m6packageselectionstatus, STATUS.packageSelected);
    assert.equal(result.payloads.opportunityPayload.jm1_m6paymentoptionpreparationstatus, STATUS.paymentOptionsReady);
    assert.equal(result.statuses.paymentOptions, STATUS.paymentOptionsReady);
  });

  test("keeps forbidden live actions false", () => {
    const result = buildMilestone6CompletionPayloads(input());

    assert.equal(result.liveActions.sendsAuthorEmail, false);
    assert.equal(result.liveActions.sendsInternalNotification, false);
    assert.equal(result.liveActions.createsPaymentLink, false);
    assert.equal(result.liveActions.createsCheckoutSession, false);
    assert.equal(result.liveActions.sendsInvoice, false);
    assert.equal(result.liveActions.sendsContract, false);
    assert.equal(result.liveActions.requestsPayment, false);
    assert.equal(result.liveActions.createsOpportunity, false);
    assert.equal(result.liveActions.createsDuplicateOpportunity, false);
    assert.equal(result.liveActions.activatesFlowD, false);
    assert.equal(result.liveActions.startsProduction, false);
    assert.equal(result.liveActions.assignsIsbn, false);
    assert.equal(result.liveActions.usesQboForNewLogic, false);
  });

  test("fails closed on unsafe fields without echoing unsafe content", () => {
    const result = buildMilestone6CompletionPayloads(input({
      stripePaymentLink: "https://pay.example/secret",
      project: {
        title: "Project",
        rawModelOutput: "UNSAFE MODEL OUTPUT"
      }
    }));

    assert.equal(result.ok, false);
    assert.equal(result.reason, "UNSAFE_FIELD_PRESENT");
    assert.equal(JSON.stringify(result).includes("UNSAFE MODEL OUTPUT"), false);
    assert.equal(JSON.stringify(result).includes("pay.example"), false);
  });

  test("requires existing active Opportunity and governed identifiers", () => {
    const inactive = buildMilestone6CompletionPayloads(input({
      opportunity: { active: false }
    }));
    assert.equal(inactive.ok, false);
    assert.equal(inactive.reason, "ACTIVE_OPPORTUNITY_REQUIRED");

    const invalidReference = buildMilestone6CompletionPayloads(input({
      intakeReferenceCode: "bad-reference"
    }));
    assert.equal(invalidReference.ok, false);
    assert.equal(invalidReference.reason, "INTAKE_REFERENCE_CODE_INVALID");
  });
});
