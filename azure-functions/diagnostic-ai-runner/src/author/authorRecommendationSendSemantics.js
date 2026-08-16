"use strict";

const LIFECYCLE_CONTEXT = Object.freeze({
  PROSPECT_INQUIRY: "PROSPECT_INQUIRY",
  ACTIVE_CONTRACTED_AUTHOR: "ACTIVE_CONTRACTED_AUTHOR"
});

const DECISION_TYPE = Object.freeze({
  PROSPECT_PACKAGE_SELECTION: "PROSPECT_PACKAGE_SELECTION",
  EDITORIAL_STAGE_APPROVAL: "EDITORIAL_STAGE_APPROVAL"
});

const WAITING_OWNER = Object.freeze({
  PROSPECT: "Prospect",
  AUTHOR: "Author"
});

function normalizeEnum(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function resolveLifecycleContext(input = {}) {
  const explicit = normalizeEnum(input.lifecycleContext || input.publishingLifecycleContext);
  if (explicit === LIFECYCLE_CONTEXT.ACTIVE_CONTRACTED_AUTHOR || explicit === "ACTIVE_AUTHOR" || explicit === "CONTRACTED_AUTHOR") {
    return LIFECYCLE_CONTEXT.ACTIVE_CONTRACTED_AUTHOR;
  }
  if (explicit === LIFECYCLE_CONTEXT.PROSPECT_INQUIRY || explicit === "PROSPECT_EDITORIAL_REVIEW" || explicit === "EDITORIAL_REVIEW") {
    return LIFECYCLE_CONTEXT.PROSPECT_INQUIRY;
  }

  const view = input.view || {};
  const project = view.project || {};
  const dataverse = view.dataverse || {};
  const commercialText = [
    input.agreementExecuted === true ? "AGREEMENT_EXECUTED" : "",
    input.agreementStatus,
    input.paymentStatus,
    input.onboardingStatus,
    input.businessStage,
    input.commercialStatus,
    project.lifecycleContext,
    project.businessStage,
    dataverse.lifecycleContext,
    dataverse.businessStage
  ].map(normalizeEnum).join(" ");

  if (
    /AGREEMENT_(EXECUTED|SIGNED)|CONTRACT_EXECUTED|FULFILLMENT_AUTHORIZED|PUBLISHING_AUTHORIZED/.test(commercialText) &&
    /PAYMENT_CONFIRMED|PAID|ONBOARDING_COMPLETE|ACTIVE_PROJECT|FULFILLMENT_AUTHORIZED|PUBLISHING_AUTHORIZED/.test(commercialText)
  ) {
    return LIFECYCLE_CONTEXT.ACTIVE_CONTRACTED_AUTHOR;
  }

  return LIFECYCLE_CONTEXT.PROSPECT_INQUIRY;
}

function resolveRecommendationSendSemantics(input = {}) {
  const lifecycleContext = resolveLifecycleContext(input);
  if (lifecycleContext === LIFECYCLE_CONTEXT.ACTIVE_CONTRACTED_AUTHOR) {
    return {
      lifecycleContext,
      waitingOwner: WAITING_OWNER.AUTHOR,
      decisionType: DECISION_TYPE.EDITORIAL_STAGE_APPROVAL,
      waitingState: "AWAITING_AUTHOR_RESPONSE",
      responseConsumer: "AUTHOR_REVIEW_RESPONSE_CONSUMER",
      responseClockDecisionType: DECISION_TYPE.EDITORIAL_STAGE_APPROVAL,
      workflowStatus: "Awaiting Author Response",
      approvalNotes:
        "Author-facing recommendation sent. LifecycleContext=ACTIVE_CONTRACTED_AUTHOR; WaitingOwner=Author; DecisionType=EDITORIAL_STAGE_APPROVAL; Workflow remains Awaiting Author Response."
    };
  }

  return {
    lifecycleContext: LIFECYCLE_CONTEXT.PROSPECT_INQUIRY,
    waitingOwner: WAITING_OWNER.PROSPECT,
    decisionType: DECISION_TYPE.PROSPECT_PACKAGE_SELECTION,
    waitingState: "WAITING_ON_PROSPECT_PACKAGE_SELECTION",
    responseConsumer: "PACKAGE_SELECTION_CONSUMER",
    responseClockDecisionType: DECISION_TYPE.PROSPECT_PACKAGE_SELECTION,
    workflowStatus: "Waiting On Prospect Package Selection",
    approvalNotes:
      "Prospect-facing recommendation sent. LifecycleContext=PROSPECT_INQUIRY; WaitingOwner=Prospect; DecisionType=PROSPECT_PACKAGE_SELECTION; Workflow remains Waiting On Prospect Package Selection or Questions."
  };
}

module.exports = {
  LIFECYCLE_CONTEXT,
  DECISION_TYPE,
  WAITING_OWNER,
  resolveLifecycleContext,
  resolveRecommendationSendSemantics
};
