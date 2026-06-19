"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  PACKAGE_CODES
} = require("../src/author/milestone6BusinessSourceLayer");
const {
  buildMilestone6AuthorChoicePath,
  buildPaymentOptionData,
  AUTHOR_CHOICE_TYPES,
  INTERNAL_VISIBILITY_MAILBOX,
  STATUS
} = require("../src/author/milestone6AuthorChoicePath");

const baseInput = Object.freeze({
  diagnosticId: "64e387e0-7e6a-f111-a826-00224820105b",
  intakeReferenceCode: "JMP-INT-202606-UFYG60",
  diagnosticPackage: {
    recommendedPackage: PACKAGE_CODES.PROFESSIONAL
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
  completedAt: "2026-06-19T12:30:00.000Z"
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

describe("Milestone 6B author package-selection branches", () => {
  test("suggested package selection stores the recommended package and prepares payment options", () => {
    const result = buildMilestone6AuthorChoicePath(input({
      authorChoiceType: AUTHOR_CHOICE_TYPES.SELECT_SUGGESTED_PACKAGE
    }));

    assert.equal(result.ok, true);
    assert.equal(result.selectedPackage.code, PACKAGE_CODES.PROFESSIONAL);
    assert.equal(result.branch.packageSelectionStatus, STATUS.packageSelected);
    assert.equal(result.branch.paymentOptionPreparationStatus, STATUS.paymentOptionsPrepared);
    assert.equal(result.branch.agreementPreparationStatus, STATUS.agreementReady);
    assert.equal(result.branch.onboardingStatus, STATUS.onboardingReady);
    assert.equal(result.payloads.opportunityPayload.jm1_m6authorselectedpackagecode, PACKAGE_CODES.PROFESSIONAL);
    assert.equal(result.payloads.opportunityPayload.jm1_m6packageselectionstatus, STATUS.packageSelected);
    assert.equal(result.payloads.opportunityPayload.jm1_m6paymentoptionpreparationstatus, STATUS.paymentOptionsPrepared);
    assert.equal(result.paymentOptions.length, 5);
    assert.equal(result.paymentOptions.every((option) => option.processingFeeRate === 0.04), true);
    assert.equal(result.paymentOptions.every((option) => option.stripePaymentLinkCreated === false), true);
    assert.equal(result.paymentOptions.every((option) => option.invoiceCreated === false), true);
    assert.equal(result.paymentOptions.every((option) => option.taxCalculated === false), true);
  });

  test("alternate package selection stores the governed lower package and prepares its payment options", () => {
    const result = buildMilestone6AuthorChoicePath(input({
      authorChoiceType: AUTHOR_CHOICE_TYPES.SELECT_ALTERNATE_PACKAGE
    }));

    assert.equal(result.ok, true);
    assert.equal(result.selectedPackage.code, PACKAGE_CODES.STARTER);
    assert.equal(result.payloads.opportunityPayload.jm1_m6authorselectedpackagecode, PACKAGE_CODES.STARTER);
    assert.equal(result.branch.paymentOptionPreparationStatus, STATUS.paymentOptionsPrepared);
    assert.equal(result.paymentOptions.length, 4);
    assert.equal(result.paymentOptions.some((option) => option.code === "TWELVE_PAYMENTS"), false);
  });

  test("meeting request keeps package selection pending and prepares internal follow-up", () => {
    const result = buildMilestone6AuthorChoicePath(input({
      authorChoiceType: AUTHOR_CHOICE_TYPES.REQUEST_MEETING
    }));

    assert.equal(result.ok, true);
    assert.equal(result.selectedPackage, null);
    assert.equal(result.branch.packageSelectionStatus, STATUS.packageSelectionPending);
    assert.equal(result.branch.paymentOptionPreparationStatus, STATUS.paymentOptionsPendingSelection);
    assert.equal(result.branch.meetingOrFollowUpStatus, STATUS.followUpMeetingRequested);
    assert.deepEqual(result.paymentOptions, []);
    assert.equal(result.internalNotification.prepared, true);
    assert.equal(result.internalNotification.to, INTERNAL_VISIBILITY_MAILBOX);
    assert.deepEqual(result.internalNotification.cc, []);
    assert.deepEqual(result.internalNotification.bcc, []);
  });

  test("payment-options request requires an explicit selected package", () => {
    const missingSelection = buildMilestone6AuthorChoicePath(input({
      authorChoiceType: AUTHOR_CHOICE_TYPES.REQUEST_PAYMENT_OPTIONS
    }));
    assert.equal(missingSelection.ok, false);
    assert.equal(missingSelection.reason, "PAYMENT_OPTIONS_REQUIRE_PACKAGE_SELECTION");

    const selected = buildMilestone6AuthorChoicePath(input({
      authorChoiceType: AUTHOR_CHOICE_TYPES.REQUEST_PAYMENT_OPTIONS,
      authorSelectedPackageCode: PACKAGE_CODES.SIGNATURE
    }));
    assert.equal(selected.ok, true);
    assert.equal(selected.selectedPackage.code, PACKAGE_CODES.SIGNATURE);
    assert.equal(selected.branch.paymentOptionPreparationStatus, STATUS.paymentOptionsPrepared);
    assert.equal(selected.paymentOptions.length, 5);
  });

  test("custom quote path blocks payment options and routes to human quote review", () => {
    const result = buildMilestone6AuthorChoicePath(input({
      authorChoiceType: AUTHOR_CHOICE_TYPES.CUSTOM_QUOTE_REQUIRED,
      childrenProject: true,
      authorProvidesArt: true,
      diagnosticPackage: {
        recommendedPackage: PACKAGE_CODES.CHILD
      }
    }));

    assert.equal(result.ok, true);
    assert.equal(result.branch.customQuoteReviewRequired, true);
    assert.equal(result.branch.paymentOptionPreparationStatus, STATUS.paymentOptionsBlockedHumanQuote);
    assert.equal(result.branch.agreementPreparationStatus, STATUS.agreementBlockedHumanQuote);
    assert.equal(result.branch.businessHandoffStatus, STATUS.businessHandoffHumanQuote);
    assert.deepEqual(result.paymentOptions, []);
    assert.equal(result.internalNotification.prepared, true);
    assert.equal(result.internalNotification.to, INTERNAL_VISIBILITY_MAILBOX);
  });

  test("decline or pause path marks hold and prepares no payment options", () => {
    const result = buildMilestone6AuthorChoicePath(input({
      authorChoiceType: AUTHOR_CHOICE_TYPES.DECLINE_OR_PAUSE
    }));

    assert.equal(result.ok, true);
    assert.equal(result.branch.packageSelectionStatus, STATUS.packageSelectionHold);
    assert.equal(result.branch.paymentOptionPreparationStatus, STATUS.paymentOptionsBlockedHold);
    assert.equal(result.branch.onboardingStatus, STATUS.onboardingHold);
    assert.equal(result.branch.businessHandoffStatus, STATUS.businessHandoffHold);
    assert.deepEqual(result.paymentOptions, []);
    assert.equal(result.internalNotification.prepared, true);
  });

  test("no-response path supports follow-up without payment or production action", () => {
    const result = buildMilestone6AuthorChoicePath(input({
      authorChoiceType: AUTHOR_CHOICE_TYPES.NO_RESPONSE
    }));

    assert.equal(result.ok, true);
    assert.equal(result.branch.packageSelectionStatus, STATUS.packageSelectionNoResponse);
    assert.equal(result.branch.meetingOrFollowUpStatus, STATUS.followUpNoResponse);
    assert.equal(result.branch.paymentOptionPreparationStatus, STATUS.paymentOptionsPendingSelection);
    assert.deepEqual(result.paymentOptions, []);
    assert.equal(result.internalNotification.prepared, true);
  });
});

describe("Milestone 6B payment option preparation", () => {
  test("payment option data includes 4% processing fee and safe Stripe mapping only", () => {
    const options = buildPaymentOptionData(PACKAGE_CODES.PROFESSIONAL);

    assert.equal(options.length, 5);
    assert.equal(options[0].selectedPackageCode, PACKAGE_CODES.PROFESSIONAL);
    assert.equal(options[0].stripeProductId, "prod_UjRnnUiTQgHlrm");
    assert.equal(options[0].stripePriceId, "price_1TjyuZJCiOVFpgYur0FWmcj7");
    assert.equal(options[0].processingFeeRate, 0.04);
    assert.equal(options[0].taxCalculated, false);
    assert.equal(options[0].stripePaymentLinkCreated, false);
    assert.equal(options[0].checkoutSessionCreated, false);
    assert.equal(options[0].invoiceCreated, false);
    assert.equal(options[0].customerCreated, false);
    assert.equal(options[0].chargeCreated, false);
  });
});

describe("Milestone 6B safety boundaries", () => {
  test("keeps forbidden live actions false across selected package path", () => {
    const result = buildMilestone6AuthorChoicePath(input({
      authorChoiceType: AUTHOR_CHOICE_TYPES.SELECT_SUGGESTED_PACKAGE
    }));

    assert.equal(result.liveActions.sendsAuthorEmail, false);
    assert.equal(result.liveActions.sendsInternalNotification, false);
    assert.equal(result.liveActions.createsPaymentLink, false);
    assert.equal(result.liveActions.createsCheckoutSession, false);
    assert.equal(result.liveActions.createsInvoice, false);
    assert.equal(result.liveActions.createsCustomer, false);
    assert.equal(result.liveActions.createsSubscription, false);
    assert.equal(result.liveActions.chargesCard, false);
    assert.equal(result.liveActions.sendsContract, false);
    assert.equal(result.liveActions.requestsPayment, false);
    assert.equal(result.liveActions.createsDuplicateOpportunity, false);
    assert.equal(result.liveActions.activatesFlowD, false);
    assert.equal(result.liveActions.startsProduction, false);
    assert.equal(result.liveActions.assignsIsbn, false);
    assert.equal(result.liveActions.usesQboForNewLogic, false);
    assert.equal(result.liveActions.calculatesTax, false);
  });

  test("rejects unsafe content without echoing it", () => {
    const result = buildMilestone6AuthorChoicePath(input({
      authorChoiceType: AUTHOR_CHOICE_TYPES.SELECT_SUGGESTED_PACKAGE,
      stripePaymentLink: "https://pay.example/secret",
      project: {
        title: "Project",
        manuscriptText: "UNSAFE MANUSCRIPT"
      }
    }));

    assert.equal(result.ok, false);
    assert.equal(result.reason, "UNSAFE_FIELD_PRESENT");
    assert.equal(JSON.stringify(result).includes("UNSAFE MANUSCRIPT"), false);
    assert.equal(JSON.stringify(result).includes("pay.example"), false);
  });
});
