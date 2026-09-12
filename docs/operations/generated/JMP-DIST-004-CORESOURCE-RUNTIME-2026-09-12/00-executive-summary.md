# JMP-DIST-004 CoreSource Runtime Implementation

Date: 2026-09-12
Canonical base: `fabbe8877d1f7eb4178f25f95694f2a94a05c02c`
Branch: `codex/jmp-dist004-coresource-runtime-sep11`

## Implemented

- CoreSource metadata template schema contract.
- Deterministic workbook generation model.
- Workbook validator with required-field, column-order, ISBN, enum, duplicate-row, date, checksum, and safe-canary checks.
- Explicit canary fail-closed blockers for unknown distribution state, missing release controls, active downstream channels, LSI leakage, and current/on-sale products.
- Provider health classification model.
- Provider-health routing decision model for primary/fallback routing.
- Channel ownership matrix and duplicate upstream authority prevention.
- CoreSource upload/job/readback evidence model.
- UI-assisted CoreSource adapter and machine-adapter abstraction.
- Nonpublic canary firewall.
- ORCH-012 18-action revalidation model.

## Provider Readback

- CoreSource authenticated dashboard observed for `J Merrill Publishing, Inc.`.
- CoreSource dashboard observed counts: eBook `134`, Print `52`, Audio `5`, Number of Distributions `161`, failed title groups `17`, missing-content attention rows still visible.
- CoreSource support ticket `#5862952` remains open with no provider response visible in the readback.
- Lightning Source authenticated dashboard observed for `J Merrill Publishing, Inc. Account#: 6116305`.
- Lightning Source recently added titles and global-distribution indicators are visible; this proves account access/readability, not full distribution health.
- IngramSpark account `9118734`, Amazon direct, and Barnes & Noble direct were not fully read back in this pass.

## Boundary

No provider upload was executed.
No CoreSource ingestion was executed.
No distribution retry was executed.
No live canary was executed.
No public product was created.
No on-sale product was created.
No Amazon Direct or Barnes & Noble Direct activation was performed.
No ISBN/product ownership was changed.

## Current Classification

DIST-004 is OPEN / ADVANCED.

The repo now has the safe implementation spine required for UI-assisted CoreSource operations, but clean closure remains blocked by provider facts that must be proven outside code:

- Exact CoreSource safe nondistributable/nonpublic field values.
- Complete LSI health/readback beyond authenticated dashboard access.
- IngramSpark health/readback.
- Direct retailer role inventory.
- CoreSource support ticket `#5862952` machine-ingestion response.

The current exact repo-level classification is `JMP_DIST_004_PARTIAL`: internal implementation advanced and verified; provider-public-effect closure remains unproven; no canary is eligible.

## Verification

- DIST-004 focused test suite: PASS.
- Distribution-focused regression suite: PASS.
- Full diagnostic-ai-runner test suite: PASS.
- Package lint / syntax validation: PASS.
