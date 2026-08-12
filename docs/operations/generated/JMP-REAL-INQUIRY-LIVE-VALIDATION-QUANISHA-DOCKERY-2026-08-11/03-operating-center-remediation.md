# Operating Center Remediation

Last Verified: 2026-08-11

## Defect

The live inquiry proved a read-model mismatch:

- `/join` routing linked a Lead using `_jm1_linkedlead_value` / `_jm1_lead_value`.
- The Publisher Operating Center queue only read `_jm1_opportunity_value`.
- Stage 0 diagnostic state was not loaded into the default inquiry queue.

This could make a real new inquiry appear commercially unlinked or blocked for the wrong reason after the pipeline had already reached a Jackie review gate.

## Correction

`lib/server/publisher-operating-center.ts` now:

- selects `_jm1_linkedlead_value` and `_jm1_lead_value` on intake reads;
- exposes `leadId` on `PublisherQueueItem`;
- loads recent `jm1pub_editorialdiagnostics`;
- correlates diagnostics by `_jm1_stage0diagnostic_value` or intake lookup;
- exposes `diagnosticId` and `diagnosticStatus` on queue items;
- maps diagnostic status `Awaiting Jackie Review` to `Stage 0 diagnostic awaiting Jackie review`;
- creates a bounded `Review Stage 0 diagnostic` action for that real Publisher gate.

## Guard

`scripts/publishing_intake_orchestration_autostart.test.mjs` now verifies that live join inquiries:

- preserve Lead linkage;
- load Stage 0 diagnostics;
- recognize `DIAGNOSTIC_STATUS_AWAITING_JACKIE_REVIEW`;
- surface `Stage 0 diagnostic awaiting Jackie review`;
- expose `Review Stage 0 diagnostic`.

## Boundary

The remediation did not:

- create or modify this inquiry's Contact, Lead, title, or diagnostic;
- send author communication;
- activate Author Workspace access;
- send agreement documents;
- start Stripe Connect;
- move production;
- mutate Iyorwuese or The Intentional Leader.
