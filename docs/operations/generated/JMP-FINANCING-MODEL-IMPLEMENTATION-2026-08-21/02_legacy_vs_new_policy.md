# Legacy vs New Payment Policy

Last verified: 2026-08-21T00:00:00Z

## Policy Split

| Policy | Version | Applies To | Treatment |
|---|---|---|---|
| Legacy multi-pay transaction fee | `JMP_MULTIPAY_TRANSACTION_FEE_4_PERCENT_v1.0` | Grandfathered/existing applicable contracts, including Atta | 4% multi-pay fee on multi-payment plans |
| New financing early-payoff model | `JMP_FINANCING_EARLY_PAYOFF_v1.0` | New-contract implementation case beginning with Quanishia | 6% annual simple plan charge prorated by financed months |

## Retained Relationship Pricing Sequence

Base price -> loyalty -> referral -> 50% cap -> adjusted cash price -> payment policy.

Payment policy does not change the cash price. It adds either legacy multi-pay transaction-fee amounts or new disclosed plan-charge amounts.

## Negative Proof

- Legacy policy removed: 0
- Atta repriced: 0
- Atta Stripe mutation: 0
- Atta agreement mutation: 0
- New policy silently applied to existing executed agreements: 0

