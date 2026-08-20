"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  PACKAGE_CODES,
  calculateAuthorOffer,
  buildPricingSnapshot,
  evaluateReferralLedger,
  returningAuthorPercent,
  allocateInstallmentPrincipalCents
} = require("../src/author/authorOfferEngine");

function plan(offer, code) {
  return offer.paymentOptions.find((item) => item.planCode === code);
}

describe("returning author loyalty tiers", () => {
  test("derive automatic relationship benefit from prior eligible titles", () => {
    assert.equal(returningAuthorPercent(0), 0);
    assert.equal(returningAuthorPercent(1), 10);
    assert.equal(returningAuthorPercent(2), 15);
    assert.equal(returningAuthorPercent(3), 15);
    assert.equal(returningAuthorPercent(4), 20);
    assert.equal(returningAuthorPercent(10), 20);
  });
});

describe("referral credit ledger", () => {
  test("does not earn credits before agreement and initial payment both exist", () => {
    const ledger = evaluateReferralLedger([
      { sourceReferral: "submitted-only" },
      { sourceReferral: "agreement-only", agreementExecuted: true },
      { sourceReferral: "payment-only", initialPaymentReceived: true }
    ]);
    assert.equal(ledger.earnedPercent, 0);
    assert.equal(ledger.availablePercent, 0);
  });

  test("earns one 10 percent credit at Joined the Family and dedupes replay", () => {
    const ledger = evaluateReferralLedger([
      { sourceReferral: "ref-1", agreementExecuted: true, initialPaymentReceived: true, joinedFamilyEvent: "jtf-1" },
      { sourceReferral: "ref-1", agreementExecuted: true, initialPaymentReceived: true, joinedFamilyEvent: "jtf-1-replay" }
    ]);
    assert.equal(ledger.earnedPercent, 10);
    assert.equal(ledger.availablePercent, 10);
    assert.equal(ledger.earnedCredits.length, 1);
  });

  test("two successful referrals produce 20 percent banked and applied credits reduce availability", () => {
    const ledger = evaluateReferralLedger([
      { sourceReferral: "ref-1", agreementExecuted: true, initialPaymentReceived: true },
      { sourceReferral: "ref-2", agreementExecuted: true, initialPaymentReceived: true },
      { sourceReferral: "ref-1", status: "APPLIED", appliedPercent: 10, appliedTitle: "title-1" }
    ]);
    assert.equal(ledger.earnedPercent, 20);
    assert.equal(ledger.availablePercent, 10);
  });
});

describe("loyalty/referral stacking and 50 percent cap", () => {
  test("10 + 10 = 20", () => {
    const offer = calculateAuthorOffer({
      packageCode: PACKAGE_CODES.STARTER,
      priorEligibleTitleCount: 1,
      referralCreditsAvailablePercent: 10,
      referralCreditsRequestedPercent: 10
    });
    assert.equal(offer.combinedBenefitPercent, 20);
  });

  test("15 + 20 = 35 for Professional and produces exact adjusted principal", () => {
    const offer = calculateAuthorOffer({
      packageCode: PACKAGE_CODES.PROFESSIONAL,
      priorEligibleTitleCount: 2,
      referralCreditsAvailablePercent: 20,
      referralCreditsRequestedPercent: 20
    });
    assert.equal(offer.basePackagePrice, 4500);
    assert.equal(offer.returningAuthorPercent, 15);
    assert.equal(offer.referralCreditsAppliedPercent, 20);
    assert.equal(offer.combinedBenefitPercent, 35);
    assert.equal(offer.adjustedPackagePrincipal, 2925);
    assert.equal(offer.capApplied, false);
  });

  test("20 + 30 = 50", () => {
    const offer = calculateAuthorOffer({
      packageCode: PACKAGE_CODES.PREMIER,
      priorEligibleTitleCount: 4,
      referralCreditsAvailablePercent: 30,
      referralCreditsRequestedPercent: 30
    });
    assert.equal(offer.combinedBenefitPercent, 50);
    assert.equal(offer.adjustedPackagePrincipal, 3750);
  });

  test("20 + 40 request caps at 50 and preserves 10 percent", () => {
    const offer = calculateAuthorOffer({
      packageCode: PACKAGE_CODES.PREMIER,
      priorEligibleTitleCount: 4,
      referralCreditsAvailablePercent: 40,
      referralCreditsRequestedPercent: 40
    });
    assert.equal(offer.returningAuthorPercent, 20);
    assert.equal(offer.referralCreditsAppliedPercent, 30);
    assert.equal(offer.combinedBenefitPercent, 50);
    assert.equal(offer.adjustedPackagePrincipal, 3750);
    assert.equal(offer.referralCreditsRemainingPercent, 10);
    assert.equal(offer.capApplied, true);
    assert.deepEqual(offer.referralCreditChoicesPercent, [0, 10, 20, 30]);
  });
});

describe("payment-plan principal allocation and 4 percent fee rounding", () => {
  test("Starter 8-pay preserves known whole-cent allocation without hardcoding", () => {
    assert.deepEqual(allocateInstallmentPrincipalCents(199900, 8), [
      24988, 24988, 24988, 24988, 24988, 24988, 24988, 24984
    ]);
  });

  test("all package plans preserve principal exactly and Full Pay has no fee", () => {
    for (const packageCode of [PACKAGE_CODES.STARTER, PACKAGE_CODES.PROFESSIONAL, PACKAGE_CODES.PREMIER]) {
      const offer = calculateAuthorOffer({ packageCode });
      for (const option of offer.paymentOptions) {
        const principalSum = option.installments.reduce((sum, row) => sum + row.principalCents, 0);
        assert.equal(principalSum, offer.adjustedPackagePrincipalCents, `${packageCode} ${option.planCode}`);
      }
      assert.equal(plan(offer, "FULL_PAY").multiPayFeeTotalCents, 0);
    }
  });

  test("4 percent fee is rounded per installment, not calculated as one aggregate fee", () => {
    const offer = calculateAuthorOffer({ packageCode: PACKAGE_CODES.STARTER });
    const eightPay = plan(offer, "8_PAY");
    assert.equal(eightPay.installments[0].principal, 249.88);
    assert.equal(eightPay.installments[0].multiPayFee, 10.00);
    assert.equal(eightPay.installments[7].principal, 249.84);
    assert.equal(eightPay.installments[7].multiPayFee, 9.99);
    assert.equal(eightPay.multiPayFeeTotal, 79.99);
  });

  test("odd-cent adjusted principal keeps exact principal sum", () => {
    const option = calculateAuthorOffer({
      packageCode: PACKAGE_CODES.STARTER,
      priorEligibleTitleCount: 1,
      referralCreditsAvailablePercent: 10,
      referralCreditsRequestedPercent: 10
    });
    const fourPay = plan(option, "4_PAY");
    assert.equal(fourPay.installments.reduce((sum, row) => sum + row.principalCents, 0), option.adjustedPackagePrincipalCents);
  });
});

describe("pricing snapshots", () => {
  test("locked snapshot preserves the title offer even if later referral balance changes", () => {
    const offer = calculateAuthorOffer({
      authorId: "author-1",
      titleId: "title-1",
      packageCode: PACKAGE_CODES.PROFESSIONAL,
      priorEligibleTitleCount: 2,
      referralCreditsAvailablePercent: 20,
      referralCreditsRequestedPercent: 20
    });
    const snapshot = buildPricingSnapshot(offer, { planCode: "8_PAY", lockedAt: "2026-08-20T20:00:00Z" });
    const laterOffer = calculateAuthorOffer({
      authorId: "author-1",
      titleId: "title-2",
      packageCode: PACKAGE_CODES.PROFESSIONAL,
      priorEligibleTitleCount: 2,
      referralCreditsAvailablePercent: 40,
      referralCreditsRequestedPercent: 40
    });
    assert.equal(snapshot.ok, true);
    assert.equal(snapshot.immutable, true);
    assert.equal(snapshot.adjustedPackagePrincipalCents, 292500);
    assert.equal(snapshot.referralCreditsAppliedPercent, 20);
    assert.equal(laterOffer.referralCreditsAppliedPercent, 35);
  });
});

describe("package examples", () => {
  test("Starter new-author offer includes Full / 2 / 4 / 8 without discount", () => {
    const offer = calculateAuthorOffer({ packageCode: PACKAGE_CODES.STARTER });
    assert.equal(offer.adjustedPackagePrincipal, 1999);
    assert.deepEqual(offer.paymentOptions.map((item) => item.planCode), ["FULL_PAY", "2_PAY", "4_PAY", "8_PAY"]);
  });

  test("Professional stacking example returns $2,925 adjusted principal", () => {
    const offer = calculateAuthorOffer({
      packageCode: PACKAGE_CODES.PROFESSIONAL,
      priorEligibleTitleCount: 2,
      referralCreditsAvailablePercent: 20,
      referralCreditsRequestedPercent: 20
    });
    assert.equal(offer.adjustedPackagePrincipalFormatted, "$2,925.00");
    assert.equal(plan(offer, "2_PAY").installments[0].principalFormatted, "$1,462.50");
    assert.equal(plan(offer, "2_PAY").installments[0].multiPayFeeFormatted, "$58.50");
  });

  test("Premier cap example returns $3,750 adjusted principal", () => {
    const offer = calculateAuthorOffer({
      packageCode: PACKAGE_CODES.PREMIER,
      priorEligibleTitleCount: 4,
      referralCreditsAvailablePercent: 40,
      referralCreditsRequestedPercent: 40
    });
    assert.equal(offer.adjustedPackagePrincipalFormatted, "$3,750.00");
    assert.equal(plan(offer, "FULL_PAY").totalDueFormatted, "$3,750.00");
    assert.equal(plan(offer, "8_PAY").installments[0].principalFormatted, "$468.75");
    assert.equal(plan(offer, "8_PAY").installments[0].multiPayFeeFormatted, "$18.75");
  });
});
