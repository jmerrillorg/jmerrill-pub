# Manual/Autonomous Pipeline Alignment — Executive Summary

**Date:** 2026-08-19
**Scope:** compare the updated manual editorial GPT/skill canon (JMP-GPTs_2.zip) against the actual autonomous runtime, domain by domain.

## The single most important finding

**Line Editing and Copyediting are not actually happening.** The real runtime executor (`editorialExecutionRuntime.js`) discards the AI model's output entirely for every stage, and for Line/Copy specifically has no dedicated output logic at all — it falls through to the same hardcoded "Developmental Editing Output" boilerplate used for Developmental. Any real title currently going through Line or Copy today receives a mislabeled Developmental-stage artifact, not a line or copy edit. This is a live pipeline-correctness defect, not a documentation mismatch — it predates this audit and is not caused by it.

## Second most important finding

**Proofreading runs before Layout, contradicting the updated manual canon's explicit "post-layout verification" requirement.** Confirmed directly in source: `PACKAGE_STAGE_POLICIES` lists `PROOFREADING_REVIEW` before `INTERIOR_LAYOUT_REVIEW`, and the separate internal `EDITORIAL_STAGES` enum has no layout stage at all. This traces to a deeper structural issue: **three independently-defined, unreconciled stage-sequence enums exist** across the codebase (`milestone7cEditorialCommandCenter.js`, `author-review-package-engine.ts`, `publisher-operating-center.ts`), none of which cross-validate against the others.

## Good news

- **Author gates are genuinely code-enforced**, not just documented — a stage cannot advance without a real, parsed author email reply; no "AI finished → auto-advance" path exists anywhere.
- **Model routing has no silent fallback** — `allowFallback:false` is hardcoded for all 5 editorial stages; the one place fallback is permitted (Stage 0) records the reason.
- **Imprint hard-stop language exists only in the manual GPT text, not in the runtime** — the actual Editorial Review runtime does not currently block on missing imprint. This is the reverse of what the audit was worried about: the manual GPT needs correcting to match already-aligned runtime behavior, not the other way around.
- **Existing Dataverse schema already supports** the confirmed/suggested imprint distinction (`jm1pub_certifiedimprint`, `jm1pub_imprint`, `jm1pub_classificationstatus`) — no new fields needed.
- **The Intentional Leader's concept-vs-full-wrap distinction was preserved correctly this session**, but only through manual ops documentation, not a runtime enum — confirming the Cover Intelligence gap is real, not hypothetical.

## Overall classification counts

See `01-alignment-matrix.csv` for the full, line-by-line matrix. Summary: 3 CONFLICT, 6 PARTIAL, 3 MISSING, 5 ALIGNED, 1 MANUAL_ONLY_BY_DESIGN across the audited domains.
