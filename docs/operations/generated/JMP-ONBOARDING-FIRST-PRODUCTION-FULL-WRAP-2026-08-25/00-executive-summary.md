# JMP Onboarding-First Production Authority + Full Wrap Remediation

Generated: 2026-08-25
Scope: Bounded Publishing production-governance correction, Full Wrap executor authority contract, and The Intentional Leader Full Wrap readiness.

## Result

The Full Wrap executor no longer treats ISBN, barcode, and distribution path as universal requirements. It now resolves production inputs by authority class:

- title-specific lifecycle authorities;
- author-selectable attributes with genre/book-type fallback;
- derived production values;
- conditional commercial metadata.

The implementation preserves author onboarding choices before applying genre defaults and preserves provenance for resolved production attributes.

## The Intentional Leader

The Intentional Leader, Volume I is treated as a commissioning / non-release title under Founder authority.

Resolved:

- Trim: 6 x 9
- Final page count: 275
- Superseded proof: 393 pages, not used
- Imprint: J Merrill Publishing
- ISBN required: no
- Barcode required: no
- Distribution required: no
- Publication launch required: no

Remaining nondelegable blocker:

`BACK_COVER_COPY_APPROVAL_REQUIRED`

No approved back-cover copy authority was found in the repository search or current Dataverse artifact readback performed during this pass. The executor must not self-approve generated copy.

## PR #610 Reconciliation

PR #610 correctly preserved useful recovery evidence and the existing Full Wrap task, but its PR body still classified ISBN, barcode, distribution path, and paper stock as missing universal blockers. This pass supersedes that interpretation with the Founder-approved conditional authority model.

## Validation

- Focused Full Wrap tests: 11 / 11 PASS
- Diagnostic Runner suite: PASS
- Diagnostic Runner lint: PASS
- Root type-check: PASS
- Root lint: PASS with pre-existing `app/layout.tsx` custom-font warning

## Boundaries

- Broad client-title automation thaw: no
- ISBN consumed for The Intentional Leader: 0
- Barcode generated for The Intentional Leader: 0
- Distribution submission created for The Intentional Leader: 0
- Publication launch created for The Intentional Leader: 0
- Author communication sent: 0
