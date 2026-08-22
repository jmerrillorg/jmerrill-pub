# Stripe Connect Author Pilot Evidence - Executive Summary

Last Verified: 2026-08-22T11:59:59.764Z

Classification: STRIPE_CONNECT_AUTHOR_PILOT_PASS

## Result

| Metric | Count / State |
| --- | --- |
| PR #567 runtime generalized | MERGED / CANONICAL |
| Protected route PR | #569 MERGED |
| Account-create payload correction | #570 MERGED |
| Unsupported account-search correction | #571 MERGED |
| Duplicate-proof reporting correction | #572 MERGED |
| Production release after pilot execution | a88ed603942afca2242af6b776c05d99648edc44 |
| Current production release after proof fix | 2e3950223aeefc6e3bbef0c076d4f07eac04dec1 |
| Dry-run run | 32571411635 SUCCESS |
| Execute run | 32571463345 SUCCESS |
| Selected pilot authors | 3 |
| READY_FOR_STRIPE_CONNECT at dry-run | 40 |
| Human-review exceptions excluded | 1 |
| Stripe Connect accounts created | 3 |
| Stripe Connect accounts reused | 0 |
| Onboarding links generated | 3 |
| Author invitations sent | 3 |
| Failures | 0 |
| Distinct account hashes after readback | 3 |
| Payout system | BILL_COM_LEGACY |
| Bill.com disabled | false |
| Payout cutover | false |
| Royalty payouts | 0 |
| Stripe transfers | 0 |

The pilot created three author-level Stripe Connect accounts, generated three unique hosted onboarding links, and sent three governed author invitations. No payout, transfer, Bill.com cutover, royalty-rate change, contract change, rights change, or historical payment change occurred.

## Failed Attempts Preserved

| Run | Release | Result | Root Cause | Mutation |
| --- | --- | --- | --- | --- |
| 32570817319 | a49f3b29b7d0c9d2f94cd6b459f2b0b5813c9eba | BLOCKED | Stripe account_invalid before create/link/send | 0 accounts / 0 links / 0 sends |
| 32571162849 | 6de0874c7538dea37d7e09512bbcb1e6756e9968 | BLOCKED | Unsupported /v1/accounts/search path returned account_invalid | 0 accounts / 0 links / 0 sends |

## Pilot Authors

| Author | Contact | Author Relationship | Royalty Payee | Email Hash | Status | Account Source | Account | Readiness | Execution Log |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Adrean Young | a52ada67-fa9d-f111-b8dc-000d3a14673b | 04adc867-fa9d-f111-b8dc-7c1e525b15c2 | 04adc867-fa9d-f111-b8dc-7c1e525b15c2 | 009940fc99f65281 | ONBOARDING_INVITED | created | acct_1U...[redacted] | ONBOARDING_STARTED_OR_PENDING | 3b434515-209e-f111-b8dc-000d3a14673b |
| Ashanti Flemister | 22ffe45a-fa9d-f111-b8dc-000d3a14673b | a9ed8a5b-fa9d-f111-b8dc-7c1e525b15c2 | a9ed8a5b-fa9d-f111-b8dc-7c1e525b15c2 | 089e8be1d5361e65 | ONBOARDING_INVITED | created | acct_1U...[redacted] | ONBOARDING_STARTED_OR_PENDING | 6c29191b-209e-f111-b8dc-7c1e525b15c2 |
| Bailey Cunningham | 8e0a1c61-fa9d-f111-b8dc-000d3a14673b | 612d8d61-fa9d-f111-b8dc-7c1e525b15c2 | 612d8d61-fa9d-f111-b8dc-7c1e525b15c2 | 712f5ee347aa34c3 | ONBOARDING_INVITED | created | acct_1U...[redacted] | ONBOARDING_STARTED_OR_PENDING | ce551f20-209e-f111-b8dc-000d3a14673b |
