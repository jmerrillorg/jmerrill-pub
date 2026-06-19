"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  PACKAGE_CODES,
  PACKAGE_CATALOG,
  STRIPE_PACKAGE_MAPPINGS,
  PACKAGE_RECOMMENDATION_SOURCE,
  OPPORTUNITY_SOURCE,
  MILESTONE6_DATAVERSE_TARGETS,
  PROCESSING_FEE_RATE,
  STAGE_1_BOUNDARY,
  BILLING_SOURCE_POLICY,
  BLOCKING_STATUSES,
  resolveAlternativePackage,
  resolveRecommendedPackage,
  buildPaymentOptionPreview,
  buildMilestone6BusinessSourceReadiness
} = require("../src/author/milestone6BusinessSourceLayer");

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
  }
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

describe("Milestone 6 package catalog and recommendation rules", () => {
  test("catalog contains only governed core package codes and costs", () => {
    assert.deepEqual(Object.keys(PACKAGE_CATALOG).sort(), [
      "JMP-PKG-CHILD",
      "JMP-PKG-PRO",
      "JMP-PKG-SIGNATURE",
      "JMP-PKG-STARTER"
    ]);
    assert.equal(PACKAGE_CATALOG[PACKAGE_CODES.STARTER].costUsd, 1999);
    assert.equal(PACKAGE_CATALOG[PACKAGE_CODES.PROFESSIONAL].costUsd, 4500);
    assert.equal(PACKAGE_CATALOG[PACKAGE_CODES.SIGNATURE].costUsd, 7500);
    assert.equal(PACKAGE_CATALOG[PACKAGE_CODES.CHILD].costUsd, 2495);
  });

  test("Stripe package mappings contain governed live one-time USD Products and Prices", () => {
    assert.deepEqual(Object.keys(STRIPE_PACKAGE_MAPPINGS).sort(), Object.keys(PACKAGE_CATALOG).sort());

    assert.equal(STRIPE_PACKAGE_MAPPINGS[PACKAGE_CODES.STARTER].productId, "prod_URbgo7mwC7qr6t");
    assert.equal(STRIPE_PACKAGE_MAPPINGS[PACKAGE_CODES.STARTER].priceId, "price_1TSiTaJCiOVFpgYufee7GLQs");
    assert.equal(STRIPE_PACKAGE_MAPPINGS[PACKAGE_CODES.PROFESSIONAL].productId, "prod_UjRnnUiTQgHlrm");
    assert.equal(STRIPE_PACKAGE_MAPPINGS[PACKAGE_CODES.PROFESSIONAL].priceId, "price_1TjyuZJCiOVFpgYur0FWmcj7");
    assert.equal(STRIPE_PACKAGE_MAPPINGS[PACKAGE_CODES.SIGNATURE].productId, "prod_UjRnIBF5yKgkFr");
    assert.equal(STRIPE_PACKAGE_MAPPINGS[PACKAGE_CODES.SIGNATURE].priceId, "price_1TjyuaJCiOVFpgYu8FKjWqIL");
    assert.equal(STRIPE_PACKAGE_MAPPINGS[PACKAGE_CODES.CHILD].productId, "prod_UjRnLS7vXkbdEh");
    assert.equal(STRIPE_PACKAGE_MAPPINGS[PACKAGE_CODES.CHILD].priceId, "price_1TjyuaJCiOVFpgYuGJo5Ocwl");

    Object.values(STRIPE_PACKAGE_MAPPINGS).forEach((mapping) => {
      assert.equal(mapping.currency, "usd");
      assert.equal(mapping.priceType, "one_time");
      assert.equal(mapping.livemode, true);
    });
  });

  test("alternative package follows governed rules", () => {
    assert.equal(resolveAlternativePackage(PACKAGE_CODES.STARTER), null);
    assert.equal(resolveAlternativePackage(PACKAGE_CODES.PROFESSIONAL), PACKAGE_CODES.STARTER);
    assert.equal(resolveAlternativePackage(PACKAGE_CODES.SIGNATURE), PACKAGE_CODES.PROFESSIONAL);
    assert.equal(resolveAlternativePackage(PACKAGE_CODES.CHILD), null);
  });

  test("package override wins over recommendation from Editorial Diagnostic", () => {
    const result = resolveRecommendedPackage({
      diagnosticPackage: {
        recommendedPackage: PACKAGE_CODES.STARTER,
        packageOverride: PACKAGE_CODES.SIGNATURE
      }
    });

    assert.equal(result.ok, true);
    assert.equal(result.packageCode, PACKAGE_CODES.SIGNATURE);
    assert.equal(result.source, PACKAGE_RECOMMENDATION_SOURCE.packageOverrideField);
  });

  test("children's project uses child package only when author supplies art", () => {
    const withArt = resolveRecommendedPackage({ childrenProject: true, authorProvidesArt: true });
    assert.equal(withArt.ok, true);
    assert.equal(withArt.packageCode, PACKAGE_CODES.CHILD);

    const needsIllustration = resolveRecommendedPackage({ childrenProject: true, authorProvidesArt: false });
    assert.equal(needsIllustration.ok, false);
    assert.equal(needsIllustration.reason, "CHILDRENS_PROJECT_NEEDS_HUMAN_ILLUSTRATION_QUOTE");
    assert.equal(needsIllustration.humanQuoteRequired, true);
  });
});

describe("Milestone 6 business source readiness", () => {
  test("builds governed readiness with existing Opportunity update behavior", () => {
    const result = buildMilestone6BusinessSourceReadiness(input());

    assert.equal(result.ok, true);
    assert.equal(result.readiness.packageRecommendationSource.tableLogicalName, "jm1pub_editorialdiagnostic");
    assert.equal(result.readiness.packageRecommendationSource.recommendedPackageField, "jm1pub_recommendedpackage");
    assert.equal(result.readiness.packageRecommendationSource.packageOverrideField, "jm1pub_packageoverride");
    assert.equal(result.readiness.opportunitySource.entitySet, "opportunities");
    assert.equal(result.readiness.opportunityId, baseInput.opportunity.opportunityId);
    assert.equal(result.readiness.opportunityUpdateBehavior, "UPDATE_EXISTING_ACTIVE_OPPORTUNITY_ONLY");
    assert.equal(result.readiness.liveActions.createsDuplicateOpportunity, false);
    assert.equal(result.readiness.primaryPackage.code, PACKAGE_CODES.PROFESSIONAL);
    assert.equal(result.readiness.alternatePackage.code, PACKAGE_CODES.STARTER);
  });

  test("Stage 1 boundary excludes payment mechanics, tax, Stripe links, and pressure", () => {
    const result = buildMilestone6BusinessSourceReadiness(input());

    assert.equal(result.readiness.stage1Boundary, STAGE_1_BOUNDARY);
    assert.equal(result.readiness.stage1Boundary.includesEditorialReview, true);
    assert.equal(result.readiness.stage1Boundary.includesPackageRecommendation, true);
    assert.equal(result.readiness.stage1Boundary.includesPaymentPlans, false);
    assert.equal(result.readiness.stage1Boundary.includesProcessingFees, false);
    assert.equal(result.readiness.stage1Boundary.includesTaxCalculations, false);
    assert.equal(result.readiness.stage1Boundary.includesStripeLinks, false);
    assert.equal(result.readiness.stage1Boundary.includesInvoiceMechanics, false);
    assert.equal(result.readiness.stage1Boundary.includesContractPressure, false);
  });

  test("payment options are blocked until author package selection", () => {
    const result = buildMilestone6BusinessSourceReadiness(input());

    assert.equal(result.readiness.packageSelectionStatus, "PACKAGE_SELECTION_PENDING");
    assert.equal(result.readiness.paymentOptionsPreparationStatus, "PAYMENT_OPTIONS_BLOCKED_UNTIL_PACKAGE_SELECTION");
    assert.deepEqual(result.readiness.paymentOptionsPreview, []);
    assert.equal(result.readiness.blockers.includes(BLOCKING_STATUSES.packageSelectionMissing), true);
  });

  test("after package selection, payment options are preparable with governed Stripe mapping confirmed", () => {
    const result = buildMilestone6BusinessSourceReadiness(input({
      authorSelectedPackageCode: PACKAGE_CODES.PROFESSIONAL
    }));

    assert.equal(result.readiness.packageSelectionStatus, "PACKAGE_SELECTED");
    assert.equal(result.readiness.paymentOptionsPreparationStatus, "PAYMENT_OPTIONS_PREPARABLE_AFTER_MAPPING");
    assert.equal(result.readiness.stripeProductMappingStatus, "STRIPE_MAPPING_CONFIRMED");
    assert.equal(result.readiness.stripePriceMappingStatus, "STRIPE_MAPPING_CONFIRMED");
    assert.equal(result.readiness.blockers.includes(BLOCKING_STATUSES.stripeMappingMissing), false);
    assert.equal(result.readiness.paymentOptionsPreview.length, 5);
    assert.equal(result.readiness.paymentOptionsPreview.every((option) => option.processingFeeRate === PROCESSING_FEE_RATE), true);
    assert.equal(result.readiness.paymentOptionsPreview.every((option) => option.stripeLinkCreated === false), true);
    assert.equal(result.readiness.paymentOptionsPreview.every((option) => option.invoiceCreated === false), true);
    assert.equal(result.readiness.paymentOptionsPreview.every((option) => option.taxCalculated === false), true);
  });

  test("Stripe product and price mapping can be confirmed without creating links", () => {
    const result = buildMilestone6BusinessSourceReadiness(input({
      authorSelectedPackageCode: PACKAGE_CODES.STARTER,
      stripeMappings: {
        [PACKAGE_CODES.STARTER]: {
          productId: "prod_test_starter",
          priceId: "price_test_starter_single",
          currency: "usd",
          priceType: "one_time",
          livemode: true
        }
      }
    }));

    assert.equal(result.readiness.stripeMappingStatus, "STRIPE_MAPPING_CONFIRMED");
    assert.equal(result.readiness.paymentOptionsPreview.length, 4);
    assert.equal(result.readiness.liveActions.createsStripePaymentLink, false);
    assert.equal(result.readiness.liveActions.sendsInvoice, false);
    assert.equal(result.readiness.liveActions.requestsPayment, false);
  });

  test("QBO is retired and tax is pending governed Stripe/BC/SE configuration", () => {
    const result = buildMilestone6BusinessSourceReadiness(input());

    assert.equal(result.readiness.billingSourcePolicy, BILLING_SOURCE_POLICY);
    assert.equal(result.readiness.billingSourcePolicy.paymentExecution, "Stripe");
    assert.equal(result.readiness.billingSourcePolicy.qboStatus, "RETIRED_LEGACY");
    assert.equal(result.readiness.billingSourcePolicy.qboAllowedForNewLogic, false);
    assert.equal(result.readiness.taxHandlingStatus, "TAX_PENDING_ONBOARDING_ADDRESS_AND_GOVERNED_STRIPE_BC_SE_CONFIGURATION");
    assert.equal(result.readiness.liveActions.usesQboForNewLogic, false);
  });

  test("Dataverse targets include confirmed Milestone 6 schema fields", () => {
    const result = buildMilestone6BusinessSourceReadiness(input());

    assert.equal(result.readiness.dataverseTargets.confirmed.packageRecommendation.recommendedPackageField, "jm1pub_recommendedpackage");
    assert.equal(result.readiness.dataverseTargets.confirmed.packageOverride.field, "jm1pub_packageoverride");
    assert.equal(result.readiness.dataverseTargets.confirmed.opportunity.fields.packageRecommended, "jm1pub_packagerecommended");
    assert.equal(MILESTONE6_DATAVERSE_TARGETS.authorSelectedPackage.status, "CONFIRMED_CREATED");
    assert.equal(MILESTONE6_DATAVERSE_TARGETS.authorSelectedPackage.logicalName, "jm1_m6authorselectedpackagecode");
    assert.equal(MILESTONE6_DATAVERSE_TARGETS.stripeProductMappingStatus.status, "CONFIRMED_CREATED");
    assert.equal(MILESTONE6_DATAVERSE_TARGETS.paymentOptionPreparationStatus.status, "CONFIRMED_CREATED");
    assert.equal(result.readiness.blockers.includes("MILESTONE_6_DATAVERSE_FIELDS_REQUIRE_SCHEMA_CONFIRMATION"), false);
  });
});

describe("Milestone 6 fail-closed safety", () => {
  test("requires an existing active Opportunity", () => {
    const missing = buildMilestone6BusinessSourceReadiness(input({ opportunity: { opportunityId: "" } }));
    assert.equal(missing.ok, false);
    assert.equal(missing.reason, "EXISTING_OPPORTUNITY_REQUIRED");

    const inactive = buildMilestone6BusinessSourceReadiness(input({ opportunity: { active: false } }));
    assert.equal(inactive.ok, false);
    assert.equal(inactive.reason, "ACTIVE_OPPORTUNITY_REQUIRED");
  });

  test("rejects unsafe downstream and secret fields without echoing content", () => {
    const result = buildMilestone6BusinessSourceReadiness(input({
      stripeCheckoutUrl: "https://checkout.stripe.example/secret",
      project: {
        title: "Project",
        manuscriptText: "SECRET MANUSCRIPT"
      }
    }));

    assert.equal(result.ok, false);
    assert.equal(result.reason, "UNSAFE_FIELD_PRESENT");
    assert.equal(JSON.stringify(result).includes("SECRET MANUSCRIPT"), false);
    assert.equal(JSON.stringify(result).includes("checkout"), false);
  });

  test("module exports no send, invoice, contract, production, Flow D, or QBO live action", () => {
    const layer = require("../src/author/milestone6BusinessSourceLayer");
    const exportedNames = Object.keys(layer).join(" ").toLowerCase();

    assert.equal(exportedNames.includes("sendemail"), false);
    assert.equal(exportedNames.includes("checkout"), false);
    assert.equal(exportedNames.includes("invoice"), false);
    assert.equal(exportedNames.includes("contractsend"), false);
    assert.equal(exportedNames.includes("startproduction"), false);
    assert.equal(exportedNames.includes("flowd"), false);
    assert.equal(exportedNames.includes("qbo"), false);
  });

  test("confirmed source constants point to governed Dataverse tables", () => {
    assert.equal(PACKAGE_RECOMMENDATION_SOURCE.entitySet, "jm1pub_editorialdiagnostics");
    assert.equal(OPPORTUNITY_SOURCE.entitySet, "opportunities");
    assert.equal(OPPORTUNITY_SOURCE.duplicateRule, "UPDATE_EXISTING_ACTIVE_OPPORTUNITY");
  });
});
