"use strict";

const {
  PACKAGE_CATALOG,
  PACKAGE_CODES
} = require("./milestone6BusinessSourceLayer");
const {
  LEGACY_PAYMENT_POLICY_VERSION,
  NEW_FINANCING_POLICY_VERSION,
  DEFAULT_PAYMENT_POLICY_VERSION,
  PLAN_CONFIGS,
  allocateCents,
  buildPaymentPlans,
  calculateEarlyPayoff,
  formatUsd: formatPolicyUsd,
  resolvePaymentPolicyVersion
} = require("./paymentPolicyEngine");

const PRICING_RULE_VERSION = "JMP_AUTHOR_LOYALTY_REFERRAL_v1.0";
const PAYMENT_FEE_POLICY_VERSION = LEGACY_PAYMENT_POLICY_VERSION;
const MAX_COMBINED_BENEFIT_PERCENT = 50;
const REFERRAL_CREDIT_PERCENT = 10;

const PAYMENT_PLANS = PLAN_CONFIGS;

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function centsFromUsd(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

function usdFromCents(cents) {
  return Math.round(cents) / 100;
}

function formatUsd(amountUsd) {
  return formatPolicyUsd(amountUsd);
}

function resolvePackage(packageCode) {
  const normalized = normalizeString(packageCode).toUpperCase();
  const catalogEntry = PACKAGE_CATALOG[normalized];
  if (!catalogEntry) return null;
  return {
    packageCode: normalized,
    packageName: catalogEntry.name,
    basePackagePriceCents: centsFromUsd(catalogEntry.costUsd),
    basePackagePrice: catalogEntry.costUsd
  };
}

function returningAuthorPercent(priorEligibleTitleCount = 0) {
  const count = Math.max(0, Math.floor(Number(priorEligibleTitleCount) || 0));
  if (count >= 4) return 20;
  if (count >= 2) return 15;
  if (count === 1) return 10;
  return 0;
}

function clampPercent(value) {
  const number = Math.floor(Number(value) || 0);
  return Math.max(0, number);
}

function referralChoices({ returningPercent, referralCreditsAvailablePercent }) {
  const available = clampPercent(referralCreditsAvailablePercent);
  const maxUsable = Math.max(0, MAX_COMBINED_BENEFIT_PERCENT - clampPercent(returningPercent));
  const cappedAvailable = Math.min(available, maxUsable);
  const choices = [];
  for (let percent = 0; percent <= cappedAvailable; percent += REFERRAL_CREDIT_PERCENT) {
    choices.push(percent);
  }
  if (!choices.includes(cappedAvailable) && cappedAvailable > 0) choices.push(cappedAvailable);
  return choices;
}

function allocateInstallmentPrincipalCents(totalCents, paymentCount) {
  return allocateCents(totalCents, paymentCount);
}

function buildPaymentOptions(adjustedPrincipalCents, paymentPolicyVersion = DEFAULT_PAYMENT_POLICY_VERSION) {
  return buildPaymentPlans(adjustedPrincipalCents, paymentPolicyVersion);
}

function evaluateReferralLedger(events = []) {
  const earned = new Map();
  const applications = [];
  for (const event of Array.isArray(events) ? events : []) {
    const referralKey = normalizeString(event.creditId || event.sourceReferral || event.referralId);
    if (!referralKey) continue;
    const agreementExecuted = event.agreementExecuted === true;
    const initialPaymentReceived = event.initialPaymentReceived === true;
    if (agreementExecuted && initialPaymentReceived && !earned.has(referralKey)) {
      earned.set(referralKey, {
        creditId: normalizeString(event.creditId) || referralKey,
        sourceReferral: normalizeString(event.sourceReferral) || referralKey,
        referringAuthor: normalizeString(event.referringAuthor),
        referredAuthor: normalizeString(event.referredAuthor),
        joinedFamilyEvent: normalizeString(event.joinedFamilyEvent),
        earnedDate: normalizeString(event.earnedDate),
        creditPercent: REFERRAL_CREDIT_PERCENT,
        status: "AVAILABLE"
      });
    }
  }
  for (const event of Array.isArray(events) ? events : []) {
    const status = normalizeString(event.status).toUpperCase();
    if (!["SELECTED", "RESERVED", "APPLIED"].includes(status)) continue;
    const percent = clampPercent(event.appliedPercent || event.creditPercent || REFERRAL_CREDIT_PERCENT);
    applications.push({
      creditId: normalizeString(event.creditId || event.sourceReferral || event.referralId),
      appliedTitle: normalizeString(event.appliedTitle || event.titleId),
      status,
      percent
    });
  }
  const earnedPercent = earned.size * REFERRAL_CREDIT_PERCENT;
  const appliedPercent = applications
    .filter((event) => event.status === "APPLIED" || event.status === "RESERVED")
    .reduce((sum, event) => sum + event.percent, 0);
  return {
    earnedCredits: Array.from(earned.values()),
    earnedPercent,
    appliedOrReservedPercent: appliedPercent,
    availablePercent: Math.max(0, earnedPercent - appliedPercent),
    applications
  };
}

function calculateAuthorOffer(input = {}) {
  const errors = [];
  const packageCode = normalizeString(input.packageId || input.packageCode).toUpperCase();
  const packageInfo = resolvePackage(packageCode);
  if (!packageInfo) errors.push("PACKAGE_NOT_FOUND");

  const priorEligibleTitleCount = Math.max(0, Math.floor(Number(input.priorEligibleTitleCount) || 0));
  const returningPercent = returningAuthorPercent(priorEligibleTitleCount);
  const ledger = input.referralLedger
    ? evaluateReferralLedger(input.referralLedger)
    : null;
  const referralCreditsAvailablePercent = ledger
    ? ledger.availablePercent
    : clampPercent(input.referralCreditsAvailablePercent);
  const referralCreditsRequestedPercent = clampPercent(input.referralCreditsRequestedPercent);
  const maxReferralUsablePercent = Math.max(0, MAX_COMBINED_BENEFIT_PERCENT - returningPercent);
  const referralCreditsAppliedPercent = Math.min(
    referralCreditsAvailablePercent,
    referralCreditsRequestedPercent,
    maxReferralUsablePercent
  );
  const combinedBenefitPercent = returningPercent + referralCreditsAppliedPercent;
  const capApplied = referralCreditsRequestedPercent > referralCreditsAppliedPercent;
  const basePackagePriceCents = packageInfo?.basePackagePriceCents || 0;
  const reductionCents = Math.round(basePackagePriceCents * combinedBenefitPercent / 100);
  const adjustedPackagePrincipalCents = Math.max(0, basePackagePriceCents - reductionCents);
  const paymentPolicyVersion = resolvePaymentPolicyVersion(input.paymentPolicyVersion || input.paymentFeePolicyVersion);
  const paymentOptions = buildPaymentOptions(adjustedPackagePrincipalCents, paymentPolicyVersion);

  if (errors.length) {
    return { ok: false, errors, pricingRuleVersion: PRICING_RULE_VERSION };
  }

  return {
    ok: true,
    errors: [],
    authorId: normalizeString(input.authorId) || null,
    titleId: normalizeString(input.titleId) || null,
    packageCode: packageInfo.packageCode,
    packageName: packageInfo.packageName,
    basePackagePriceCents,
    basePackagePrice: usdFromCents(basePackagePriceCents),
    basePackagePriceFormatted: formatUsd(usdFromCents(basePackagePriceCents)),
    priorEligibleTitleCount,
    returningAuthorPercent: returningPercent,
    referralCreditsAvailablePercent,
    referralCreditsRequestedPercent,
    referralCreditsAppliedPercent,
    referralCreditsRemainingPercent: Math.max(0, referralCreditsAvailablePercent - referralCreditsAppliedPercent),
    referralCreditChoicesPercent: referralChoices({ returningPercent, referralCreditsAvailablePercent }),
    combinedBenefitPercent,
    capApplied,
    adjustedPackagePrincipalCents,
    adjustedPackagePrincipal: usdFromCents(adjustedPackagePrincipalCents),
    adjustedPackagePrincipalFormatted: formatUsd(usdFromCents(adjustedPackagePrincipalCents)),
    taxTreatment: "PENDING_EXTERNAL",
    pricingRuleVersion: normalizeString(input.pricingRuleVersion) || PRICING_RULE_VERSION,
    relationshipPricingRuleVersion: normalizeString(input.relationshipPricingRuleVersion) || PRICING_RULE_VERSION,
    paymentPolicyVersion,
    paymentFeePolicyVersion: paymentPolicyVersion,
    benefitCharacter: Object.freeze({
      cash: false,
      refundable: false,
      transferable: false,
      redeemableForCash: false,
      retroactive: false
    }),
    referralLedger: ledger,
    paymentOptions
  };
}

function buildPricingSnapshot(offer, selection = {}) {
  if (!offer?.ok) return { ok: false, errors: ["OFFER_REQUIRED"] };
  const planCode = normalizeString(selection.planCode).toUpperCase();
  const selectedPlan = offer.paymentOptions.find((plan) => plan.planCode === planCode);
  if (!selectedPlan) return { ok: false, errors: ["PAYMENT_PLAN_NOT_FOUND"] };
  return {
    ok: true,
    immutable: true,
    snapshotStatus: "PRICING_LOCKED",
    pricingRuleVersion: offer.pricingRuleVersion,
    relationshipPricingRuleVersion: offer.relationshipPricingRuleVersion || offer.pricingRuleVersion,
    paymentPolicyVersion: offer.paymentPolicyVersion || offer.paymentFeePolicyVersion,
    paymentFeePolicyVersion: offer.paymentFeePolicyVersion,
    authorId: offer.authorId,
    titleId: offer.titleId,
    packageCode: offer.packageCode,
    packageName: offer.packageName,
    basePackagePriceCents: offer.basePackagePriceCents,
    priorEligibleTitleCount: offer.priorEligibleTitleCount,
    returningAuthorPercent: offer.returningAuthorPercent,
    referralCreditsAvailablePercent: offer.referralCreditsAvailablePercent,
    referralCreditsSelectedPercent: offer.referralCreditsRequestedPercent,
    referralCreditsAppliedPercent: offer.referralCreditsAppliedPercent,
    referralCreditsRemainingPercent: offer.referralCreditsRemainingPercent,
    combinedBenefitPercent: offer.combinedBenefitPercent,
    capApplied: offer.capApplied,
    adjustedPackagePrincipalCents: offer.adjustedPackagePrincipalCents,
    paymentPlan: selectedPlan,
    taxTreatment: offer.taxTreatment,
    lockedAt: normalizeString(selection.lockedAt) || new Date().toISOString(),
    downstreamAuthority: Object.freeze([
      "Dynamics Opportunity",
      "Agreement / Title Addendum",
      "Stripe arrangement",
      "Author Workspace",
      "Publisher Operating Center",
      "Business Central when integrated"
    ])
  };
}

module.exports = {
  PRICING_RULE_VERSION,
  PAYMENT_FEE_POLICY_VERSION,
  LEGACY_PAYMENT_POLICY_VERSION,
  NEW_FINANCING_POLICY_VERSION,
  DEFAULT_PAYMENT_POLICY_VERSION,
  MAX_COMBINED_BENEFIT_PERCENT,
  REFERRAL_CREDIT_PERCENT,
  PAYMENT_PLANS,
  PACKAGE_CODES,
  calculateAuthorOffer,
  buildPaymentOptions,
  buildPricingSnapshot,
  calculateEarlyPayoff,
  evaluateReferralLedger,
  formatUsd,
  returningAuthorPercent,
  allocateInstallmentPrincipalCents,
  resolvePackage
};
