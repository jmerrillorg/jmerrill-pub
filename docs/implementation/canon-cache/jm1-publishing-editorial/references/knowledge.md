# JM1-PUB-Editorial-Knowledge-v1.0
**J Merrill Publishing, Inc. — Editorial Review GPT Knowledge Document**
Status: CANON | Version: 1.0 | April 2026

This document is attached to the Editorial Review GPT as a reference knowledge file.
It contains imprint definitions, scoring weight guidance, style guide matrix, and compliance detail.
The GPT instructions reference this file directly. Do not modify without Publisher authorization.

---

## SECTION 1 — THE FIVE IMPRINTS

### J Merrill Publishing (Flagship / Faith)
- **Audience:** General trade and faith-based readers, broad adult audience
- **Content:** Faith-aligned nonfiction, Christian living, inspirational, spiritual memoir, general trade fiction
- **Editorial bar:** Full — all eight standard categories apply at equal weight
- **Scoring emphasis:** Faith alignment, cultural sensitivity, market positioning
- **Hard stops:** Content that contradicts or undermines the faith positioning of the imprint

---

### JM Works (General Trade)
- **Audience:** General market — secular adult readers, retail and library channels
- **Content:** Non-faith general nonfiction and fiction, how-to, business, memoir, narrative nonfiction
- **Editorial bar:** Full — commercial viability is the primary weighted criterion
- **Scoring emphasis:** Market Fit and Commercial Potential carry the highest weight
- **Hard stops:** Brand misalignment with J Merrill One enterprise reputation standards

---

### JM Little (Children's)
- **Audience:** Children ages 0–12; parents, educators, librarians as gatekeepers
- **Content:** Picture books, early readers, middle grade, faith-based children's content
- **Editorial bar:** Full — two additional scoring criteria apply (see below)
- **Additional scoring criteria:**
  - Age Appropriateness & Lexile Fit (1–5)
  - Illustration Readiness (1–5): Does the manuscript indicate or support visual accompaniment?
- **Scoring emphasis:** Age appropriateness, reading level, educator/parent appeal
- **Hard stops:** ANY content sensitivity flag — violence, fear-inducing content, inappropriate language, adult themes — is an automatic hard stop regardless of other scores. No exceptions.

---

### JM Verse (Poetry)
- **Audience:** Poetry readers, literary market, niche audiences
- **Content:** Collections, chapbooks, spoken word, hybrid forms
- **Editorial bar:** Modified — Commercial Potential uses an advisory-only scale
- **Scoring emphasis:** Form, voice, thematic coherence are primary weighted criteria
- **Commercial Potential note:** Score reflects craft and niche market viability. A score of 3 in Commercial Potential for JM Verse does not trigger Developmental Editing routing unless other categories also score ≤ 3. Flag but do not penalize for commercial limitations inherent to the poetry market.
- **Hard stops:** Standard hard-stop flags apply

---

### JM Signature (Prestige Reserve — Publisher-Authorized Only)
- **Audience:** Curated, discerning readership — literary, institutional, collector market
- **Content:** Exceptional manuscripts selected personally by the Publisher; inaugural title: Iyorwuese Hagher, *The Conquest of Azenga*
- **Editorial bar:** Highest across all categories — no exceptions
- **Scoring emphasis:** All eight categories scored at full weight. Any score of ≤ 3 in any category triggers an automatic flag.
- **Authorization requirement:** JM Signature cannot be self-submitted. Official assignment requires Publisher approval.
- **GPT behavior:** When JM Signature is suggested but not officially assigned, Editorial Review still proceeds using JM Signature as recommendation context. The report must state that JM Signature is recommended pending Publisher approval and is not officially assigned until approved.
- **Hard stops:** Missing Publisher dual authorization overrides all scores and pathways.

---

## SECTION 2 — IMPRINT SCORING WEIGHT MATRIX

| Category | J Merrill | JM Works | JM Little | JM Verse | JM Signature |
|---|---|---|---|---|---|
| Structure & Flow | Standard | Standard | Standard | Standard | Full weight |
| Voice & Tone | Standard | Standard | Standard | **Primary** | Full weight |
| Clarity & Grammar | Standard | Standard | Standard | **Primary** | Full weight |
| Market Fit | Standard | **Primary** | **Primary** | Standard | Full weight |
| Commercial Potential | Standard | **Primary** | **Primary** | Advisory only | Full weight |
| Originality | Standard | Standard | Standard | **Primary** | Full weight |
| Ethics / Compliance | Standard | Standard | **Hard stop** | Standard | Full weight |
| Technical Formatting | Standard | Standard | Standard | Standard | Full weight |
| Age Appropriateness | — | — | **Primary** | — | — |
| Illustration Readiness | — | — | **Primary** | — | — |
| Form & Structure (poetry) | — | — | — | **Primary** | — |

**Key:**
- **Standard** = equal weight in overall average
- **Primary** = highest weighted criterion for this imprint; a score ≤ 3 triggers automatic flag
- **Advisory only** = scored but does not affect routing decision
- **Hard stop** = any flag in this category blocks progression regardless of other scores

---

## SECTION 3 — STYLE GUIDE MATRIX

| Manuscript Type | Primary Guide | Secondary Reference |
|---|---|---|
| Trade fiction & nonfiction (all imprints, default) | CMoS (Chicago Manual of Style) | None |
| Children's (JM Little) | CMoS | Publisher's style sheet |
| Poetry (JM Verse) | CMoS | Poet's own established form (advisory) |
| Social sciences, education, psychology | APA | CMoS |
| Humanities, literature | MLA | CMoS |
| Medical, health | AMA | CMoS |
| Journalism / media | AP | CMoS |
| Technical / scientific | IEEE / ACS / AIP / CSE / ISO | CMoS |
| Legal / institutional | Bluebook / OSCOLA / AGLC | Government style as applicable |

**Rules:**
- CMoS is the default for all J Merrill Publishing trade content unless manuscript type warrants otherwise.
- Mixed or conflicting styles must be flagged — do not resolve at review stage.
- Style guide determination becomes the governing default for all downstream editorial stages unless overridden in writing by the Publisher.

---

## SECTION 4 — HARD-STOP FLAG REFERENCE

The following flags override all scores and block progression to the next stage:

| Flag | Applies To |
|---|---|
| Unresolved legal or rights violations | All imprints |
| Explicit hate speech or incitement | All imprints |
| Severe ethical or reputational risk | All imprints |
| Unclear authorship or provenance | All imprints |
| Any content sensitivity flag | JM Little only — automatic hard stop |
| Missing Publisher assignment approval | JM Signature official assignment only — does not block Editorial Review |

When a hard-stop flag is triggered:
- State the flag clearly at the top of the report
- Do not continue to routing recommendation
- Provide author-supportive language explaining next steps or resubmission eligibility

Founder correction: missing confirmed imprint and missing Publisher approval for official JM Signature assignment do not block Editorial Review from running. They affect authority/status labeling, not review execution.

---

## SECTION 5 — FLOW CONTEXT (FOR GPT REFERENCE)

The Editorial Review GPT operates at Stage 3 of the canonical JM1 Publishing Flow:

```
Stage 1: Intake         → jm1pub_title record created (Dataverse)
Stage 2: Classification → Imprint assigned via JM1-PUB-TitleClassification-CANON
Stage 3: Editorial Review → THIS GPT (receives manuscript + imprint assignment)
Stage 4: Production Routing → Editorial pathway executed; ISBN assigned; distribution set
```

The GPT does not own official imprint assignment. If a confirmed imprint exists,
it reads the imprint from the Dataverse record and applies the appropriate lens.
If no confirmed imprint exists, the GPT determines and uses a suggested imprint
for review context and continues. It does not create BLOCKED, WAITING_ON_JACKIE,
or WAITING_ON_AUTHOR solely because confirmed imprint is missing.

---

## SECTION 6 — GOVERNANCE

| Item | Value |
|---|---|
| Document ID | JM1-PUB-Editorial-Knowledge-v1.0 |
| Owner | J Merrill Publishing, Inc. |
| Publisher | Jackie Smith Jr. |
| Status | CANON |
| Effective | April 2026 |
| Review cycle | On imprint change or Classification Flow update |
| Supersedes | N/A (first version) |

Modifications to this document require Publisher authorization and must be versioned.
Changes to imprint definitions must be reflected in the JM1 Classification Flow simultaneously.

---

*J Merrill Publishing, Inc. — Canon Reference Document*
*Do not distribute externally. Internal governance use only.*
