"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveRecommendationSendSemantics
} = require("../src/author/authorRecommendationSendSemantics");

describe("author recommendation send semantics", () => {
  test("prospect sends wait on package selection and never on editorial stage approval", () => {
    const semantics = resolveRecommendationSendSemantics({ lifecycleContext: "PROSPECT_INQUIRY" });
    assert.equal(semantics.lifecycleContext, "PROSPECT_INQUIRY");
    assert.equal(semantics.waitingOwner, "Prospect");
    assert.equal(semantics.decisionType, "PROSPECT_PACKAGE_SELECTION");
    assert.equal(semantics.responseClockDecisionType, "PROSPECT_PACKAGE_SELECTION");
    assert.equal(semantics.responseConsumer, "PACKAGE_SELECTION_CONSUMER");
    assert.equal(/Awaiting Author Response/i.test(semantics.approvalNotes), false);
  });

  test("active contracted author sends retain stage approval semantics", () => {
    const semantics = resolveRecommendationSendSemantics({ lifecycleContext: "ACTIVE_CONTRACTED_AUTHOR" });
    assert.equal(semantics.lifecycleContext, "ACTIVE_CONTRACTED_AUTHOR");
    assert.equal(semantics.waitingOwner, "Author");
    assert.equal(semantics.decisionType, "EDITORIAL_STAGE_APPROVAL");
    assert.equal(semantics.responseClockDecisionType, "EDITORIAL_STAGE_APPROVAL");
    assert.equal(semantics.responseConsumer, "AUTHOR_REVIEW_RESPONSE_CONSUMER");
    assert.match(semantics.approvalNotes, /Awaiting Author Response/);
  });

  test("commercially active records infer active contracted author without using template name", () => {
    const semantics = resolveRecommendationSendSemantics({
      agreementStatus: "AGREEMENT_EXECUTED",
      paymentStatus: "PAYMENT_CONFIRMED"
    });
    assert.equal(semantics.lifecycleContext, "ACTIVE_CONTRACTED_AUTHOR");
    assert.equal(semantics.decisionType, "EDITORIAL_STAGE_APPROVAL");
  });
});
