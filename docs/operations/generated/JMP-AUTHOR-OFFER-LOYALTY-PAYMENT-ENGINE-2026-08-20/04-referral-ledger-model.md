# Referral Ledger Model

## Earning Rule

A referral credit is earned only when:

Publishing Agreement Executed + Required Initial Payment Successfully Received = `JOINED_THE_FAMILY`.

No credit is earned for referral submission, inquiry, intake, manuscript submission, Editorial Review, package recommendation, or agreement alone.

## Unit

The canonical unit is percentage-point benefit. Each earned referral is worth 10 percentage points.

## Implemented Pure Evaluation

Function: `evaluateReferralLedger(events)`.

It deduplicates Joined the Family replay by referral key and separates earned percent from applied/reserved percent.

## States

Conceptual states:

- `AVAILABLE`
- `SELECTED`
- `RESERVED`
- `APPLIED`
- `RESTORED`

Final production persistence remains future integration work. No Dataverse schema mutation occurred in this PR.

## Good Standing Gap

Referral credits are preserved without expiration for v1. The unresolved policy flag remains:

`GOOD_STANDING_DEFINITION_PENDING`.

