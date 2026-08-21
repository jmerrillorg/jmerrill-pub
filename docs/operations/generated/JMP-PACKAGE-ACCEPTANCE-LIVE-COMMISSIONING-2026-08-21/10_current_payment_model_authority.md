# Current Payment Model Authority

Last verified: 2026-08-21T09:08:40Z

## Classification

`SUPERSEDED_BY_FOUNDER_OVERRIDE`

This file records the prior readback from the controlled commissioning pass. It is superseded for Quanishia Dockery / *Indomitable* by the 2026-08-21 founder override and the implementation evidence in `../JMP-FINANCING-MODEL-IMPLEMENTATION-2026-08-21/`.

## Evidence Sources

- PR #524 `JM1: Future payment model study`: open, not merged, study/evidence only, and expressly records no pricing changes, no contract changes, no Stripe writes, no Dataverse writes, and no author communications.
- Runtime source: `azure-functions/diagnostic-ai-runner/src/author/authorOfferEngine.js`.
- Business source layer: `azure-functions/diagnostic-ai-runner/src/author/milestone6BusinessSourceLayer.js`.
- Current canon/evidence: `docs/operations/generated/JMP-AUTHOR-OFFER-LOYALTY-PAYMENT-ENGINE-2026-08-20/` and `docs/operations/generated/JMP-PACKAGE-ACCEPTANCE-CONTROLLED-COMMISSIONING-2026-08-20/`.

## Authority Readback

| Field | Current Authority |
|---|---|
| Current new-contract model | Current implemented JMP multi-pay transaction-fee model |
| Effective version/date | `JMP_MULTIPAY_TRANSACTION_FEE_4_PERCENT_v1.0`; implemented in current Author Offer Engine evidence dated 2026-08-20 |
| Cash/base-price treatment | Package base principal from governed package catalog; full pay has no multi-pay fee |
| Full Pay | Principal only, plus applicable tax |
| 2-Pay | Principal split into two installments; 4% multi-pay transaction fee applied per installment; plus applicable tax |
| 4-Pay | Principal split into four installments; 4% multi-pay transaction fee applied per installment; plus applicable tax |
| 8-Pay | Principal split into eight installments; 4% multi-pay transaction fee applied per installment; plus applicable tax |
| Financing/plan charge | No implemented future finance/plan-charge model located; current governed term is multi-pay transaction fee |
| Early-payoff rule | No implemented early-payoff finance-charge rule located; future early-payoff model remains study-only |
| Tax treatment | `PENDING_EXTERNAL`; tax is not guessed in the offer preview |
| Agreement disclosure | Current agreement/payment generation consumes the existing 4% processing/multi-pay fee policy; no new finance/early-payoff disclosure is implemented |
| Offer Engine support | PASS for `JMP_AUTHOR_LOYALTY_REFERRAL_v1.0` plus `JMP_MULTIPAY_TRANSACTION_FEE_4_PERCENT_v1.0`; no current implementation of future financing model |
| Stripe support | Current package/product mapping exists; no Stripe implementation for future financing model located |
| Atta grandfathering | Atta remains under `LEGACY_CURRENT_CONTRACT - 4% PER MULTI-PAY TRANSACTION`; Atta mutations in this pass: 0 |
| Quanishia applicable model | `JMP_FINANCING_EARLY_PAYOFF_v1.0` after merge/deploy/validation under the founder override |

## Negative Proof

- Future financing model canonized as current policy: Superseded by later implementation evidence
- Future financing model implemented in Author Offer Engine: Superseded by later implementation evidence
- Future financing model implemented in Stripe/payment runtime: Superseded by later implementation evidence
- Future financing model applied to Quanishia: Pending merge/deploy/validation/send gate
- Atta mutation: 0
