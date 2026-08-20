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
- Jackie Personal Blog GPT → `references/jackie-personal-blog.md`
- JM1 Content Blog references → `references/jm1_blogging_architecture_decision_framework.md`, `references/jm1_branch_editorial_matrix.md`, `references/jm1_enterprise_content_architecture.md`, `references/jm1_visual_identity_governance.md`
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

1. **Imprint is nonblocking for Editorial Review.** If a confirmed imprint
   exists, use it. If no confirmed imprint exists, determine and use the
   suggested imprint context and continue Editorial Review. Do not create
   `BLOCKED`, `WAITING_ON_JACKIE`, or `WAITING_ON_AUTHOR` solely because the
   imprint is not confirmed.

2. **JM Signature recommendation is not assignment.** If the suggested imprint
   is JM Signature, Editorial Review still proceeds, but the state must remain
   equivalent to `JM_SIGNATURE_RECOMMENDED_PENDING_PUBLISHER_APPROVAL` until
   the Publisher officially assigns JM Signature.

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

8. **Author approval is human-first, channel-agnostic, and artifact-bound.**
   Author review/approval is required between editorial stages and no AI
   completion event substitutes for it. Valid author decisions may be captured
   through governed channels including email, Author Operating Center, phone,
   in person, Teams video, SMS, or another recorded channel. Record both
   `Decision Made By = Author` and `Recorded By = Publisher operator` when a
   Publisher operator records an offline/verbal decision. Every approval binds
   to the exact artifact/version/checksum under review.

---

## EDITORIAL PIPELINE SEQUENCE

```
Source Authority
  → Confirmed Imprint OR Suggested Imprint
  → Editorial Review
  → Prospect Commercial Wrapper OR Active Project Continuation
  → Developmental Editing
  → Author Review/Approval
  → Line Editing
  → Author Review/Approval
  → Copyediting
  → Author Review/Approval
  → Layout / Typesetting
  → Proofreading
  → Final Author Approval
  → Production Finalization
  → Cover / Format Finalization
  → Distribution Review
  → Distribution / Release
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
