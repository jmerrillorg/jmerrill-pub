# Layout/Proof Boundary — Primary Pipeline Correction

## Does the current autonomous pipeline proofread before or after layout?

**BEFORE.** Confirmed directly in source code, not inferred:

`lib/server/author-review-package-engine.ts`, `PACKAGE_STAGE_POLICIES` (declaration order, lines ~345-505):
```
EDITORIAL_REVIEW → DEVELOPMENTAL_EDITING_REVIEW → LINE_EDITING_REVIEW →
COPYEDITING_REVIEW → PROOFREADING_REVIEW → INTERIOR_LAYOUT_REVIEW →
COVER_DESIGN_REVIEW → PRODUCTION_PROOF_REVIEW
```

`PROOFREADING_REVIEW` is positioned and sequenced **before** `INTERIOR_LAYOUT_REVIEW`. This directly conflicts with the updated Proofreader canon's explicit "post-copyedit, post-layout verification" role and its mandatory post-layout checks (page breaks, running heads, folios, TOC page numbers, stranded headings, tables split by layout).

## Root cause: three unreconciled stage models

1. **`milestone7cEditorialCommandCenter.js`** — internal task-tracking `EDITORIAL_STAGES` enum: `REVIEW → DEVELOPMENTAL → LINE → COPYEDIT → PROOFREAD → COMPLETE_READY_FOR_PRODUCTION_HANDOFF`. **No layout stage exists in this enum at all.**
2. **`author-review-package-engine.ts`** — author-facing package/gate stage list (above), which *does* have a layout stage, but places it after Proof.
3. **`publisher-operating-center.ts`** — a third, coarser read-model stage list that merges Cover and Interior Layout into a single generic "Cover / Interior" stage, and cannot express the layout/proof ordering conflict at all.

None of these three cross-validate against each other. This is not one system with a bug — it's three independently-defined systems that happen to disagree.

## Empirical corroboration
The Intentional Leader's real history (from this session's earlier investigation): a Copyediting Approval/Proofreading Transition document is dated mid-July 2026; the Interior Layout proof was generated in early August 2026 — weeks later. This matches the code-level finding: proofreading ran before layout existed for this real title.

## Required boundary (smallest fix, not a rewrite)
```
Copy → Author Approval → Layout/Typesetting → Proof → Final Author Approval → Production Finalization
```
Layout capability already exists (Interior Layout work was performed for The Intentional Leader) — the fix is **sequencing and stage-model reconciliation**, not building new layout capability. Establish one canonical stage-sequence source of truth (recommend: extend `PACKAGE_STAGE_POLICIES`'s ordering to be authoritative, since it already has all the right stages — just in the wrong order — and have the other two enums either derive from it or be reconciled against it), then correct the ordering.

## Classification: CONFLICT — P0
