# Connect Account Create / Reuse

Last Verified: 2026-08-22T11:59:59.764Z

| Metric | Count |
| --- | ---: |
| Accounts created | 3 |
| Accounts reused | 0 |
| Distinct account hashes after readback | 3 |
| Duplicate account finding after hash readback | 0 |

## Readback

| Author | Contact | Account Hash | Cohort | Details Submitted | Payouts Enabled | Charges Enabled |
| --- | --- | --- | --- | --- | --- | --- |
| Adrean Young | a52ada67-fa9d-f111-b8dc-000d3a14673b | 8a0b1498feb765d0 | JMP_STRIPE_CONNECT_AUTHOR_PILOT_2026_08_22 | false | false | false |
| Ashanti Flemister | 22ffe45a-fa9d-f111-b8dc-000d3a14673b | 4976232de5aa8f6f | JMP_STRIPE_CONNECT_AUTHOR_PILOT_2026_08_22 | false | false | false |
| Bailey Cunningham | 8e0a1c61-fa9d-f111-b8dc-000d3a14673b | b35fb289d6f501c4 | JMP_STRIPE_CONNECT_AUTHOR_PILOT_2026_08_22 | false | false | false |

The execute artifact originally showed duplicate_Stripe_account = 2 because the artifact counted redacted account prefixes. PR #572 corrected the canonical proof logic to compare account hashes instead of redacted display strings. Dataverse readback confirms three distinct stored account hashes.
