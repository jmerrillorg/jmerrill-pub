# PROGRAM-005 Preview Capacity and Release Readiness

Date: 2026-07-30
Program: PROGRAM-005 Publishing Pipeline Reliability
Branch: `codex/program-005-publishing-pipeline-reliability`
PR: #357

## Current PR State

PR #357 contains the accepted PROGRAM-005 publishing pipeline reliability repair plus one scoped metadata declaration required by the canonical workflow-engine guard.

Current head:

`da2406f8635d05be7b60aa56e4998dd73536c0e2`

## Validation Completed

Local validation from the PROGRAM-005 worktree:

| Gate | Result |
| --- | --- |
| `npm run type-check` | PASS |
| `npm run lint` | PASS with the accepted `app/layout.tsx` font warning |
| `npm run build` | PASS with known Dataverse catalog static-generation warnings |
| `npm run workflow-engine-guard` | PASS |
| `npm run program005-pipeline-guard` | PASS |
| PROGRAM-005 evidence JSON validation | PASS |
| PROGRAM-005 evidence checksum validation | PASS |
| Scoped retained-secret scan | 0 hit files |
| `git diff --check` | PASS |

The GitHub Static Web Apps workflow also completed the build successfully before failing at preview deployment.

## SWA Preview Capacity Exception

Failure cause:

Azure Static Web Apps maximum staging-environment capacity.

GitHub Actions error:

`This Static Web App already has the maximum number of staging environments. Please remove one and try again.`

Active preview consumers identified:

| PR | Purpose | State | Checks | Preview disposition |
| --- | --- | --- | --- | --- |
| #341 | JM1-INFRA-005 production deployment reliability | OPEN | Build and Deploy PASS | Active; do not close without governance disposition |
| #349 | GATE-W1 / GATE-W3 App Service evidence lineage | OPEN | Build and Deploy PASS | Active; do not close while GATE-W3 exception evidence is still in use |
| #355 | GATE-W2 topology and cost decision package | OPEN / Draft | Build and Deploy PASS | Draft evidence/decision package; do not close solely to free capacity |
| #356 | PROGRAM-004 Annex S evidence preservation | OPEN | Build and Deploy FAIL | Separate evidence-preservation workstream; not one of the three current SWA preview consumers listed in the directive |
| #357 | PROGRAM-005 publishing pipeline reliability recovery | OPEN | Build succeeds; preview deploy blocked by capacity | Requires human preview-capacity exception or safe preview release decision |
| #358 | GATE-W3 platform exception evidence preservation | OPEN / Draft | Build and Deploy in progress at readback | Evidence-only; separate from PROGRAM-005 |

No active preview environment was deleted or closed during this pass. No required check was disabled.

## Narrow Exception Assessment

Application validation:

Completed through local type-check, lint, build, workflow guard, PROGRAM-005 guard, evidence checksum validation, and scoped secret scan.

Security impact:

None identified. The failed GitHub job masks configured secrets and fails before preview environment creation.

Evidence integrity:

Validated.

Production deployment:

Not performed.

Required approval:

Human repository approver or Jackie governance decision, because branch protection and the failed required SWA check prevent normal mechanical merge.

## Release Readiness Classification

PROGRAM-005 source and evidence:

READY FOR HUMAN REVIEW.

PROGRAM-005 merge:

BLOCKED - SWA preview-capacity / required-check failure.

PROGRAM-005 production verification:

PENDING - requires merge and governed production deployment first.

The Intentional Leader CAP-002 transition:

PENDING - do not advance until PROGRAM-005 is merged and production-verified.

Publisher Operating Center certification:

PENDING - production runtime verification required after deployment.

Author Operating Center certification:

PENDING - production runtime verification required after deployment.

## Non-Actions Confirmed

- Preview environment deletion: 0
- Required check disablement: 0
- PR merge: 0
- Production deployment: 0
- Manual stage changes: 0
- Fabricated approval events: 0
- Duplicate author communication: 0
- Static Web Apps retirement: 0
- DNS changes: 0
- Business Central production posting: 0
- Stripe payout or transfer: 0
