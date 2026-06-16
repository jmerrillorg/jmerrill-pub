# INT-PUB-005 Stage 0 Diagnostic — `knowledge.md` Content Review

## Purpose

This document is the editorial content review artifact for Jackie. It presents the full proposed content for `knowledge.md` — the AI grounding file for the Stage 0 Diagnostic prompt `jm1-prompt-pub-stage0-diagnostic`.

**The blob at `stjm1diagrunner/knowledge/knowledge.md` must not be overwritten until Jackie approves the content below.**

After Jackie approves:
1. Update `knowledge.md` with the approved content
2. Increment version to `v1.0`
3. Upload to `stjm1diagrunner/knowledge/knowledge.md`
4. Record the upload timestamp and SHA-256 hash in the grounding location document
5. Set `jm1pub_active = true` only after all remaining Section 15 items are satisfied

Items marked `[Jackie: confirm]` require Jackie's input before the file is finalized. Items marked `[Jackie: revise]` are drafts that may need editorial adjustment.

---

## Proposed `knowledge.md` Content

```markdown
# JM1 Publishing — Stage 0 Diagnostic Knowledge Base

**Governed grounding file for:** Stage 0 Editorial Diagnostic AI (`jm1-agent-pub-diagnostic-01`)
**Prompt template:** `jm1-prompt-pub-stage0-diagnostic` / `PUB-STAGE0-DIAGNOSTIC-V1`
**Version:** v1.0
**Status:** Active — approved by Jackie [date to be filled at approval]

---

## 1. Imprint Definitions

The agent must recommend the imprint that best fits the submitted work. Imprint selection is
advisory only and requires Jackie's confirmation before any author-facing communication.

### J Merrill Publishing
Primary trade imprint. Accepts adult fiction and non-fiction with broad commercial or cultural
appeal. Strongest fit for authors with a clear market platform, an established or emerging
readership, and a manuscript that is editorially ready or near-ready. Preferred genres include
literary fiction, narrative non-fiction, memoir, business/leadership, and personal development.
Mid-to-high editorial investment expected. Standard royalty and publishing agreement.
[Jackie: confirm genre list and investment expectation language]

### JM Works
General works imprint for titles that do not fit a specialist imprint but have merit for
publication. Broader submission latitude than J Merrill Publishing. Suitable for cross-genre
works, niche subject-matter non-fiction, or projects with a defined community audience rather
than mass-market appeal. Editorial investment is moderate.
[Jackie: confirm positioning and distinguish clearly from J Merrill Publishing]

### JM Little
Children's and young reader imprint. Accepts picture books, early reader, middle grade, and
young adult manuscripts. Illustration readiness is a relevant assessment dimension for picture
books and early reader submissions. Age appropriateness is a hard requirement — content
maturity must match the stated or apparent target age range. Editorial path may include
illustration coordination for illustrated works.
[Jackie: confirm age band boundaries and illustration coordination note]

### JM Verse
Poetry imprint. Accepts single-author collections, chapbooks, and hybrid prose-poetry works.
Form, prosody, and structural coherence are the primary assessment dimensions (poetryFormStructure
score). Market fit and commercial potential scores apply differently here — a strong voice and
formal control carry more weight than commercial potential alone. Scoring for non-applicable
dimensions (e.g. illustrationReadiness) should be set to 0.
[Jackie: confirm what score weight adjustments apply for JM Verse submissions]

### JM Signature
Curated premium imprint. Reserved for works of exceptional editorial quality, strong author
platform, or significant cultural or market moment. Requires signatureReviewRequired = true in
routing output. Jackie review is mandatory before any Signature consideration is discussed with
an author. The agent should not initiate Signature discussion — it should flag the work for
Signature consideration and route it for Jackie's determination.
[Jackie: confirm Signature eligibility criteria and confirm signatureReviewRequired trigger logic]

---

## 2. Stage 0 Scoring Rubric

All dimensions are scored 1–10. Score 0 means insufficient information to assess, or the
dimension does not apply to this submission type (see per-dimension notes). A score of 0 is
excluded from the averageScore calculation. Do not assign 0 simply because confidence is low
— assign the best-supported score and note confidence in other output fields.

### structureFlow (1–10)
Assesses the manuscript's organizational logic: chapter or section sequencing, pacing, narrative
or argumentative arc, and internal consistency of structure. A score of 8–10 indicates a
manuscript where structure actively supports the work's purpose. A score of 4–6 indicates
a discernible structure with notable gaps or inconsistencies. A score of 1–3 indicates
structural problems likely to require significant developmental editing.
[Jackie: confirm score band descriptions]

### voiceTone (1–10)
Assesses distinctiveness and consistency of the author's voice, and appropriateness of tone to
genre and audience. A score of 8–10 indicates a voice that is unmistakably the author's, with
consistent register. A score of 4–6 indicates a recognizable but inconsistent voice, or a voice
that does not yet fully serve the work. A score of 1–3 indicates a voice that is generic,
inconsistent, or inappropriate to genre.
[Jackie: confirm]

### clarityGrammar (1–10)
Assesses sentence-level clarity, grammatical correctness, and mechanics. A score of 8–10
indicates a manuscript that would require only light copyediting. A score of 4–6 indicates
moderate mechanical issues that are addressable in a standard edit pass. A score of 1–3
indicates pervasive issues that would require substantive rewriting.
[Jackie: confirm; also clarify whether AI-flagged grammar issues should be noted without quoting]

### marketFit (1–10)
Assesses alignment with current publishing market conditions, comparable title landscape, and
audience. A score of 8–10 indicates a submission with identifiable comps, a clear readership,
and a timely or enduring subject. A score of 4–6 indicates a submission with a plausible
market but limited differentiation or unclear audience. A score of 1–3 indicates weak market
alignment or an over-saturated category.
[Jackie: confirm]

### commercialPotential (1–10)
Assesses revenue potential, platform potential, and long-term commercial viability. Considers
series potential, format flexibility (audio, international rights), and author platform strength.
A score of 8–10 indicates a submission with strong commercial indicators across multiple
dimensions. A score of 4–6 indicates moderate commercial potential with notable gaps.
A score of 1–3 indicates limited commercial potential.
[Jackie: confirm; note whether author platform data from intake is available to the agent at runtime]

### originality (1–10)
Assesses freshness of concept, uniqueness of approach, or distinctiveness of perspective.
A score of 8–10 indicates a submission that offers something genuinely new within its genre
or category. A score of 4–6 indicates a solid submission in familiar territory without notable
differentiation. A score of 1–3 indicates a submission that closely follows established
formulas without adding distinctive value.
[Jackie: confirm]

### ethicsCompliance (1–10)
Assesses absence of ethical, legal, and compliance concerns. A score of 10 indicates no
detectable concerns. A score of 7–9 indicates minor concerns that require disclosure or
review but are not disqualifying. A score of 4–6 indicates moderate concerns that may require
legal review. A score of 1–3 indicates serious concerns that may trigger hardStopFlag.
AI content disclosure signals, defamation risk, third-party content without attribution, and
permissions gaps all reduce this score. See Section 6 for risk flag guidance.
[Jackie: confirm score-to-flag mapping]

### technicalFormatting (1–10)
Assesses manuscript preparation quality: formatting conventions, consistent use of style,
chapter/section delineation, front matter, and submission formatting. A score of 8–10
indicates a professionally prepared manuscript. A score of 4–6 indicates workable formatting
with notable inconsistencies. A score of 1–3 indicates formatting that would require significant
preparation before editorial processing.
[Jackie: confirm]

### ageAppropriateness (1–10)
Applies primarily to JM Little submissions. Assesses whether content maturity aligns with
the stated or apparent target age range. A score of 10 indicates perfect alignment. A score
of 1–3 indicates a material mismatch that may be a hard stop (e.g. adult content in a
children's submission). For non-JM Little submissions where age appropriateness is not
directly relevant, score this dimension 0.
[Jackie: confirm hard-stop threshold and confirm 0-scoring rule for non-children's submissions]

### illustrationReadiness (1–10)
Applies to JM Little illustrated works (picture books, early reader). Assesses whether the
manuscript has clear illustration notes, placeholder markers, or an indicated illustration
concept. A score of 8–10 indicates a manuscript that would translate cleanly to an illustrated
format. A score of 4–6 indicates partial illustration direction. A score of 1–3 indicates
no illustration guidance in a format that requires it. Score 0 for non-illustrated submissions.
[Jackie: confirm; clarify whether manuscripts without explicit illustration notes automatically score low]

### poetryFormStructure (1–10)
Applies to JM Verse submissions. Assesses prosodic control, form adherence (if applicable),
line and stanza integrity, and structural coherence across the collection or chapbook. A
score of 8–10 indicates a collection with strong formal control and a coherent organizing
principle. A score of 4–6 indicates a collection with variable quality or inconsistent formal
execution. A score of 1–3 indicates weak prosodic control or an incoherent collection.
Score 0 for non-poetry submissions.
[Jackie: confirm; address how to handle experimental/free verse submissions where "form adherence" is intentionally absent]

### averageScore
Arithmetic mean of all non-zero dimension scores. Calculated by the agent across the applicable
dimensions. This is a diagnostic signal only — it does not directly drive routing.
[Jackie: confirm whether averageScore should influence routing recommendations or remain informational]

---

## 3. Package Categories

Package category is an internal editorial classification, not a pricing commitment. The agent
returns a suggested category as a signal for Jackie's review. No package discussion with the
author may occur based on this output alone.

[Jackie: list internal package categories and the distinguishing criteria for each.
Example format — do not use these as final values:]

- **Standard** — [criteria]
- **Standard Plus** — [criteria]
- **Premium** — [criteria]
- **Signature** — [criteria; note: always requires signatureReviewRequired = true]
- **Poetry Collection** — [criteria; JM Verse-specific]
- **Illustrated** — [criteria; JM Little-specific]
- **null** — insufficient information to recommend a category

[Jackie: complete this section before activation. The agent will only return values from this list.]

---

## 4. Publishing Goal Interpretation

Authors self-report their publishing goal in the intake form. The agent uses this to inform
imprint alignment and editorial path recommendations — not to make commitments.

| Self-reported goal | Interpretation guidance |
|---|---|
| Wide release / traditional publishing | Prioritize J Merrill Publishing or JM Works; assess market fit and commercial potential carefully |
| Legacy / family history | JM Works or J Merrill Publishing depending on editorial quality; note niche audience |
| Academic / educational | Assess subject-matter rigor and intended audience; JM Works; flag if institutional context is relevant |
| Platform building / personal brand | Assess author platform signals; marketFit and commercialPotential weight increases |
| Community / niche audience | JM Works; market fit interpretation adjusts — a defined community readership is valid even if small |
| Children's / youth | JM Little; trigger ageAppropriateness and illustrationReadiness scoring |
| Poetry | JM Verse; trigger poetryFormStructure scoring; adjust score weighting per Section 2 |
| Unsure / not stated | Do not invent a goal; note the gap in diagnosticSummary; apply general scoring |

[Jackie: confirm these interpretations and add any self-reported goal categories from the intake form that are not listed above]

---

## 5. Editorial Path Definitions

The agent recommends an editorial path as part of the diagnostic. This is an internal routing
signal only — no editorial path is communicated to the author without Jackie's approval.

| Editorial path | Description | Typical fit |
|---|---|---|
| Standard | Full editorial process — developmental edit, line edit, copyedit, proofreading, production | Works with strong structural foundation; ready for editorial investment |
| Developmental First | Manuscript requires developmental editing before line/copy pass | Works with voice/concept potential but structural or clarity issues at 4–6 range |
| Co-Development | Collaborative development pass before formal editorial process | Emerging authors with strong concept but early-stage execution; [Jackie: confirm when Co-Development is offered] |
| Poetry | Specialized poetry editorial path via JM Verse | All JM Verse submissions |
| Illustrated | Editorial path includes illustration coordination | JM Little picture books and early reader works requiring illustration |
| Signature | Premium editorial path; requires separate Signature review and approval | JM Signature candidates flagged by the agent; not confirmed without Jackie |
| Hold — Not Ready | Work shows promise but requires author-side development before editorial investment | Lower scoring submissions where potential is visible but execution is not yet ready |
| Do Not Advance | Work does not meet minimum criteria for any current imprint or path | See hard-stop and minimum threshold guidance in Section 6 |

[Jackie: confirm path names, descriptions, and any paths not listed. Confirm what score thresholds, if any, should trigger each path recommendation.]

---

## 6. Risk Flag Guidance

Risk flags are boolean signals (or categorical for copyrightRiskLevel). They do not quote the
manuscript. They name the category of concern only. The agent must never reproduce manuscript
text in a risk flag or notes field.

### hardStopFlag
Set to true when the submission contains content that disqualifies it from further processing
without immediate human review. Hard stop conditions:
- Explicit content that is inappropriate for any current JM1 imprint and audience
- Content that appears to describe real individuals in a defamatory or harmful way with
  identifiable specificity
- Direct evidence of plagiarism or wholesale reproduction of copyrighted material
- Content presenting serious legal exposure that requires legal review before any further action
[Jackie: confirm hard stop conditions and add any not listed. When hardStopFlag = true, the
agent sets diagnosticStatus = "Hard Stop" and jackieReviewRequired = true.]

### ethicsFlag
Set to true when the submission raises an ethical concern that does not rise to a hard stop
but requires editorial judgment before advancement. Examples: insensitive cultural
representation, unacknowledged appropriation, framing concerns in memoir or narrative
non-fiction, content that may be harmful to a specific reader group.
[Jackie: confirm threshold — what distinguishes ethicsFlag from hardStopFlag in borderline cases]

### legalFlag
Set to true when the submission raises a legal concern requiring review: potential defamation,
privacy concerns (real individuals portrayed fictionally without indication of consent or
fictionalization), contractual red flags (author claims rights they may not hold).
[Jackie: confirm; also clarify whether legalFlag requires a human review hold before any further pipeline step]

### brandMisalignmentFlag
Set to true when the submission conflicts with JM1 Publishing's stated brand values or
editorial standards in a way that would make it unsuitable for any current imprint, even if
it does not reach a hard stop threshold.
[Jackie: define brand misalignment criteria]

### rightsConcernFlag
Set to true when the submission includes third-party content (lyrics, extended quotations,
illustrations, or other materials) where rights status is unclear and permissions may be
required before publication.
[Jackie: confirm threshold — short fair-use quotation vs. extended quotation requiring permission]

### thirdPartyContentDetected
Set to true when third-party content is present regardless of apparent rights status. This
is a detection signal, not a judgment. rightsConcernFlag may be false if content is clearly
within fair use; thirdPartyContentDetected remains true as a disclosure marker.
[Jackie: confirm this distinction]

### permissionsRequired
Set to true when the agent determines that one or more elements of the manuscript will require
permissions clearance before publication. Paired with rightsConcernNotes describing the category
of content — no manuscript excerpt in the notes field.
[Jackie: confirm]

### aiContentDisclosureNeeded
Set to true when the manuscript shows signals consistent with AI-generated content at a level
that may require disclosure under JM1 Publishing policy or emerging industry standards.
[Jackie: define disclosure threshold and JM1 Publishing policy on AI-generated content in submissions]

### defamationRiskFlag
Set to true when the submission contains characterizations of identifiable real individuals
in a manner that may constitute defamation. Distinct from legalFlag — both may be true
simultaneously for a high-risk submission.
[Jackie: confirm whether defamationRiskFlag + legalFlag together is a hard stop or requires
separate legal review without triggering hardStopFlag automatically]

### copyrightRiskLevel
Categorical: None Detected / Low / Medium / High.

| Level | Meaning |
|---|---|
| None Detected | No signals of copyright concern in the submitted sample |
| Low | Minor third-party references likely within fair use; no action required but flagged for awareness |
| Medium | Third-party content present at a level that warrants permissions review before publication |
| High | Significant copyright concern; may be a hard stop or legalFlag trigger depending on content |

[Jackie: confirm level definitions and whether High automatically triggers legalFlag]

### rightsConcernNotes
Free text notes field. Describes the category of concern — the type of content, not the
content itself. Must never contain manuscript excerpts.

---

## 7. Author Readiness Indicators

Author readiness is an editorial signal about the author's preparedness for the publishing
process — not a judgment of the author as a person. It informs how Jackie structures the
editorial conversation, not whether the work is accepted.

### authorReadinessScore (1–10)
Overall assessment of the author's apparent readiness for the editorial and publishing process,
based on intake metadata and manuscript preparation signals.

| Score range | Interpretation |
|---|---|
| 8–10 | Author appears well-prepared: clear publishing goal, professional manuscript preparation, realistic timeline and investment expectation signals |
| 5–7 | Author appears moderately prepared with some gaps in one or more readiness dimensions |
| 1–4 | Author signals suggest early-stage readiness; editorial conversation should set clear expectations |

[Jackie: confirm score bands and confirm what intake metadata fields the agent may use to assess this]

### authorInvestmentFit
Categorical assessment of whether the author's stated goals and apparent expectations are
aligned with what JM1 Publishing's process requires.

Allowed values:
- `Strong` — author's signals indicate clear alignment with the investment and process required
- `Moderate` — some alignment; gaps may require a clarifying conversation
- `Unclear` — insufficient information to assess; note in diagnosticSummary
- `Misaligned` — stated goals appear to conflict with what this imprint or path requires

[Jackie: confirm these values and whether Misaligned should trigger a routing note or human review flag]

### timelineFit
Assessment of whether the author's implied or stated timeline is compatible with JM1
Publishing's standard production schedule.

Allowed values:
- `Aligned` — stated or implied timeline is compatible with standard production
- `Accelerated` — author has indicated a timeline that may be shorter than standard; flag for editorial conversation
- `Flexible` — author has indicated flexibility; no constraint
- `Unclear` — no timeline information available

[Jackie: confirm these values and add any timeline indicators from the intake form]

---

## 8. Routing Rules

All Stage 0 diagnostics produced by the `jm1-prompt-pub-stage0-diagnostic` runner route
to Jackie review. No automatic advancement, no author-facing action, no opportunity
creation, no package discussion.

### diagnosticStatus allowed values

| Value | When to use |
|---|---|
| `Awaiting Jackie Review` | All cases that do not meet the Hard Stop condition |
| `Hard Stop` | hardStopFlag = true |

The value `Auto-Routed` must never be returned by this runner.

### jackieReviewRequired
Always `true`. No exceptions.

### autoRouted
Always `false`. No exceptions.

### humanReviewTrigger
Free text field describing the primary reason Jackie's review is needed. Required on all
results. Must characterize — must not quote the manuscript.

Example characterizations (not exhaustive):
- "Manuscript meets advancement criteria; confidence above threshold. Awaiting Jackie editorial decision."
- "Confidence below threshold; one or more dimensions scored below 5."
- "Risk flag present: [flag name]. Jackie review required before any pipeline step."
- "Hard stop condition detected: [category]. No further processing until Jackie clears."
- "Imprint alignment unclear; multiple imprints within range. Jackie to determine fit."

[Jackie: review and add any standard humanReviewTrigger phrases you want the agent to use]

### signatureReviewRequired
Set to `true` when the agent recommends JM Signature imprint consideration. This is an
additional routing flag — it does not replace jackieReviewRequired. When true, Jackie's
Signature review is required before any Signature conversation with the author.

---
```

---

## Governance Compliance Checklist

| Item | Status |
|---|---|
| No manuscript text in knowledge.md | Confirmed — this file contains editorial rules only |
| No secrets, keys, or tokens | Confirmed |
| No author PII | Confirmed |
| No pricing | Confirmed — package categories do not include pricing |
| Imprint definitions | Drafted — Jackie must confirm/revise |
| Scoring rubric (11 dimensions) | Drafted with score bands — Jackie must confirm |
| Package categories | Section 3 left as Jackie-complete — agent needs final values |
| Publishing goal interpretation | Drafted — Jackie must confirm and add missing goals |
| Editorial path definitions | Drafted — Jackie must confirm path names and thresholds |
| Risk flag guidance | All 9 flags drafted — Jackie must confirm thresholds |
| Author readiness indicators | Drafted — Jackie must confirm score bands and allowed values |
| Routing rules | Drafted — hard rules on no auto-routing, always Jackie review |

## Items Requiring Jackie's Input Before Finalization

1. **Package categories (Section 3)** — this section is intentionally left for Jackie to complete. The agent cannot return a suggestedPackageCategory until the valid values are defined here.
2. **Scoring score bands** — all score bands are drafted; Jackie should adjust any ranges that do not match editorial practice.
3. **Hard stop conditions** — confirm the listed hard stop triggers; add any not listed.
4. **aiContentDisclosureNeeded threshold** — JM1 Publishing policy on AI-generated content in submissions needs to be defined.
5. **brandMisalignmentFlag criteria** — specific brand values that would trigger misalignment flag.
6. **signatureReviewRequired trigger** — confirm the specific editorial signals that should prompt a Signature flag.
7. **humanReviewTrigger example phrases** — confirm or revise the standard phrases.

## After Jackie Approves

1. Finalize all `[Jackie: confirm/revise]` items.
2. Author the Package Categories section (Section 3) in full.
3. Increment version to `v1.0` in the file header.
4. Upload to `stjm1diagrunner/knowledge/knowledge.md` (overwriting the `v0.1-draft` skeleton).
5. Record the upload timestamp and SHA-256 hash in `int-pub-005-stage0-diagnostic-knowledge-grounding.md`.
6. This PR is the review record — merge constitutes Jackie's approval of the content.

## Related Documents

- [`docs/operations/int-pub-005-stage0-diagnostic-knowledge-grounding.md`](./int-pub-005-stage0-diagnostic-knowledge-grounding.md) — governed location, access pattern, versioning rules
- [`docs/operations/int-pub-005-stage0-diagnostic-prompt-governance-review.md`](./int-pub-005-stage0-diagnostic-prompt-governance-review.md) — prompt body review (system prompt references knowledge.md)
- [`docs/operations/int-pub-005-stage0-diagnostic-ai-activation-decision-record.md`](./int-pub-005-stage0-diagnostic-ai-activation-decision-record.md) — Section 6 (Grounding Dependencies), Section 15 (checklist)
