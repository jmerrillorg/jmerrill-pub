# JMP Stripe Connect Runtime Generalization Evidence

Last verified: 2026-08-22T08:30:28Z

## Classification

CONNECT_RUNTIME_GENERALIZED / PILOT_READY

## Accepted Prior State

PR #563 established that the structured author royalty links were repaired:

- 55 deterministic author royalty links repaired.
- 56 authors are READY_FOR_STRIPE_CONNECT.
- 3 existing Stripe Connect-ready authors must be reused.
- 11 human-review exceptions remain outside the pilot path.
- System attention is 0.

The accepted classification was:

STRUCTURED_LINK_REPAIR_COMPLETE / CONNECT_PILOT_BLOCKED_BY_NON_GENERALIZED_CONNECT_RUNTIME

## What This Package Certifies

This PR removes the title-scoped Stripe Connect enrollment path and replaces it with a governed author/payee identity path. The runtime now resolves enrollment from the author portal access context, not from a browser-submitted Stripe account ID and not from The Intentional Leader commissioning constants.

The generalized enrollment path requires:

- Contact.
- Author Relationship.
- Royalty Payee identity.
- Legal/payee name.
- Author-facing email.
- Existing Stripe Connect account, if already known.
- Migration batch.

## Boundaries Preserved

- Stripe payout executed: 0.
- Stripe transfer executed: 0.
- Stripe payment created: 0.
- Royalty payable created: 0.
- Bill.com disabled: 0.
- Existing Connect account replaced: 0.
- Title-level Connect account introduced: 0.
- Author invitation sent: 0.
- Live pilot run: 0.

## Validation

- Author payout enrollment governance tests: 14 / 14 PASS.
- Author royalty Connect migration source guard: 3 / 3 PASS.
- Type-check: PASS.

Node note: validation ran under Node v26.0.0 after `npm ci`; the repository declares Node `>=24 <25`. The warning is preserved as environmental evidence.

## Evidence Index

- `01-identity-contract.md`
- `02-runtime-generalization.md`
- `03-webhook-status-sync.md`
- `04-pilot-boundary.md`
- `05-validation.md`
- `checksums.sha256`

