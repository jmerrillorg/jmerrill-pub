# Canon Guard Print Rule Correction Provenance Report

Generated: 2026-08-04
Branch: `codex/canon-guard-print-rule-correction`
Base: `origin/main` at `21d9e342bbefcf9f5acb3f011dd95d867c1f5411`

## Finding

Incorrect rule first introduced in:

- Unmerged local worktree `/Users/jmerrillone/Developer/codex-worktrees/jmerrill-pub-program-008-author-review-prep`
- Branch `codex/canon-guard-enforcement`
- Uncommitted files:
  - `scripts/jm1_bootstrap.mjs`
  - `scripts/jm1_bootstrap_guard.test.mjs`
  - `lib/server/jm1-canon-guard.ts`
  - `scripts/jm1_canon_guard_enforcement.test.mjs`

Introduced by:

- Cody implementation work in the unmerged canon guard enforcement branch.

Approved by Jackie:

- NO.

Controlling approved rule at that time:

- Chapter 1: `RECTO`
- Subsequent chapters: `NATURAL FLOW`
- Artificial blank pages before later chapters: `PROHIBITED`
- Chapter-opening header/footer/folio: `SUPPRESSED`
- Eligible continuation-page running headers and folios: `ACTIVE`

Root-cause classification:

- `IMPLEMENTATION_MISREAD`

## Evidence

Current `origin/main` already carried the approved rule in Bootstrap:

- `scripts/jm1_bootstrap.mjs`: `subsequentChapters: 'NATURAL_FLOW'`
- `scripts/jm1_bootstrap_guard.test.mjs`: asserts `NATURAL_FLOW`

The incorrect unmerged branch changed those to:

- `scripts/jm1_bootstrap.mjs`: `subsequentChapters: 'RECTO'`
- `scripts/jm1_bootstrap_guard.test.mjs`: asserts `RECTO`
- `lib/server/jm1-canon-guard.ts`: checked `everyChapterOpensRecto`
- `scripts/jm1_canon_guard_enforcement.test.mjs`: passed only when `everyChapterOpensRecto: true`

No merged current-main authority was found that required later chapters to open recto.

## Correction

This correction branch preserves Bootstrap `NATURAL_FLOW` and adds guard enforcement that:

- requires Chapter 1 to begin recto;
- allows later chapters to begin recto or verso by natural flow;
- blocks artificial blank pages inserted solely to force later chapter recto starts;
- suppresses chapter-opening headers, footers, and folios;
- requires eligible continuation-page running headers and folios.

## Stale Conflicting Authority Scan

Search terms:

- `all chapters recto`
- `subsequent chapters recto`
- `later chapters recto`
- `every chapter begins on right`
- `chapter openings forced recto`
- `subsequentChapters`
- `everyChapterOpensRecto`

Stale conflicting rules found: 4

- `scripts/jm1_bootstrap.mjs` in unmerged `codex/canon-guard-enforcement`
- `scripts/jm1_bootstrap_guard.test.mjs` in unmerged `codex/canon-guard-enforcement`
- `lib/server/jm1-canon-guard.ts` in unmerged `codex/canon-guard-enforcement`
- `scripts/jm1_canon_guard_enforcement.test.mjs` in unmerged `codex/canon-guard-enforcement`

Corrected in this branch: 4

Historical evidence preserved but marked superseded: 0

Unresolved: 0

## Provenance Safeguard

Because the root cause was `IMPLEMENTATION_MISREAD`, no Bootstrap authority migration was required. Regression tests now assert that:

- Bootstrap continues to expose `subsequentChapters: 'NATURAL_FLOW'`;
- Bootstrap does not expose `subsequentChapters: 'RECTO'`;
- a generated or historical evidence fixture carrying `subsequentChapters: 'RECTO'` is not `APPROVED_CANON` and cannot override the approved print rule.
