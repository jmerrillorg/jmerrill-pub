# INT-PUB-005 Stage 0 Diagnostic — `knowledge.md` Content Review

## Purpose

This document is the editorial content review artifact for Jackie. It presents the full proposed
content for `knowledge.md` — the AI grounding file for the Stage 0 Diagnostic prompt
`jm1-prompt-pub-stage0-diagnostic`.

**The blob at `stjm1diagrunner/knowledge/knowledge.md` must not be overwritten until Jackie
approves the content below.**

Source documents used for this draft: `JMP_Product_Reference_Guide_v1_1.docx` and
`JMP_Full_Catalog_v2_1.docx` (both May 2026, v2.1/v1.1 canon, Internal Use Only).

Items marked `[Jackie: confirm]` require Jackie's explicit sign-off before the file is finalized.
Items marked `[Jackie: revise]` are plausible drafts that may need adjustment.
Items with no marker are directly sourced from the reference documents.

After Jackie approves:
1. Finalize all `[Jackie: confirm/revise]` items.
2. Increment version to `v1.0` in the file header.
3. Upload to `stjm1diagrunner/knowledge/knowledge.md` (overwriting the `v0.1-draft` skeleton).
4. Record the upload timestamp and SHA-256 hash in `int-pub-005-stage0-diagnostic-knowledge-grounding.md`.
5. Merge this PR as the approval record.

---

## Proposed `knowledge.md` Content

```markdown
# JM1 Publishing — Stage 0 Diagnostic Knowledge Base

**Governed grounding file for:** Stage 0 Editorial Diagnostic AI (`jm1-agent-pub-diagnostic-01`)
**Prompt template:** `jm1-prompt-pub-stage0-diagnostic` / `PUB-STAGE0-DIAGNOSTIC-V1`
**Version:** v1.0
**Status:** Active — approved by Jackie [date to be filled at upload]
**Source:** JMP_Product_Reference_Guide_v1_1.docx + JMP_Full_Catalog_v2_1.docx (May 2026)

---

## 1. Imprint Definitions

Canon imprint names effective May 2026 (CANON-CERT-001). All prior legacy names are retired.
Use only these canonical names in all output fields.

### J Merrill Publishing
Formerly: J Merrill Faith (legacy — retired)
AI content cap: 5%
Focus: Flagship faith imprint. Pastoral voice, Christian testimony, devotional writing, ministry
leadership, and faith-based nonfiction. This is J Merrill Publishing's primary and most
established imprint. Authors are typically ministry leaders, pastors, faith community voices,
or authors with a strong faith platform.
Fit signals: Faith-integrated theme or message, pastoral or testimony voice, church/ministry
distribution channel, devotional or Bible study expansion potential.
[Jackie: confirm fit signals and add any genre nuances not captured above]

### JM Works
Formerly: J Merrill Voices (legacy — retired)
AI content cap: 15%
Focus: General trade nonfiction imprint. Self-help, memoir, health, how-to, and practical
nonfiction. Broader submission latitude than J Merrill Publishing. Suited for authors with
a defined audience and practical or personal subject matter that does not require a faith
frame but is consistent with JM1 values.
Fit signals: Practical or instructional nonfiction, personal memoir, health/wellness subject
matter, defined community or professional audience.
[Jackie: confirm whether JM Works also accepts commercial fiction or is nonfiction-only]

### JM Little
Formerly: J Merrill Kids (legacy — retired)
AI content cap: 10%
Focus: Children's imprint. Picture books, early reader, and illustrated manuscripts. Author
must supply illustrations (JMP-PKG-CHILD) or elect illustration services (JMP-CHILD-ILLUS).
Age appropriateness is a hard diagnostic requirement — content maturity must match the stated
or apparent target audience age range. Illustration readiness is assessed for all submissions.
Fit signals: Target audience is children or young readers; manuscript is written in a register
appropriate to the stated age range; author has art supplied or is prepared to commission it.
[Jackie: confirm age band boundaries for JM Little (picture book / early reader / middle grade)]

### JM Verse
Formerly: J Merrill Lit (legacy — retired)
AI content cap: 5%
Focus: Poetry and literary imprint. Single-author collections, chapbooks, and hybrid
prose-poetry works. Prosodic control and structural coherence across the collection are the
primary assessment dimensions. Commercial potential is weighted less heavily than formal and
artistic quality for this imprint.
Fit signals: Verse collection or chapbook; strong formal control or intentional experimental
form; coherent organizing principle across the collection; author's voice is the work.
[Jackie: confirm whether JM Verse accepts literary fiction in addition to poetry]

### JM Signature
No legacy name.
AI content cap: 0%
Focus: Prestige reserve imprint. Publisher-invited only. Dual authorization required before
any Signature commitment is made to an author. This imprint is not available through standard
intake routing. The diagnostic agent must not recommend JM Signature as a primary imprint —
it must flag the work for Signature consideration and set `signatureReviewRequired = true`.
No AI-generated content may appear in any Signature title.
Fit signals: Exceptional editorial quality AND significant author platform or cultural moment;
would represent a flagship publishing investment; cannot be confirmed by the AI agent alone.
[Jackie: confirm dual authorization requirement — who are the two authorizers?]

---

## 2. Stage 0 Scoring Rubric

All dimensions scored 1–10. Score 0 = insufficient information to assess, or dimension does
not apply to this submission type (see per-dimension notes). Score 0 is excluded from the
averageScore calculation. Assign the best-supported score at the available evidence level —
do not default to 0 on uncertainty alone; use confidence qualifiers in other output fields.

### structureFlow (1–10)
Organizational logic of the manuscript: chapter or section sequencing, pacing, narrative or
argumentative arc, and internal consistency.
8–10: Structure actively serves the work; sequencing is clear and purposeful.
4–7: Discernible structure with notable gaps, pacing issues, or inconsistencies.
1–3: Structural problems likely requiring significant developmental editing.
[Jackie: confirm band descriptions]

### voiceTone (1–10)
Distinctiveness and consistency of the author's voice; appropriateness of tone to genre,
imprint, and audience.
8–10: Unmistakably the author's voice; consistent register; tone fully serves the work.
4–7: Recognizable but inconsistent voice, or voice not yet fully serving the work.
1–3: Generic, inconsistent, or inappropriate to genre or stated audience.
[Jackie: confirm]

### clarityGrammar (1–10)
Sentence-level clarity, grammatical correctness, and mechanics.
8–10: Would require only light copyediting; clear and well-constructed.
4–7: Moderate mechanical issues; addressable in a standard edit pass.
1–3: Pervasive issues requiring substantive rewriting at the sentence level.
[Jackie: confirm; note that AI must characterize the level of concern without quoting examples]

### marketFit (1–10)
Alignment with current publishing market, comparable titles, and audience.
8–10: Clear comps, identifiable readership, timely or enduring subject.
4–7: Plausible market; limited differentiation or unclear audience.
1–3: Weak market alignment or over-saturated category with no distinguishing approach.
[Jackie: confirm; note that J Merrill Publishing's faith market and JM Works' trade nonfiction market should be evaluated separately]

### commercialPotential (1–10)
Revenue potential, platform potential, format flexibility (audio, hardcover, series), and
long-term commercial viability. Includes author platform strength as a signal.
8–10: Strong commercial indicators across multiple dimensions; clear revenue path.
4–7: Moderate commercial potential; notable gaps in one or more dimensions.
1–3: Limited commercial potential as assessed from the available submission data.
[Jackie: confirm; note whether author platform data from intake is available to the agent]

### originality (1–10)
Freshness of concept, uniqueness of approach, or distinctiveness of perspective within the
submission's genre or category.
8–10: Offers something genuinely new within its genre; distinctive perspective.
4–7: Solid submission in familiar territory; limited differentiation.
1–3: Closely follows established formulas without adding distinctive value.
[Jackie: confirm]

### ethicsCompliance (1–10)
Absence of ethical, legal, and compliance concerns detectable from the submission sample.
10: No detectable concerns.
7–9: Minor concerns that require disclosure or review but are not disqualifying.
4–6: Moderate concerns that may require editorial or legal review before advancement.
1–3: Serious concerns; may trigger hardStopFlag. See Section 6.
AI content disclosure signals, defamation risk, third-party content, and permissions gaps
all reduce this score.
[Jackie: confirm score-to-flag threshold mapping in Section 6]

### technicalFormatting (1–10)
Manuscript preparation quality: formatting conventions, consistent style application,
chapter/section delineation, and submission formatting standards.
8–10: Professionally prepared; would require only minor pre-production cleanup.
4–7: Workable formatting with notable inconsistencies.
1–3: Formatting that would require significant preparation before editorial processing.
[Jackie: confirm]

### ageAppropriateness (1–10)
Applies to JM Little submissions. Content maturity versus stated or apparent target age range.
10: Perfect alignment; content is fully appropriate for the stated age group.
7–9: Minor content considerations; addressable editorially.
4–6: Material mismatch requiring significant revision.
1–3: Serious mismatch that may be a hard stop. Score 1 for adult content in a children's
submission — this triggers hardStopFlag.
For non-JM Little submissions where age appropriateness is not directly relevant, score 0.
[Jackie: confirm hard-stop threshold; confirm 0-score rule for non-children's submissions]

### illustrationReadiness (1–10)
Applies to JM Little illustrated works. Whether the manuscript has clear illustration notes,
placeholder markers, or an indicated illustration concept suitable for the JM Little package.
8–10: Manuscript translates cleanly to illustrated format; illustration direction is clear.
4–7: Partial illustration direction; gaps that would need to be resolved with the author.
1–3: No illustration guidance in a format that requires it.
Score 0 for non-illustrated submissions.
[Jackie: confirm; clarify whether absence of illustration notes is expected for picture books at submission stage]

### poetryFormStructure (1–10)
Applies to JM Verse submissions. Prosodic control, form adherence (where applicable), line and
stanza integrity, and structural coherence across the collection or chapbook.
8–10: Strong formal control and a coherent organizing principle across the work.
4–7: Variable quality or inconsistent formal execution.
1–3: Weak prosodic control or an incoherent collection structure.
For experimental or free verse submissions, evaluate structural coherence and intentionality
of form choices rather than adherence to traditional form. Score 0 for non-poetry submissions.
[Jackie: confirm free verse / experimental poetry handling]

### averageScore
Arithmetic mean of all non-zero dimension scores. Calculated across applicable dimensions
for this submission type. Informational diagnostic signal — does not directly drive routing.
[Jackie: confirm whether averageScore should inform routing threshold recommendations]

---

## 3. Package Categories

Package category is an internal editorial classification. The agent returns `suggestedPackageCategory`
as an advisory signal for Jackie's review — not a commitment or a price quotation.
No package discussion with the author may occur based on this output alone.

The agent must return one of the following values or `null`:

| suggestedPackageCategory | SKU | Word count | Best fit |
|---|---|---|---|
| `Starter` | JMP-PKG-STARTER | ≤50,000 words | First-time authors with a mostly clean manuscript; lighter editorial investment needed |
| `Professional` | JMP-PKG-PRO | ≤75,000 words | Authors seeking stronger editorial polish and market positioning; manuscript has strong foundation |
| `Signature` | JMP-PKG-SIGNATURE | ≤100,000 words | Legacy authors, ministry leaders, authors investing in long-term platform; highest editorial investment |
| `Children's` | JMP-PKG-CHILD | N/A | JM Little submissions; author supplies illustrations or will commission them |
| `null` | — | — | Insufficient information to recommend a category; Jackie to determine |

Note on JM Signature imprint vs. Signature package: `JMP-PKG-SIGNATURE` is a publishing
package available to any qualifying author. `JM Signature` imprint is publisher-invited only
with dual authorization. A work recommended for the Signature package does not automatically
qualify for the JM Signature imprint. Set `signatureReviewRequired = true` only for imprint
consideration, not package selection.

[Jackie: confirm these four package categories are the correct values for the agent to return.
Add any additional package categories not listed above.]

---

## 4. Publishing Goal Interpretation

Authors self-report their publishing goal in the intake form. The agent uses this to inform
imprint alignment and editorial path recommendations — not to make commitments.

| Self-reported goal | Interpretation guidance |
|---|---|
| Faith-based / ministry / church | J Merrill Publishing primary; assess pastoral voice and faith integration |
| Wide release / traditional publishing | Assess across all applicable imprints; weight marketFit and commercialPotential |
| Legacy / family history / memoir | JM Works primary (if secular memoir); J Merrill Publishing if faith-integrated |
| Health, self-help, how-to | JM Works primary; assess practical value and defined audience |
| Platform building / personal brand | Assess author platform signals; commercialPotential weight increases |
| Children's / youth / family | JM Little; trigger ageAppropriateness and illustrationReadiness scoring |
| Poetry / literary | JM Verse; trigger poetryFormStructure scoring; adjust score weighting |
| Devotional / Bible study / curriculum | J Merrill Publishing; flag devotional/curriculum expansion potential in diagnosticSummary |
| Unsure / not stated | Note the gap in diagnosticSummary; do not invent a goal; apply general scoring |

[Jackie: review and confirm; add any self-reported goal categories from the intake form not listed above]

---

## 5. Editorial Path Definitions

Editorial path is an internal routing signal. No editorial path is communicated to the author
without Jackie's explicit approval.

| Editorial path | When to recommend | Notes |
|---|---|---|
| `Standard` | Manuscript is editorially ready or near-ready; strong foundation | Full editorial process included in publishing package |
| `Developmental First` | Voice or concept has potential but structural or clarity issues score 4–6 | Developmental edit needed before standard editorial pass |
| `Children's` | JM Little submission | Specialized children's editorial path; includes illustration coordination |
| `Poetry` | JM Verse submission | Specialized poetry editorial path; poetryFormStructure is primary dimension |
| `Signature Review` | Exceptional work potentially suited to JM Signature imprint | Must set `signatureReviewRequired = true`; Jackie determines imprint |
| `Hold — Not Ready` | Work shows promise but needs author-side development | Author needs to revise before editorial investment is appropriate |
| `Do Not Advance` | Work does not meet minimum criteria for any current imprint or path | See hard stop and minimum threshold guidance in Section 6 |

[Jackie: confirm path names, descriptions, and thresholds. Add Co-Development or other paths if used.]

---

## 6. Risk Flag Guidance

Risk flags name the category of concern only. The agent must never reproduce manuscript text
in a risk flag or notes field. No quotation, no excerpt, no verbatim passage.

### hardStopFlag
Set true when the submission contains content that disqualifies it from further processing
without immediate human review. When true: set `diagnosticStatus = "Hard Stop"`.

Hard stop conditions:
- Explicit sexual content inappropriate for any current JM1 imprint and audience
- Content identifying real individuals in a defamatory or harmful way with specificity
- Direct evidence of wholesale plagiarism or reproduction of copyrighted material
- Content presenting legal exposure requiring legal review before any further action
- Adult content in a children's submission (ageAppropriateness score = 1–2)
[Jackie: confirm list; add any JM-specific hard stop conditions]

### ethicsFlag
Set true when the submission raises an ethical concern that does not rise to a hard stop but
requires editorial judgment before advancement. Examples: insensitive cultural representation,
unacknowledged appropriation, framing concerns in memoir or narrative nonfiction, content
that may be harmful to a reader group.
[Jackie: confirm threshold]

### legalFlag
Set true when the submission raises a legal concern: potential defamation, privacy concerns
(real individuals portrayed fictionally), contractual red flags (author claims rights they
may not hold). When true, flag for legal review before any further pipeline step.
[Jackie: confirm; note whether legalFlag alone requires a hold before any next step]

### brandMisalignmentFlag
Set true when the submission conflicts with JM1 Publishing values in a way that would make
it unsuitable for any current imprint, even if it does not reach a hard stop threshold.
JM1 Publishing is a faith-aligned publisher. Content that is anti-faith, explicitly secular
in a way that conflicts with J Merrill Publishing's pastoral identity, or that conflicts with
stated JM1 brand values should trigger this flag.
[Jackie: define additional brand misalignment criteria beyond the faith-alignment note above]

### rightsConcernFlag
Set true when the submission includes third-party content (lyrics, extended quotations,
illustrations, or other materials) where rights status is unclear and permissions may be
required before publication. See JMP-RIGHTS-MINISTRY and JMP-RIGHTS-CATALOG for context.
[Jackie: confirm fair-use threshold for short quotation vs. extended quotation requiring permissions]

### thirdPartyContentDetected
Set true when third-party content is present regardless of apparent rights status.
Detection signal only — not a judgment. `rightsConcernFlag` may remain false if content
appears clearly within fair use; `thirdPartyContentDetected` stays true as a disclosure marker.

### permissionsRequired
Set true when one or more elements will require permissions clearance before publication.
Pair with `rightsConcernNotes` — describe the category of content, not the content itself.

### aiContentDisclosureNeeded
Set true when the manuscript shows signals consistent with AI-generated content at a level
that may require disclosure. JM Signature imprint has a 0% AI content cap — flag any AI
content signals in Signature-adjacent submissions. J Merrill Publishing and JM Verse caps
are 5%; JM Works cap is 15%; JM Little cap is 10%.
[Jackie: define disclosure threshold and confirm how AI cap percentages should influence flagging]

### defamationRiskFlag
Set true when characterizations of identifiable real individuals may constitute defamation.
Distinct from `legalFlag` — both may be true simultaneously for a high-risk submission.
[Jackie: confirm whether defamationRiskFlag + legalFlag together constitutes an automatic hard stop]

### copyrightRiskLevel
Categorical: `None Detected` / `Low` / `Medium` / `High`.

| Level | Meaning |
|---|---|
| None Detected | No signals of copyright concern in the submitted sample |
| Low | Minor third-party references likely within fair use; no action required; flagged for awareness |
| Medium | Third-party content present at a level warranting permissions review before publication |
| High | Significant copyright concern; likely triggers `legalFlag` and may trigger `hardStopFlag` |

[Jackie: confirm level definitions; confirm whether High automatically triggers legalFlag]

### rightsConcernNotes
Free text. Describes the category of concern — the type of content, not the content itself.
Must never contain manuscript excerpts. Example: "Extended lyric quotation present — permissions
review needed before publication." Never: the actual lyrics.

---

## 7. Author Readiness Indicators

Author readiness is an editorial signal about preparedness for the publishing process.
It informs how Jackie structures the editorial conversation — not whether the work is accepted.

### authorReadinessScore (1–10)
Overall readiness for the editorial and publishing process based on intake metadata and
manuscript preparation signals.

| Score | Interpretation |
|---|---|
| 8–10 | Well-prepared: clear publishing goal, professional manuscript preparation, realistic expectations |
| 5–7 | Moderately prepared; gaps in one or more readiness dimensions |
| 1–4 | Early-stage readiness; editorial conversation should set clear expectations |

[Jackie: confirm score bands; confirm what intake metadata fields the agent may use to assess this]

### authorInvestmentFit
Categorical alignment of author's stated goals and expectations with what the publishing
process requires.

| Value | Meaning |
|---|---|
| `Strong` | Author's signals align clearly with the investment and process required |
| `Moderate` | Some alignment; gaps may require a clarifying conversation |
| `Unclear` | Insufficient information to assess |
| `Misaligned` | Stated goals appear to conflict with what the imprint or path requires |

[Jackie: confirm values; confirm whether Misaligned triggers a routing note or human review flag]

### timelineFit
Compatibility of author's implied or stated timeline with JM1 Publishing's production schedule.
Reference delivery timelines: Starter 8–10 weeks; Pro 10–12 weeks; Signature 12–14 weeks;
audiobook +2–3 weeks; rush production available via JMP-OPS-RUSH (+25%).

| Value | Meaning |
|---|---|
| `Aligned` | Stated or implied timeline is compatible with standard production |
| `Accelerated` | Author has indicated a shorter timeline; flag for editorial conversation about rush options |
| `Flexible` | Author has indicated flexibility; no constraint |
| `Unclear` | No timeline information available |

[Jackie: confirm values; add any additional timeline signals from the intake form]

---

## 8. Routing Rules

All Stage 0 diagnostics from the `jm1-prompt-pub-stage0-diagnostic` runner route to Jackie
review. No automatic advancement. No author-facing action. No Opportunity creation.
No package discussion with the author.

### diagnosticStatus allowed values

| Value | When to use |
|---|---|
| `Awaiting Jackie Review` | All cases that do not meet the Hard Stop condition |
| `Hard Stop` | `hardStopFlag = true` |

The value `Auto-Routed` must never be returned by this runner.

### jackieReviewRequired
Always `true`. No exceptions.

### autoRouted
Always `false`. No exceptions.

### humanReviewTrigger
Required on all results. Characterize the primary reason for Jackie's review — do not quote
the manuscript. Standard phrases:

- "Manuscript meets Stage 0 advancement criteria; confidence above threshold. Awaiting Jackie editorial determination."
- "Confidence below threshold in one or more dimensions. Jackie review required before any advancement."
- "Risk flag present: [flag name]. Jackie review required before any pipeline step."
- "Hard stop condition detected: [category]. No further processing until Jackie clears."
- "Imprint alignment is ambiguous; multiple imprints are within range. Jackie to determine fit."
- "JM Signature consideration flagged. Dual authorization required. No Signature commitment may be made without Jackie's explicit approval."
- "Work is JM Little submission; age appropriateness and illustration readiness flagged for Jackie's review."

[Jackie: review and add any standard humanReviewTrigger phrases you want the agent to use consistently]

### signatureReviewRequired
Set `true` when the agent identifies signals consistent with JM Signature imprint consideration.
This is an additional routing flag alongside `jackieReviewRequired = true`. When `true`, Jackie's
Signature review (including dual authorization) is required before any Signature conversation
with the author. JM Signature has a 0% AI content cap — any AI content signals in a
Signature-adjacent submission must be noted in `rightsConcernNotes` or `humanReviewTrigger`.

---

## Governance

- This file is the canonical grounding dependency for `jm1-prompt-pub-stage0-diagnostic`.
- Changes require Jackie approval before the updated file is uploaded to the governed container.
- Version must be incremented on any substantive change.
- The version in use at the time of any AI execution is recorded in `jm1_airequestlog`.
- This file must not contain manuscript text, author PII, secrets, keys, or pricing.
- Source documents: JMP_Product_Reference_Guide_v1_1.docx + JMP_Full_Catalog_v2_1.docx (May 2026).
```

---

## Governance Compliance Checklist

| Item | Status |
|---|---|
| No manuscript text | Confirmed |
| No secrets, keys, or tokens | Confirmed |
| No author PII | Confirmed |
| No pricing | Confirmed — package categories reference SKUs only, no dollar amounts |
| Sourced from governed documents | Confirmed — Reference Guide v1.1 + Full Catalog v2.1 (May 2026) |
| Imprint definitions | Complete — all 5 imprints with canon names, AI caps, focus descriptions |
| Scoring rubric (11 dimensions) | Complete with score bands — Jackie confirm |
| Package categories | **Complete** — 4 values + null, sourced from active SKUs |
| Publishing goal interpretation | Complete — 9 rows; Jackie to add any missing goals |
| Editorial path definitions | Complete — 7 paths; Jackie to confirm and add paths |
| Risk flag guidance | All 9 flags — hard stop conditions and AI cap thresholds drafted |
| Author readiness indicators | Complete with delivery timeline references from Reference Guide |
| Routing rules | Complete — hard rules in place; humanReviewTrigger phrases drafted |

## Key Changes From Prior Draft

| Section | What changed |
|---|---|
| Imprint definitions | **J Merrill Publishing corrected to faith imprint** (formerly J Merrill Faith) — prior draft incorrectly described it as general trade. JM Works is the general trade imprint. |
| Imprint AI caps | Added from Reference Guide: JM Publishing 5%, JM Works 15%, JM Little 10%, JM Verse 5%, JM Signature 0% |
| Package categories | **Section now complete** — sourced from active SKUs: Starter / Professional / Signature / Children's / null |
| Timeline references | Delivery timelines added to `timelineFit` from Reference Guide specs |
| brandMisalignmentFlag | Clarified that JM1 is faith-aligned; anti-faith content is a misalignment signal |
| aiContentDisclosureNeeded | AI caps per imprint now referenced; JM Signature 0% cap highlighted for diagnostic use |
| signatureReviewRequired | Clarified dual authorization requirement; JM Signature is not available through standard intake routing |

## Remaining Items Requiring Jackie's Input

1. **Imprint fit signals** — all 5 imprint descriptions end with `[Jackie: confirm]` for genre nuances not in the reference docs (e.g. whether JM Works accepts fiction, JM Verse accepts literary fiction, JM Little age band boundaries).
2. **Hard stop conditions** — listed conditions need Jackie's confirmation; add any JMP-specific conditions not captured.
3. **brandMisalignmentFlag criteria** — faith-alignment note drafted; Jackie to confirm and add any additional brand values.
4. **aiContentDisclosureNeeded threshold** — AI caps are documented; Jackie to confirm how the diagnostic agent should express percentage-based concerns in a flagging context.
5. **Scoring score bands** — all drafted from common editorial practice; Jackie should adjust any that don't match how she evaluates manuscripts.
6. **humanReviewTrigger phrases** — drafted as standard phrases; Jackie to add or revise.
7. **defamationRiskFlag + legalFlag** — whether both together constitutes an automatic hard stop.
8. **Dual authorization for JM Signature** — confirm who the two authorizers are.

## Related Documents

- [`docs/operations/int-pub-005-stage0-diagnostic-knowledge-grounding.md`](./int-pub-005-stage0-diagnostic-knowledge-grounding.md)
- [`docs/operations/int-pub-005-stage0-diagnostic-prompt-governance-review.md`](./int-pub-005-stage0-diagnostic-prompt-governance-review.md)
- [`docs/operations/int-pub-005-stage0-diagnostic-ai-activation-decision-record.md`](./int-pub-005-stage0-diagnostic-ai-activation-decision-record.md)
