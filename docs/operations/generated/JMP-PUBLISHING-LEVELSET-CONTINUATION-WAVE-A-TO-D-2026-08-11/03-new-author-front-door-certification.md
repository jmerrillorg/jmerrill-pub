# New-Author Front Door Certification

Last Verified: 2026-08-11

## Certification State

The new-author front door is certified through the repository's governed guard suite and targeted portal-runtime remediation. No uncontrolled client-title automation was activated.

## Covered Path

| Requirement | Result |
| --- | --- |
| Author access mechanism | PASS |
| Author workspace authentication | PASS |
| Agreement v1.3.1 selection through commercial path | PASS |
| Package/payment fulfillment gate | PASS |
| Stripe payout enrollment separation from package payment | PASS |
| Production eligibility model | PASS |
| Title/Product Form runtime guard | PASS |
| Strong author portal session secret enforcement | PASS |
| Legacy/current access-code compatibility | PASS |

## Test Remediation

`scripts/program002_author_portal_logic.test.mjs` was updated to reflect current runtime canon:

- strong author portal session secret required;
- relationship-level setup flags replace older workspace/contract booleans;
- legacy access-record fixture uses the current v2 canonical hash form.

No production author access record was mutated by this remediation.

## Validation

The combined Wave B guard passed:

`node --test scripts/author_payout_enrollment_governance.test.mjs scripts/program002_author_portal_logic.test.mjs scripts/tranche3_title_pf_runtime.test.mjs`

Result:

- 26 / 26 PASS

Additional guards:

- `npm run author-auth-guard` - PASS
- `npm run tranche1-commercial-foundation-guard` - PASS
- `npm run tranche2-money-fulfillment-guard` - PASS

## Agreement Boundary

The governed agreement remains:

- `JMP Publishing Agreement v1.3.1`
- Attorney review is not an execution blocker for v1.3.1.

No agreement language was modified in this run.
