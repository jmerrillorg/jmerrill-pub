# JM1 Future Payment Model Study v1.0

Date: 2026-08-20
Prepared for: Jackie Smith, Jr.
Classification: STUDY / EVIDENCE ONLY

## Executive Recommendation

Keep the current 4 percent per-transaction multi-pay structure for all existing executed Publishing contracts and active author arrangements. Do not retrofit existing agreements.

For future Publishing contracts, move toward a clearer model: cash package price plus either a disclosed plan charge for longer payment plans or a no-charge short installment option. The preferred future direction is:

- Full Pay: cash price only.
- 2-Pay: either no finance charge or a plainly disclosed low plan charge.
- 4-Pay and 8-Pay: replace the transaction-fee framing with a defined finance/plan charge that supports early payoff without penalty and does not collect unearned future charges.

This recommendation is not an implementation approval. It requires contract, disclosure, tax, accounting, Stripe, Dynamics, and Business Central review before rollout.

## Publishing Comparison

| Model | Cost | Early Payoff | Complexity | Contract Impact | Recommendation |
|---|---:|---|---|---|---|
| A - Current 4 percent per transaction | 4 percent fee on each multi-pay transaction; same total fee for 2-Pay and 4-Pay in current examples; slightly higher on 8-Pay when rounding creates more transactions | Future transaction fees are avoided because they are charged only when later payments occur | Low operational complexity; easy to run in Stripe today | Current agreements already support active use | Keep for existing contracts; consider replacing for future long plans |
| B - Simple finance/plan charge | Assumption in this study: 6 percent annual simple charge, prorated by term length | Unearned future charge can be waived pro rata at payoff | Moderate; requires earned/unearned charge tracking | Requires new agreement and disclosure language | Preferred future model if counsel/accounting approve |
| C - Declining-balance installment finance | Assumption in this study: 6 percent annual simple monthly charge on unpaid principal | Accrued charge follows remaining principal more precisely | Higher than Model B; better accounting precision | Requires stronger disclosures and payoff logic | Study further if JM1 wants precision over simplicity |
| D - Compound-interest installment financing | Assumption in this study: 6 percent APR compounded monthly | Payoff requires amortization schedule and accrued interest calculation | Highest complexity and compliance burden | Strongest contract/disclosure impact | Do not use for Publishing unless counsel specifically recommends |

## Package Examples

The comparison CSV in this package models Starter at $1,999, Professional at $4,500, and Premier/Signature at $7,500 across Full Pay, 2-Pay, 4-Pay, and 8-Pay.

Under the current model, total current multi-pay transaction fees before tax are:

| Package | 2-Pay | 4-Pay | 8-Pay |
|---|---:|---:|---:|
| Starter | $79.96 | $79.96 | $79.99 |
| Professional | $180.00 | $180.00 | $180.00 |
| Premier/Signature | $300.00 | $300.00 | $300.00 |

Under the study's simple 6 percent future finance-charge assumption, total cost before tax would be:

| Package | 2-Pay | 4-Pay | 8-Pay |
|---|---:|---:|---:|
| Starter | $2,009.00 | $2,028.99 | $2,068.97 |
| Professional | $4,522.50 | $4,567.50 | $4,657.50 |
| Premier/Signature | $7,537.50 | $7,612.50 | $7,762.50 |

## Early Payoff Examples

Using Starter 8-Pay as the worked example, the current model avoids unpaid future transaction fees. A future finance model should avoid unearned future finance charges and collect only remaining principal plus earned/accrued charge.

| Point | Current payoff due before tax | Current future fees avoided | Future Model B payoff due before tax | Future charge avoided |
|---|---:|---:|---:|---:|
| After 1 payment | $1,749.12 | $69.99 | $1,749.12 | $69.97 |
| 25 percent of term | $1,499.24 | $59.99 | $1,509.24 | $59.97 |
| 50 percent of term | $999.48 | $39.99 | $1,029.47 | $39.98 |
| 75 percent of term | $499.72 | $19.99 | $549.70 | $19.99 |

## Stripe Architecture

Finite Subscription Schedules are the best near-term Stripe fit for the current fixed-payment model. A future early-payoff model would need a payoff path that can cancel remaining scheduled phases/invoices and preserve the executed version, principal, earned charge, unearned charge, tax, and payment evidence. Stripe should remain the payment processor; Dynamics should remain the commercial operating record; Business Central should receive accounting postings only through an approved handoff.

## Dynamics / Business Central Impact

Future implementation must separately represent cash price, principal, finance charge, transaction fee, tax, amount paid, balance remaining, early payoff amount, accrued/earned charge, unearned future charge, paid-in-full state, and final-delivery release gate. Reuse existing commercial and fulfillment structures wherever possible. Do not create a duplicate commerce system.

## JMF Applicability

This study may apply to J Merrill Financial only for JMF-owned advisory or service fees. It must not be applied automatically to insurance premiums, pre-need carrier payments, FDLIC arrangements, Precoa arrangements, carrier-controlled payment schedules, or regulated third-party products.

## Enterprise Fulfillment Policy

Recommended candidate policy for future governance:

Work may progress while an approved payment plan is active, but final product or deliverable release remains subject to completion of the contractual payment obligation.

This is suitable for Publishing and likely suitable for other JM1 fee-for-service offerings, subject to division-specific exceptions.

## Legal / Compliance Review Needed

Before any future financing model is used, JM1 needs review of contract language, finance-charge disclosures, early-payoff disclosures, consumer-credit treatment, tax treatment, and accounting treatment. This package does not provide legal conclusions.

## Founder Decisions

1. Should Publishing keep 4 percent transaction fees for future short plans?
2. Should 4-Pay and 8-Pay move to a disclosed plan/finance charge?
3. What annual rate or fixed plan charge should be tested with counsel and accounting?
4. Should early payoff waive unearned finance charge pro rata or by a more precise accrued-charge calculation?
5. Should the enterprise fulfillment rule become JM1-wide policy?
6. Should JMF separately study the model for JMF-owned fees only?

## Evidence Package Path

`docs/operations/generated/JM1-FUTURE-PAYMENT-MODEL-STUDY-2026-08-20/`

## PR / Branch Status

Branch: `codex/jm1-future-payment-model-study-20260820`

No live system mutation was performed.

## Mutation Ledger

| Area | Count |
|---|---:|
| Stripe writes | 0 |
| Dataverse writes | 0 |
| Business Central writes | 0 |
| Author/client communications | 0 |
| Pricing changes | 0 |
| Contract changes | 0 |
