# State-Machine Authority

Last verified: 2026-08-09T23:12:00Z

## Canonical Sources

- `scripts/tranche3_title_pf_runtime.mjs`
- `lib/server/publishing-title-closeout-service.ts`
- `scripts/publishing_title_closeout_service.test.mjs`
- `docs/operations/generated/JMP-MARKETING-CANON-RECONCILIATION-PILOT-445-READINESS-2026-08-09/17-pilot-activation-matrix-update.md`

## Generic Tranche 3 State Machine

The Tranche 3 lifecycle state machine is explicit and fail-closed. It does not contain a generic state named `AUTHOR_APPROVAL_CONFIRMED_PROTECTED_MUTATION_PENDING`; that state is a real-title operational hold created by Pilot readiness evidence.

## Protected Title Closeout Authority

The exact protected executor for this title is `PublishingTitleCloseoutService.closeApprovedStage`.

Allowlisted title: The Intentional Leader

Expected current stage: INTERIOR_LAYOUT

Expected protected next stage: Cover Design

## Allowed Next States

For this exact real-title protected closeout, the allowed next stage is:

- Cover Design

No other title, stage, or next-state target is allowlisted by this executor.

## Proposed Next State

Proposed next state after successful closeout: Cover Design

Execution readiness: NOT READY until live readback satisfies all protected closeout prerequisites.

