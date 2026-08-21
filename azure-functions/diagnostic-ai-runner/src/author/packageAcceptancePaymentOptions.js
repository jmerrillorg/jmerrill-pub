"use strict";

const { createHash } = require("node:crypto");
const {
  PRICING_RULE_VERSION,
  calculateAuthorOffer,
  buildPricingSnapshot,
  formatUsd
} = require("./authorOfferEngine");
const { PACKAGE_CATALOG, PACKAGE_CODES } = require("./milestone6BusinessSourceLayer");
const { isolateLatestReplySegment } = require("../mail/publishingPackageReplyClassifier");

const EVENT_TYPES = Object.freeze({
  PACKAGE_ACCEPTED: "PACKAGE_ACCEPTED",
  OFFER_PREVIEW_GENERATED: "OFFER_PREVIEW_GENERATED",
  RESPONSE_PREVIEW: "RESPONSE_PREVIEW",
  PRICING_LOCKED: "PRICING_LOCKED"
});

const PRICING_STATES = Object.freeze({
  OFFER_PREVIEW: "OFFER_PREVIEW",
  REFERRAL_SELECTION_PENDING: "REFERRAL_SELECTION_PENDING",
  PAYMENT_OPTION_SELECTION_PENDING: "PAYMENT_OPTION_SELECTION_PENDING",
  PAYMENT_OPTION_SELECTED: "PAYMENT_OPTION_SELECTED",
  PRICING_LOCKED: "PRICING_LOCKED"
});

const ACCEPTANCE_OUTCOME = Object.freeze({
  ACCEPTED: "ACCEPTED",
  CLARIFICATION_REQUIRED: "CLARIFICATION_REQUIRED",
  NO_ACCEPTANCE: "NO_ACCEPTANCE",
  DUPLICATE: "DUPLICATE"
});

const PLAN_LABELS = Object.freeze({
  FULL_PAY: "Full Pay",
  "2_PAY": "2-Pay",
  "4_PAY": "4-Pay",
  "8_PAY": "8-Pay"
});

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePackageCode(value) {
  const normalized = normalizeString(value).toUpperCase();
  return PACKAGE_CATALOG[normalized] ? normalized : "";
}

function uniquePackageCodes(values = []) {
  return [...new Set(values.map(normalizePackageCode).filter(Boolean))];
}

function stablePackageAcceptanceId(input = {}) {
  const digest = createHash("sha256")
    .update([
      normalizeString(input.diagnosticId || input.titleId || input.projectId),
      normalizeString(input.inboundMessageId || input.supportingEventId),
      normalizeString(input.selectedPackageCode)
    ].join(":"))
    .digest("hex")
    .slice(0, 24);
  return `package-accepted:${digest}`;
}

function mentionedPackages(text) {
  const latest = isolateLatestReplySegment(text).toLowerCase();
  const result = [];
  if (/\bstarter(\s+publishing\s+package|\s+package)?\b/.test(latest)) result.push(PACKAGE_CODES.STARTER);
  if (/\bprofessional(\s+publishing\s+package|\s+package)?\b|\bpro\s+package\b/.test(latest)) result.push(PACKAGE_CODES.PROFESSIONAL);
  if (/\bpremier(\s+publishing\s+package|\s+package)?\b/.test(latest)) result.push(PACKAGE_CODES.PREMIER);
  return uniquePackageCodes(result);
}

function hasUnambiguousPositiveAcceptance(text) {
  const latest = isolateLatestReplySegment(text).toLowerCase();
  if (!latest) return false;
  if (/\b(tell me more|interested|sounds good|looks good|maybe|question|call|meeting|discuss)\b/.test(latest)) return false;
  return /\b(i\s+choose|choose|select|accept|accepted|move forward|proceed|go ahead|yes|let'?s do it|ready to start|want to proceed)\b/.test(latest);
}

function classifyPackageAcceptance(input = {}) {
  const existing = Array.isArray(input.existingAcceptanceEvents) ? input.existingAcceptanceEvents : [];
  if (existing.length > 0) {
    return { outcome: ACCEPTANCE_OUTCOME.DUPLICATE, selectedPackageCode: null, reason: "DUPLICATE_PACKAGE_ACCEPTANCE" };
  }

  const explicitMentions = mentionedPackages(input.replyText || "");
  if (explicitMentions.length === 1 && hasUnambiguousPositiveAcceptance(input.replyText || "")) {
    return { outcome: ACCEPTANCE_OUTCOME.ACCEPTED, selectedPackageCode: explicitMentions[0], reason: "EXPLICIT_PACKAGE_ACCEPTANCE" };
  }
  if (explicitMentions.length > 1) {
    return { outcome: ACCEPTANCE_OUTCOME.CLARIFICATION_REQUIRED, selectedPackageCode: null, reason: "MULTIPLE_PACKAGES_MENTIONED" };
  }

  const presented = uniquePackageCodes(input.presentedPackageCodes);
  const primary = normalizePackageCode(input.primaryPackageCode || input.recommendedPackageCode);
  const alternate = normalizePackageCode(input.alternatePackageCode);
  const effectivePresented = presented.length ? presented : uniquePackageCodes([primary, alternate]);
  const soleStarter = primary === PACKAGE_CODES.STARTER && !alternate;

  if (hasUnambiguousPositiveAcceptance(input.replyText || "")) {
    if (effectivePresented.length === 1) {
      return { outcome: ACCEPTANCE_OUTCOME.ACCEPTED, selectedPackageCode: effectivePresented[0], reason: soleStarter ? "SOLE_STARTER_RECOMMENDATION_ACCEPTED" : "SOLE_PRESENTED_PACKAGE_ACCEPTED" };
    }
    return { outcome: ACCEPTANCE_OUTCOME.CLARIFICATION_REQUIRED, selectedPackageCode: null, reason: "AMBIGUOUS_YES_WITH_MULTIPLE_PACKAGES" };
  }

  return { outcome: ACCEPTANCE_OUTCOME.NO_ACCEPTANCE, selectedPackageCode: null, reason: "NO_PACKAGE_ACCEPTANCE" };
}

function buildPackageAcceptedEvent(input = {}) {
  const selectedPackageCode = normalizePackageCode(input.selectedPackageCode);
  const selectedPackage = selectedPackageCode ? PACKAGE_CATALOG[selectedPackageCode] : null;
  const idempotencyKey = normalizeString(input.idempotencyKey) || stablePackageAcceptanceId({ ...input, selectedPackageCode });
  return Object.freeze({
    eventType: EVENT_TYPES.PACKAGE_ACCEPTED,
    idempotencyKey,
    authorId: normalizeString(input.authorId) || null,
    authorName: normalizeString(input.authorName) || null,
    titleId: normalizeString(input.titleId || input.projectId || input.diagnosticId) || null,
    title: normalizeString(input.title) || null,
    intakeReferenceCode: normalizeString(input.intakeReferenceCode) || null,
    selectedPackageCode,
    selectedPackageName: selectedPackage?.name || null,
    decisionSource: normalizeString(input.decisionSource) || "publishing@jmerrill.one",
    decisionChannel: normalizeString(input.decisionChannel) || "MICROSOFT_365_OUTLOOK",
    decisionTimestamp: normalizeString(input.decisionTimestamp) || new Date().toISOString(),
    supportingCommunicationId: normalizeString(input.supportingCommunicationId || input.inboundMessageId) || null,
    recommendationContext: input.recommendationContext || null
  });
}

function buildOfferPreview(input = {}) {
  const packageAcceptedEvent = input.packageAcceptedEvent || buildPackageAcceptedEvent(input);
  const referralCreditsAvailablePercent = Math.max(0, Math.floor(Number(input.referralCreditsAvailablePercent) || 0));
  const referralSelectionProvided = input.referralCreditsSelectedPercent != null;
  const referralCreditsRequestedPercent = referralSelectionProvided
    ? Math.max(0, Math.floor(Number(input.referralCreditsSelectedPercent) || 0))
    : 0;
  const offer = calculateAuthorOffer({
    authorId: packageAcceptedEvent.authorId,
    titleId: packageAcceptedEvent.titleId,
    packageCode: packageAcceptedEvent.selectedPackageCode,
    priorEligibleTitleCount: input.priorEligibleTitleCount,
    referralLedger: input.referralLedger,
    referralCreditsAvailablePercent,
    referralCreditsRequestedPercent,
    pricingRuleVersion: input.pricingRuleVersion || PRICING_RULE_VERSION,
    paymentPolicyVersion: input.paymentPolicyVersion
  });
  if (!offer.ok) return { ok: false, errors: offer.errors, packageAcceptedEvent };

  const referralSelectionRequired = referralCreditsAvailablePercent > 0 && !referralSelectionProvided;
  return Object.freeze({
    ok: true,
    eventType: EVENT_TYPES.OFFER_PREVIEW_GENERATED,
    pricingState: referralSelectionRequired ? PRICING_STATES.REFERRAL_SELECTION_PENDING : PRICING_STATES.PAYMENT_OPTION_SELECTION_PENDING,
    packageAcceptedEvent,
    offer,
    referralSelectionRequired,
    referralLifecycle: Object.freeze({
      available: "AVAILABLE",
      selected: referralSelectionRequired ? "NOT_SELECTED" : "SELECTED",
      reserved: "NOT_RESERVED_IN_PREVIEW",
      applied: "NOT_APPLIED_UNTIL_BINDING_POINT",
      goodStanding: "GOOD_STANDING_DEFINITION_PENDING"
    }),
    liveActions: Object.freeze({
      sendsAuthorEmail: false,
      mutatesReferralBalance: false,
      createsStripePaymentLink: false,
      regeneratesAgreement: false,
        triggersJoinedTheFamily: false,
        calculatesPaymentPolicyInRenderer: false
      })
  });
}

function renderPaymentOptionsResponsePreview(preview) {
  if (!preview?.ok) return { ok: false, errors: ["OFFER_PREVIEW_REQUIRED"] };
  const { offer } = preview;
  const lines = [];
  lines.push(`Package accepted: ${offer.packageName}`);
  lines.push(`Package principal: ${offer.basePackagePriceFormatted}`);
  if (offer.returningAuthorPercent > 0) {
    lines.push(`Returning Author Benefit applied: ${offer.returningAuthorPercent}%`);
  }
  if (preview.referralSelectionRequired) {
    lines.push(`Referral credits available: ${offer.referralCreditsAvailablePercent}%`);
    lines.push(`Maximum selectable now: ${Math.max(...offer.referralCreditChoicesPercent)}%`);
    lines.push(`Available choices: ${offer.referralCreditChoicesPercent.join("% / ")}%`);
    lines.push("Please choose how much referral credit you want to apply before payment options are locked.");
  } else {
    if (offer.referralCreditsAppliedPercent > 0) {
      lines.push(`Referral credits selected: ${offer.referralCreditsAppliedPercent}%`);
    }
    lines.push(`Adjusted package principal: ${offer.adjustedPackagePrincipalFormatted}`);
    lines.push("Payment options:");
    for (const plan of offer.paymentOptions) {
      const charge = plan.planChargeTotalFormatted || plan.multiPayFeeTotalFormatted;
      const chargeLabel = plan.authorFacingChargeLabel || "payment-plan charge";
      lines.push(`${PLAN_LABELS[plan.planCode]}: ${plan.totalDueFormatted} total (${plan.principalTotalFormatted} principal; ${charge} ${chargeLabel.toLowerCase()}), plus applicable tax.`);
    }
    const financed = offer.paymentOptions.find((plan) => plan.earlyPayoff?.available);
    if (financed?.earlyPayoff) {
      lines.push("Early payoff: no early-payoff penalty; unearned future payment-plan charges are not collected after payoff.");
    }
  }
  lines.push("Tax remains calculated externally. This preview is not a payment link and has not been sent automatically.");

  return Object.freeze({
    ok: true,
    eventType: EVENT_TYPES.RESPONSE_PREVIEW,
    pricingState: preview.pricingState,
    microsoftFirstMailbox: "publishing@jmerrill.one",
    rendererAuthority: "FORMAT_ONLY_CONSUMES_AUTHOR_OFFER_ENGINE_OUTPUT",
    subject: `Payment options for ${offer.packageName}`,
    textBody: lines.join("\n"),
    amountSource: "AUTHOR_OFFER_ENGINE",
    liveAutoSendEnabled: false,
    negativeProof: Object.freeze({
      rendererRecalculatesOffer: 0,
      liveAutoSendBeforeCommissioning: 0
    })
  });
}

function lockPricingSnapshotFromPreview(preview, selection = {}) {
  if (selection.existingSnapshot?.snapshotStatus === PRICING_STATES.PRICING_LOCKED) {
    return { ok: true, idempotent: true, snapshot: selection.existingSnapshot };
  }
  const snapshot = buildPricingSnapshot(preview?.offer, {
    planCode: selection.planCode,
    lockedAt: selection.lockedAt
  });
  if (!snapshot.ok) return snapshot;
  return {
    ok: true,
    idempotent: false,
    snapshot: Object.freeze({
      ...snapshot,
      snapshotStatus: PRICING_STATES.PRICING_LOCKED,
      eventType: EVENT_TYPES.PRICING_LOCKED
    })
  };
}

function buildOpportunityStatusProjection(input = {}) {
  const state = normalizeString(input.pricingState).toUpperCase();
  return {
    jm1_m6packageselectionstatus: "PACKAGE_SELECTED",
    jm1_m6paymentoptionpreparationstatus: state === PRICING_STATES.REFERRAL_SELECTION_PENDING
      ? "REFERRAL_SELECTION_PENDING"
      : "OFFER_PREVIEW_GENERATED",
    jm1_m6paymentoptionselectionstatus: state === PRICING_STATES.PRICING_LOCKED
      ? "PAYMENT_OPTION_SELECTED"
      : "PAYMENT_OPTION_SELECTION_PENDING",
    jm1_pricingstate: state || PRICING_STATES.OFFER_PREVIEW
  };
}

function buildExistingAuthorPreview(input = {}) {
  const priorEligibleTitleCount = Math.max(0, Math.floor(Number(input.priorEligibleTitleCount) || 0));
  return {
    authorId: normalizeString(input.authorId) || null,
    priorEligibleTitleCount,
    derivedLoyaltyPercent: calculateAuthorOffer({
      packageCode: normalizePackageCode(input.packageCode) || PACKAGE_CODES.STARTER,
      priorEligibleTitleCount
    }).returningAuthorPercent,
    referralCreditsAvailablePercent: Math.max(0, Math.floor(Number(input.referralCreditsAvailablePercent) || 0)),
    missingReferralAttribution: input.referralCreditsAvailablePercent == null ? "UNKNOWN" : "NO",
    retroactiveContractChanges: 0
  };
}

module.exports = {
  EVENT_TYPES,
  PRICING_STATES,
  ACCEPTANCE_OUTCOME,
  classifyPackageAcceptance,
  buildPackageAcceptedEvent,
  buildOfferPreview,
  renderPaymentOptionsResponsePreview,
  lockPricingSnapshotFromPreview,
  buildOpportunityStatusProjection,
  buildExistingAuthorPreview,
  stablePackageAcceptanceId,
  normalizePackageCode,
  formatUsd
};
