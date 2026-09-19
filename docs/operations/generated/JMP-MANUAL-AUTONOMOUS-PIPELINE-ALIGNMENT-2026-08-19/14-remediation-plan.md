# Remediation Plan (audit/read-only pass — nothing implemented yet)

## P0 — Human/author safety conflicts
1. **Line/Copy editing produce mislabeled Developmental boilerplate, not real edits.** Authors reviewing "Line Edited" or "Copyedited" artifacts today are not getting what the label says. Build real per-stage output paths that actually use model output, or a deterministic equivalent scoped correctly to each stage's actual authority (mechanical-only for Copy, sentence-level for Line).
2. **Proof runs before Layout.** Reorder `PACKAGE_STAGE_POLICIES` so `INTERIOR_LAYOUT_REVIEW` precedes `PROOFREADING_REVIEW`; add a bridging layout concept to `milestone7cEditorialCommandCenter.js`'s `EDITORIAL_STAGES` (currently absent entirely).
3. **Three unreconciled stage-sequence enums.** Establish one canonical source of truth; have the other two derive from or validate against it. This is the root cause behind both #2 above and the Operating Center's inability to detect the conflict itself.
4. **No retention/drift QA anywhere.** `correctionCounting.js` and `editorialComplianceValidator.js` exist but are dead code. Wire objective enforcement into the real stage executor before authors rely on stated retention percentages.

## P1 — Pipeline correctness conflicts
5. Correct the manual GPT's imprint hard-stop text (doc-only fix; runtime is already aligned).
6. Add explicit confirmed-else-suggested imprint resolution + JM Signature recommended-vs-assigned labeling to the Editorial Review feed path.
7. Wire style-guide selection into the real stage executor and persist it on title/artifact lineage instead of passing an empty array every call.
8. Extend context carry-forward (author intent, imprint, prior findings) beyond checksums/approval-gate state.
9. Wire `productionReadinessFromWorkload` to actually emit the already-declared `FRONT COVER APPROVED`/`FULL WRAP APPROVED` distinction, and use it in the distribution gate instead of the flat `COVER_APPROVED` boolean.
10. Implement the POD profitability gate (margin/discount/returnability) — currently entirely unimplemented despite being an "ENFORCED" manual requirement.

## P2 — Quality/governance gaps
11. Per-title distribution-path selection (remove the blanket `INGRAM_CONTENT` hardcoding).
12. Real per-title trim/spine/page-count/ISBN resolution feeding cover generation (currently opaque checklist labels only).
13. Extend the distribution setup checklist toward the manual's full multi-domain scope (BISAC/rights/accessibility/audio/sequencing).
14. Reconcile or retire the unused `editorialModelRoutingRegistry.js` (targets GPT-5, never actually consulted by the live executor) to prevent future policy/runtime drift.
15. Map/add an explicit Ready/Minor-Fixes/Blocked tri-state for Distribution Review.

## P3 — Already aligned, no action needed
- Author-gate enforcement (genuinely code-enforced, real email-reply-driven).
- Model routing provider-family policy (Claude for Review/Dev/Line, OpenAI for Copy/Proof) with no silent fallback.
- Imprint schema (existing fields fully sufficient).
- Operating Center's human-friendly stage naming.
- Prospect vs. Active Project lifecycle distinction (already corrected in prior sessions).

## Not mutated during this audit
No runtime code, Dataverse records, or manual GPT files were changed. This is a read-only alignment audit as instructed. Live projects (Before You Were Born, The Long Watch, The General's Will, The Intentional Leader, Establishing Glory, Indomitable) were not touched.
