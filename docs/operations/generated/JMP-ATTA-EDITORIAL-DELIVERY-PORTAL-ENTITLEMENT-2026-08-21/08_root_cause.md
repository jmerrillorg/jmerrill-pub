# Root Cause

Last Verified: 2026-08-21T23:59:00-04:00
Evidence Source: Dataverse readback, Key Vault-backed portal registry readback, repository code review.

## Classification

AUTHOR_PORTAL_ENTITLEMENT_RECORD_NOT_CREATED

## Evidence

- Atta's Opportunity had `jm1_m6authorportalstatus = ACTIVE`.
- Joined-the-Family and workspace-active operational logs existed from the prior payment/agreement reconciliation.
- The production `AUTHOR_PORTAL_ACCESS_REGISTRY_JSON` had no Atta-specific grant before this repair.
- Existing payment-event reconciliation set the workspace status active but did not create or verify a hash-backed author portal grant.

## Systemic Repair Added

The repository now includes a reusable entitlement evaluator that checks the actual author portal grant registry by Contact/email plus Opportunity/title/intake scope. The payment-event consumer now logs either `AUTHOR_PORTAL_ENTITLEMENT_CONFIRMED` or `AUTHOR_PORTAL_ENTITLEMENT_MISSING` after Joined the Family, preventing the workspace-active flag from hiding a missing entitlement.
