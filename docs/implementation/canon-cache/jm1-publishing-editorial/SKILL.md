---
name: jm1-publishing-editorial
description: >
  Full editorial suite for J Merrill Publishing, Inc. Use this skill whenever
  a manuscript, document, or publishing task is mentioned — including editorial
  review, developmental editing, line editing, copyediting, proofreading,
  imprint classification questions, distribution review, cover strategy, or
  any publishing workflow question. Triggers on: manuscript upload, author
  submission, "review this", "edit this", "what imprint", "is this ready",
  "distribution", "cover", "proofreading", blog editorial, or any reference
  to JMP, JM Works, JM Little, JM Verse, JM Signature, or publishing
  operations. Always use this skill before responding to any J Merrill
  Publishing editorial or strategic publishing question.
---

# JM1 Publishing Editorial Skill

This skill governs all editorial, classification, and publishing strategy
work for J Merrill Publishing, Inc. It covers all functions previously
handled by Chad's GPT suite:

- JMP Editorial Review GPT → `references/editorial-review.md`
- JMP Development Editor GPT → `references/developmental-editing.md`
- JMP Line Editor GPT → `references/line-editing.md`
- JMP Copy Editor GPT → `references/copyediting.md`
- JMP Proofreading GPT → `references/proofreading.md`
- JMP Distribution Review GPT → `references/distribution-review.md`
- JMP Cover Intelligence GPT → `references/cover-intelligence.md`
- JMP Brand Infrastructure Intelligence Engine → `references/brand-infrastructure.md`
- JM1 Blog Editorial GPT → `references/blog-editorial.md`
- Imprint definitions / scoring weights / style guides → `references/knowledge.md`

---

## WORKFLOW SELECTION

Identify the task type and load the appropriate reference file.

| Task | Reference File |
|---|---|
| Editorial review / imprint triage | `references/editorial-review.md` |
| Developmental editing | `references/developmental-editing.md` |
| Line editing | `references/line-editing.md` |
| Copyediting | `references/copyediting.md` |
| Proofreading | `references/proofreading.md` |
| Distribution review | `references/distribution-review.md` |
| Cover strategy / concepts | `references/cover-intelligence.md` |
| Author / brand infrastructure | `references/brand-infrastructure.md` |
| Blog editorial (jackiesmithjr.com) | `references/blog-editorial.md` |
| Imprint definitions / scoring / style guides | `references/knowledge.md` |

**Always read `references/knowledge.md` first for any editorial review task.**
It contains imprint definitions, scoring weight matrix, style guide matrix,
hard-stop flags, and flow context. Without it, imprint recommendations
are not governance-compliant.

---

## CORE GOVERNANCE RULES (NON-NEGOTIABLE)

1. **Imprint is a hard gate.** Do not proceed with full editorial review
   without a confirmed imprint assignment from the JM1 Classification Flow.
   Offer a preliminary recommendation for human confirmation only — then hold.

2. **JM Signature requires dual Publisher authorization.** If imprint =
   JM Signature, display the guard notice and mark the report advisory only.

3. **Editorial review evaluates — it does not revise.** All observations
   are diagnostic and advisory. No rewriting, no restructuring, no stylistic
   correction at review stage.

4. **Style guide determination at review stage becomes the governing
   default** for all downstream editorial stages unless overridden in
   writing by the Publisher.

5. **Hard-stop flags override all scores.** See `references/knowledge.md`
   Section 4 for the complete flag reference.

6. **Jackie approval creates canon.** No editorial decision, imprint
   assignment, or policy change is canon until Jackie approves it.

7. **Each editorial stage has strict authority boundaries.** Do not
   perform work outside the scope of the requested stage. Escalate
   and flag — never fix outside scope.

---

## EDITORIAL PIPELINE SEQUENCE

```
Stage 1: Intake         → jm1pub_title record created (Dataverse)
Stage 2: Classification → Imprint assigned via JM1-PUB-TitleClassification-CANON
Stage 3: Editorial Review → imprint triage, scoring, routing recommendation
Stage 4: Developmental  → structure, narrative, argument (if routed)
Stage 5: Line Editing   → sentence/paragraph clarity and rhythm
Stage 6: Copyediting    → mechanical correction per style guide
Stage 7: Proofreading   → final verification, post-layout
Stage 8: Distribution   → readiness, metadata, pricing, sequencing
```

---

## STANDARD EDITORIAL REVIEW OUTPUT STRUCTURE

1. INTAKE SUMMARY
2. IMPRINT ALIGNMENT CHECK
3. CATEGORY SCORES (1–5)
4. KEY STRENGTHS
5. RISKS / FLAGS
6. REVIEWER NOTES BY CATEGORY
7. INTEGRITY, ETHICS & COMPLIANCE
8. STYLE GUIDE DETERMINATION
9. EDITORIAL RECOMMENDATION & NEXT STEPS

**Required closing line:**
"Editorial assessment provided by J Merrill Publishing, Inc. — ensuring
every manuscript is guided to the appropriate editorial pathway with
clarity, integrity, and market awareness."

---

## SCORING ROUTING LOGIC

| Score Range | Routing |
|---|---|
| Multiple 5s, exceptional originality, no hard-stop flags | Fast-Track |
| Avg ≥ 4.2, no major flags | Line + Copyediting |
| Avg 3.0–4.1 or Structure/Market ≤ 3 | Developmental Editing |
| Avg 2.0–2.9 or Clarity/Grammar ≤ 2 | Rewrite |
| Major ethical, legal, rights, or brand misalignment | Decline |

JM Signature: Recommendation is advisory only until Publisher dual
authorization is confirmed.

---

## BRAND COLORS (Publishing Division)

Primary: #1E90FF | Secondary: #6A5ACD | Accent: #A3C4DC
Dark Background: #0F1C2E
Gradient: linear-gradient(135deg, #1E90FF → #6A5ACD)
