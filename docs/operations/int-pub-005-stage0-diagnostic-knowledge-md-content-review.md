# INT-PUB-005 Stage 0 Diagnostic — `knowledge.md` Content Review

## Purpose

This document is the editorial content review artifact for the Stage 0 Diagnostic prompt
`jm1-prompt-pub-stage0-diagnostic`. It presents the full approved and proposed content for
`knowledge.md` — the AI grounding file stored at `stjm1diagrunner/knowledge/knowledge.md`.

**All `[Jackie: confirm]` markers are resolved. Blob may be finalized after Jackie approves this PR.**

Source documents: `JMP_Product_Reference_Guide_v1_1.docx` and `JMP_Full_Catalog_v2_1.docx`
(May 2026, v2.1/v1.1 canon, Internal Use Only).

Jackie's governance rulings applied in this revision (2026-06-16 — pass 1):
- Scoring scale: canonical 1–5 (not 1–10). All band descriptions converted.
- JM Signature dual authorization: BP-07 — two deliberate Jackie actions, not two people.
- Hard stops: grounded on filed knowledge.md Section 4 table. Author conduct/suitability
  demoted to human-review flag.
- Brand misalignment: Jackie's approved language applied verbatim.
- AI caps: confirmed as canon; treated as internal review thresholds, advisory-only framing.
- humanReviewTrigger: closed enum of 11 approved phrases. Freeform triggers disallowed.
- Legal/defamation routing: High risk = Hard Stop. Low/moderate = Needs Manual Review.
- Legacy exclusion: stated as a rule in Section 8, not only as a trigger phrase.
- Imprint fit, package categories, publishing goals: confirmed as canon.

Jackie's governance rulings applied in this revision (2026-06-16 — pass 2, final):
- JM Works scope: confirmed — commercial fiction + general trade nonfiction (not nonfiction-only).
- JM Little age bands: Picture Book 0–8, Early Reader 5–9, Middle Grade 8–12. YA → Jackie review.
- JM Verse scope: poetry-first. Literary fiction routes to JM Works unless substantially verse-driven.
- Editorial path thresholds: Developmental First = averageScore 3.0–4.1; Hold = below 3.0.
  Co-Development is a human-review path only — not automatic routing.
- Ethics/hard-stop borderline: borderline = human-review flag; hard stop = clear material unresolved risk.
- Fair-use / rights threshold: diagnostic must not decide fair use. Meaningful third-party
  content always triggers rightsConcernFlag. Short ordinary references unflagged unless central/unclear.
- authorInvestmentFit = Misaligned: always emit humanReviewTrigger = "Suitability concern requires Jackie review".
- timelineFit values: confirmed (Aligned / Accelerated / Flexible / Unclear) + timeline signal list.

All [Jackie: confirm] markers are resolved. The blob may now be finalized after Jackie approves this PR.

After all markers are resolved:
1. Remove all remaining `[Jackie: confirm]` markers.
2. Set version to `v1.0` in the file header.
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

Imprint assignment at Stage 0 is advisory only. The diagnostic agent signals the most likely
imprint fit based on submission data. Jackie confirms the final imprint after human review.
No imprint is committed to the author based on a diagnostic result alone.

### J Merrill Publishing
Formerly: J Merrill Faith (legacy — retired)
AI content cap: 5% (internal review threshold — see Section 6)
Focus: Flagship faith imprint. Pastoral voice, Christian testimony, devotional writing, ministry
leadership, and faith-based nonfiction. This is J Merrill Publishing's primary and most
established imprint. Authors are typically ministry leaders, pastors, faith community voices,
or authors with a strong faith platform.
Fit signals: Faith-integrated theme or message, pastoral or testimony voice, church/ministry
distribution channel, devotional or Bible study expansion potential.

### JM Works
Formerly: J Merrill Voices (legacy — retired)
AI content cap: 15% (internal review threshold — see Section 6)
Focus: General trade imprint — commercial fiction and general trade nonfiction. JM Works
is not nonfiction-only. It accepts self-help, memoir, health, how-to, practical nonfiction,
commercial fiction, and broad-reader trade work that does not belong in the faith, children's,
poetry, or Signature lanes. Broader submission latitude than J Merrill Publishing. Content
does not require a faith frame but must be compatible with JM1 values and care standard.
Fit signals: Practical or instructional nonfiction, personal memoir, health/wellness subject
matter, commercial fiction, defined community or professional audience.

### JM Little
Formerly: J Merrill Kids (legacy — retired)
AI content cap: 10% (internal review threshold — see Section 6)
Focus: Children's imprint. Picture books, early reader, and middle grade illustrated
manuscripts. Author must supply illustrations (JMP-PKG-CHILD) or elect illustration services
(JMP-CHILD-ILLUS). Age appropriateness is a hard diagnostic requirement — content maturity
must match the stated or apparent target audience age range. Illustration readiness is assessed
for all submissions.

Age bands:
- Picture Book: ages 0–8
- Early Reader: ages 5–9
- Middle Grade: ages 8–12

YA (Young Adult) is not JM Little by default — route YA submissions to Jackie review via
`humanReviewTrigger = "Imprint fit requires Jackie review"`.

Fit signals: Target audience is children (ages 0–12); manuscript register is appropriate to
the stated age band; author has art supplied or is prepared to commission it.

### JM Verse
Formerly: J Merrill Lit (legacy — retired)
AI content cap: 5% (internal review threshold — see Section 6)
Focus: Poetry-first imprint. JM Verse is not a general literary-fiction imprint. It accepts
single-author poetry collections, chapbooks, spoken-word and verse projects, reflective poetic
prose, and hybrid verse works where the verse or poetry dimension is central. Prosodic control
and structural coherence across the collection are the primary assessment dimensions.
Commercial potential is weighted less heavily than formal and artistic quality for this imprint.
Literary fiction should route to JM Works unless the manuscript is substantially verse- or
poetry-driven.
Fit signals: Verse collection or chapbook; poetry-driven hybrid form; spoken-word project;
strong formal control or intentional experimental form; coherent organizing principle across
the collection; author's voice is the work.

### JM Signature
No legacy name.
AI content cap: 0% (no AI-generated content may appear in any Signature title)
Focus: Prestige reserve imprint. Publisher-invited only. JM Signature requires two deliberate
Jackie actions per BP-07: (1) final imprint set to JM Signature, and (2) Signature
dual-authorization confirmation set separately. This is not Jackie plus a second person —
it is two distinct deliberate authorizations by Jackie. This imprint is not available through
standard intake routing. The diagnostic agent must not recommend JM Signature as a primary
imprint — it must flag the work for Signature consideration and set `signatureReviewRequired = true`.
No AI-generated content may appear in any Signature title.
Fit signals: Exceptional editorial quality AND significant author platform or cultural moment;
would represent a flagship publishing investment; cannot be confirmed by the AI agent alone.

---

## 2. Stage 0 Scoring Rubric

All dimensions scored 1–5. Score 0 = insufficient information to assess, or dimension does
not apply to this submission type (see per-dimension notes). Score 0 is excluded from the
averageScore calculation. Assign the best-supported score at the available evidence level —
do not default to 0 on uncertainty alone.

Canonical scale:
5 = strong / ready
4 = promising / minor review
3 = moderate / developmental review
2 = weak / significant concern
1 = poor / not ready
0 = insufficient information / not applicable

### structureFlow (1–5)
Organizational logic of the manuscript: chapter or section sequencing, pacing, narrative or
argumentative arc, and internal consistency.
5: Structure actively serves the work; sequencing is clear and purposeful.
4: Discernible structure with minor gaps or pacing issues.
3: Moderate structural issues; developmental review recommended.
2: Significant structural problems likely requiring substantive developmental editing.
1: Fundamental structural concerns; not ready for editorial process.

### voiceTone (1–5)
Distinctiveness and consistency of the author's voice; appropriateness of tone to genre,
imprint, and audience.
5: Unmistakably the author's voice; consistent register; tone fully serves the work.
4: Distinctive voice with minor inconsistencies.
3: Recognizable but inconsistent voice, or voice not yet fully serving the work.
2: Voice is generic or inconsistent in ways requiring significant editorial attention.
1: No discernible author voice; inappropriate to genre or stated audience.

### clarityGrammar (1–5)
Sentence-level clarity, grammatical correctness, and mechanics.
5: Would require only light copyediting; clear and well-constructed.
4: Minor mechanical issues; addressable in a standard edit pass.
3: Moderate mechanical issues; copyedit pass required.
2: Pervasive issues requiring substantive rewriting at the sentence level.
1: Severe mechanical concerns throughout; not ready for editorial process.
Note: AI must characterize the level of concern without quoting manuscript examples.

### marketFit (1–5)
Alignment with current publishing market, comparable titles, and audience.
5: Clear comps, identifiable readership, timely or enduring subject.
4: Plausible market with some differentiation; audience is identifiable.
3: Plausible market; limited differentiation or unclear audience definition.
2: Weak market alignment; limited audience identification.
1: No identifiable market or audience; over-saturated category with no distinguishing approach.
Note: J Merrill Publishing's faith market and JM Works' trade nonfiction market are evaluated
on their respective standards — not interchangeably.

### commercialPotential (1–5)
Revenue potential, platform potential, format flexibility (audio, hardcover, series), and
long-term commercial viability. Includes author platform strength as a signal.
5: Strong commercial indicators across multiple dimensions; clear revenue path.
4: Solid commercial potential with minor gaps.
3: Moderate commercial potential; notable gaps in one or more dimensions.
2: Limited commercial potential as assessed from the available submission data.
1: Minimal commercial indicators.

### originality (1–5)
Freshness of concept, uniqueness of approach, or distinctiveness of perspective within the
submission's genre or category.
5: Offers something genuinely new within its genre; distinctive perspective.
4: Solid submission with a distinguishing angle.
3: Solid submission in familiar territory; limited differentiation.
2: Closely follows established formulas with little distinctive value.
1: Derivative; no distinguishing approach.

### ethicsCompliance (1–5)
Absence of ethical, legal, and compliance concerns detectable from the submission sample.
5: No detectable concerns.
4: Minor concerns that require disclosure or awareness but are not disqualifying.
3: Moderate concerns requiring editorial review before advancement; flag appropriate.
2: Significant concerns requiring legal or editorial review; risk flags should be set.
1: Serious concerns within hard-stop criteria. See Section 4.
Note: This score informs flag-setting — it does not replace flag logic in Section 6.

### technicalFormatting (1–5)
Manuscript preparation quality: formatting conventions, consistent style application,
chapter/section delineation, and submission formatting standards.
5: Professionally prepared; would require only minor pre-production cleanup.
4: Well-prepared with minor inconsistencies.
3: Workable formatting with notable inconsistencies.
2: Significant formatting issues requiring substantial preparation.
1: Formatting not meeting minimum submission standards.

### ageAppropriateness (1–5)
Applies to JM Little submissions. Content maturity versus stated or apparent target age range.
5: Perfect alignment; content is fully appropriate for the stated age group.
4: Age-appropriate with minor content considerations; addressable editorially.
3: Some content maturity concerns requiring review.
2: Material mismatch requiring significant revision before this imprint is appropriate.
1: Serious mismatch — adult content in a children's submission. Score 1 triggers hardStopFlag.
Score 0 for non-JM Little submissions where this dimension does not apply.

### illustrationReadiness (1–5)
Applies to JM Little illustrated works. Whether the manuscript has clear illustration notes,
placeholder markers, or an indicated illustration concept suitable for the JM Little package.
5: Manuscript translates cleanly to illustrated format; illustration direction is clear.
4: Illustration direction present with minor gaps.
3: Partial illustration direction; gaps that would need to be resolved with the author.
2: Minimal illustration guidance in a format that requires it.
1: No illustration guidance present.
Score 0 for non-illustrated submissions.

### poetryFormStructure (1–5)
Applies to JM Verse submissions. Prosodic control, form adherence (where applicable), line and
stanza integrity, and structural coherence across the collection or chapbook.
5: Strong formal control and a coherent organizing principle across the work.
4: Strong form with minor inconsistencies.
3: Variable quality or inconsistent formal execution.
2: Weak prosodic control or limited collection coherence.
1: Incoherent collection structure; prosodic control not demonstrated.
For experimental or free verse submissions, evaluate structural coherence and intentionality
of form choices rather than adherence to traditional form.
Score 0 for non-poetry submissions.

### averageScore
Arithmetic mean of all non-zero dimension scores, calculated across applicable dimensions
for this submission type. Informational diagnostic signal — does not directly drive routing.

---

## 3. Package Categories

Package category is an internal editorial classification. The agent returns `suggestedPackageCategory`
as an advisory signal for Jackie's review — not a commitment or a price quotation.
No package discussion with the author may occur based on this output alone.

The agent must return one of the following values or `null`:

| suggestedPackageCategory | SKU | Word count | Best fit |
|---|---|---|---|
| `Starter` | JMP-PKG-STARTER | ≤50,000 words | First-time authors with a mostly clean manuscript; lighter editorial investment |
| `Professional` | JMP-PKG-PRO | ≤75,000 words | Authors seeking stronger editorial polish and market positioning |
| `Premier` | JMP-PKG-PREMIER | Large and/or complex manuscripts; approximately 140,000+ words is a signal, not a sole determinant | Manuscripts requiring substantially greater editorial and production effort |
| `Children's` | JMP-PKG-CHILD | N/A | JM Little submissions; author supplies or commissions illustrations |
| `null` | — | — | Insufficient information to recommend a category; Jackie to determine |

Note on JM Signature imprint vs. Premier package: `JMP-PKG-PREMIER` is a publishing
package available to any qualifying author. `JM Signature` imprint is publisher-invited only
with dual authorization per BP-07. A work recommended for the Premier package does not
automatically qualify for the JM Signature imprint. Set `signatureReviewRequired = true` only
for imprint consideration, not for Premier package selection.

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

---

## 5. Editorial Path Definitions

Editorial path is an internal routing signal. No editorial path is communicated to the author
without Jackie's explicit approval.

| Editorial path | When to recommend | Notes |
|---|---|---|
| `Standard` | Manuscript is editorially ready or near-ready (structureFlow ≥ 4) | Full editorial process included in publishing package |
| `Developmental First` | averageScore 3.0–4.1, OR strong concept with craft/structure/clarity/editorial-development gaps | Developmental edit needed before standard editorial pass |
| `Children's` | JM Little submission | Specialized children's editorial path; includes illustration coordination |
| `Poetry` | JM Verse submission | Specialized poetry editorial path; poetryFormStructure is primary dimension |
| `Signature Review` | Exceptional work with signals consistent with JM Signature imprint | Must set `signatureReviewRequired = true`; BP-07 dual authorization required |
| `Hold — Not Ready` | averageScore below 3.0, OR missing manuscript readiness / unclear rights / incomplete core intake data / insufficient context for responsible advancement | Use `humanReviewTrigger = "Editorial path requires manual review"` |
| `Do Not Advance` | Work does not meet minimum criteria for any current imprint or path | See Section 4 (hard-stop table); diagnostic holds and routes — does not reject |
| `Co-Development` | Human-review path only — not automatic routing | Jackie assigns Co-Development after reviewing the diagnostic; the agent must not set this path directly |

---

## 6. Risk Flag Guidance

Risk flags name the category of concern only. The agent must never reproduce manuscript text
in a risk flag or notes field. No quotation, no excerpt, no verbatim passage.

The diagnostic does not reject submissions. It holds and routes for human review.

### hardStopFlag
Grounded on the filed knowledge.md Section 4 hard-stop table. Set true when the submission
contains content that disqualifies it from further automated processing and requires immediate
human review before any pipeline step. When true: set `diagnosticStatus = "Hard Stop"`.

Hard-stop conditions (from filed Section 4):
- Explicit sexual content incompatible with any current JM1 imprint and audience
- Content identifying real individuals in a defamatory or harmful way with sufficient specificity
  to constitute a legal risk requiring review — HIGH legal/defamation risk only (see legalFlag)
- Direct evidence of wholesale reproduction of copyrighted material at a level that presents
  serious legal exposure
- Adult content in a children's submission (ageAppropriateness = 1)

Note: Author conduct, author expectations, or author suitability concerns are NOT automated
hard stops. Route these via `humanReviewTrigger = "Suitability concern requires Jackie review"`.
These require human judgment, not automated blocking.

### ethicsFlag
Set true when the submission raises an ethical concern that does not rise to a hard stop but
requires editorial judgment before advancement. Examples: insensitive cultural representation,
unacknowledged appropriation, framing concerns in memoir or narrative nonfiction, content that
may be harmful to a reader group.

Borderline threshold: a borderline ethics concern is a human-review flag (`ethicsFlag = true`),
not an automated hard stop. A hard stop applies only when there is a clear, material, unresolved
ethical/legal/rights/reputational risk that JMP should not advance without Jackie's explicit
clearance. When in doubt, set `ethicsFlag = true` and route for human review — do not set
`hardStopFlag` on ambiguity alone.

### legalFlag
Set true when the submission raises a legal concern.

Routing by severity:
- HIGH legal or defamation risk: set `hardStopFlag = true` AND `legalFlag = true`.
  Set `diagnosticStatus = "Hard Stop"`. Do not advance until Jackie clears.
- LOW or MODERATE legal concern: set `legalFlag = true` only. Do not set `hardStopFlag`.
  Use `humanReviewTrigger = "Legal or defamation concern"`.

The diagnostic holds and routes — it does not reject.

### defamationRiskFlag
Set true when characterizations of identifiable real individuals may constitute defamation.
Distinct from `legalFlag` — both are typically set simultaneously for defamation concerns.

Routing by severity mirrors legalFlag:
- HIGH defamation risk: set `hardStopFlag = true`, `defamationRiskFlag = true`, `legalFlag = true`.
- LOW or MODERATE: set `defamationRiskFlag = true` and `legalFlag = true` without `hardStopFlag`.
  Use `humanReviewTrigger = "Legal or defamation concern"`.

### brandMisalignmentFlag
Set true when the work conflicts with JMP's family-centered, faith-aware, integrity-first
publishing posture, or would reasonably harm the trust JMP has built with authors, readers,
ministry/community partners, or distribution partners.

Clarification: Not every title must be faith-based; every title must be compatible with JMP's
values and care standard. Content does not need a faith theme to be published under JM Works
or JM Little. But content that conflicts with JMP's posture or would damage partner trust
triggers this flag regardless of imprint.

### rightsConcernFlag
Set true when the submission includes third-party content where rights status is unclear
and permissions may be required before publication.

The diagnostic must not decide fair use. When meaningful third-party content is detected,
set `rightsConcernFlag = true` and route for review. The following always trigger this flag:
- Lyrics (song lyrics, hymns, musical works)
- Poetry by other authors
- Scripture-heavy use beyond incidental reference
- Extended excerpts or quoted material central to the work
- Images, illustrations, or branded material with unclear licensing
- Any third-party content where repetition, centrality, or volume suggests it may require clearance

Short ordinary references (a title, a name, a brief passing quotation) may be left unflagged
unless they are repeated, central to the argument, or the rights status is unclear. When in
doubt, set `thirdPartyContentDetected = true` and add a note in `rightsConcernNotes`.

### thirdPartyContentDetected
Set true when third-party content is present regardless of apparent rights status.
Detection signal only — not a judgment. `rightsConcernFlag` may remain false if content
appears clearly within fair use; `thirdPartyContentDetected` stays true as a disclosure marker.

### permissionsRequired
Set true when one or more elements will require permissions clearance before publication.
Pair with `rightsConcernNotes` — describe the category of content, not the content itself.

### aiContentDisclosureNeeded
Set true when submission data or manuscript signals are consistent with AI-generated content
at a level that may require author disclosure.

AI content caps per imprint are internal review thresholds — they are not automatic rejection
criteria. When an AI-use signal is present, the diagnostic labels it advisory-only. The
diagnostic does not factually detect AI authorship — it signals that author-disclosed AI use
may need to be reviewed against the applicable imprint cap.

| Imprint | AI content cap (internal threshold) |
|---|---|
| JM Signature | 0% — any signal triggers this flag and `signatureReviewRequired` |
| J Merrill Publishing | 5% |
| JM Verse | 5% |
| JM Little | 10% |
| JM Works | 15% |

Use `humanReviewTrigger = "AI disclosure concern"` whenever this flag is set.
Prefer language such as: "Submission signals may be consistent with AI-generated content;
author disclosure status should be confirmed before further review."

### copyrightRiskLevel
Categorical: `None Detected` / `Low` / `Medium` / `High`.

| Level | Meaning |
|---|---|
| None Detected | No signals of copyright concern in the submitted sample |
| Low | Minor third-party references likely within fair use; no action required; flagged for awareness |
| Medium | Third-party content present at a level warranting permissions review before publication |
| High | Significant copyright concern — set `legalFlag = true`; assess whether `hardStopFlag` applies |

### rightsConcernNotes
Free text. Describes the category of concern — the type of content, not the content itself.
Must never contain manuscript excerpts.
Example: "Extended lyric quotation present — permissions review needed before publication."

---

## 7. Author Readiness Indicators

Author readiness is an editorial signal about preparedness for the publishing process.
It informs how Jackie structures the editorial conversation — not whether the work is accepted.

### authorReadinessScore (1–5)
Overall readiness for the editorial and publishing process based on intake metadata and
manuscript preparation signals. Uses the canonical 1–5 scale.

| Score | Interpretation |
|---|---|
| 5 | Well-prepared: clear publishing goal, professional manuscript preparation, realistic expectations |
| 4 | Mostly prepared; minor gaps in one readiness dimension |
| 3 | Moderately prepared; gaps in one or more readiness dimensions |
| 2 | Early-stage readiness in multiple areas; editorial conversation should set clear expectations |
| 1 | Significant readiness concerns across multiple dimensions |

### authorInvestmentFit
Categorical alignment of author's stated goals and expectations with what the publishing
process requires.

| Value | Meaning |
|---|---|
| `Strong` | Author's signals align clearly with the investment and process required |
| `Moderate` | Some alignment; gaps may require a clarifying conversation |
| `Unclear` | Insufficient information to assess |
| `Misaligned` | Stated goals appear to conflict with what the imprint or path requires |

When `authorInvestmentFit = Misaligned`, always emit:
`humanReviewTrigger = "Suitability concern requires Jackie review"`

No separate routing note is required unless the `diagnosticSummary` needs a brief
characterization of the nature of the misalignment (without quoting the author).

### timelineFit
Compatibility of author's implied or stated timeline with JM1 Publishing's production schedule.
Reference delivery timelines: Starter 8–10 weeks; Pro 10–12 weeks; Premier 12–16 weeks;
audiobook +2–3 weeks; rush production available via JMP-OPS-RUSH (+25%).

| Value | Meaning |
|---|---|
| `Aligned` | Stated or implied timeline is compatible with standard production |
| `Accelerated` | Author has indicated a shorter timeline; flag for editorial conversation about rush options |
| `Flexible` | Author has indicated flexibility; no constraint |
| `Unclear` | No timeline information available |

These four values are confirmed. Timeline signals the agent may use to assess this field:
- Desired release date (explicit or implied)
- Urgency language in the intake form
- Manuscript readiness signals (a complete manuscript ready now vs. still in progress)
- Launch, event, or ministry deadline references
- Seasonal or holiday timing references
- Whether the expected timeline appears realistic given the applicable package and editorial path

---

## 8. Routing Rules

All Stage 0 diagnostics from the `jm1-prompt-pub-stage0-diagnostic` runner route to Jackie
review. No automatic advancement. No author-facing action. No Opportunity creation.
No package discussion with the author.

### Legacy-Exclusion Rule

Legacy-flagged intakes cannot enter the INT-PUB-005 Stage 0 Diagnostic Runner path.

If a Legacy flag or Legacy route designation is detected on the Publishing Intake or Editorial
Diagnostic record before execution, diagnostic execution must remain Deferred or blocked with
a safe internal note. No Legacy manuscript may be processed by this runner unless a separate
governed Legacy diagnostic path is approved by Jackie and documented in a separate activation
contract.

The Legacy-exclusion check is a pre-flight rule — it occurs before any manuscript read or AI
call. If triggered at runtime, set `diagnosticStatus = "Awaiting Jackie Review"` and use
`humanReviewTrigger = "Legacy-exclusion check required"`.

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
Required on all results. The diagnostic may only emit the following approved trigger phrases.
Freeform trigger reasons are not permitted. If multiple triggers apply, emit the highest-priority
one (Hard Stop conditions take priority over advisory flags).

Approved trigger phrases (closed enum):

- `Manuscript asset requires Jackie review`
- `Imprint fit requires Jackie review`
- `Rights or permissions concern`
- `Legal or defamation concern`
- `AI disclosure concern`
- `JM Signature eligibility requires dual authorization`
- `Package fit unclear`
- `Author readiness concern`
- `Editorial path requires manual review`
- `Legacy-exclusion check required`
- `Suitability concern requires Jackie review`

Note: "Suitability concern requires Jackie review" is the correct trigger for author conduct,
author expectations, or author suitability concerns. These are human-review flags — they are
not automated hard stops and must not set `hardStopFlag = true`.

### signatureReviewRequired
Set `true` when the agent identifies signals consistent with JM Signature imprint consideration.
This is an additional routing flag alongside `jackieReviewRequired = true`.

Per BP-07, JM Signature requires two deliberate Jackie actions:
1. Final imprint set to JM Signature.
2. Signature dual-authorization confirmation set separately.

This is not Jackie plus a second person — it is two distinct deliberate authorizations by
Jackie. No Signature conversation may be initiated with the author until both actions are
complete. JM Signature has a 0% AI content cap — any AI-use signals in a Signature-adjacent
submission must trigger `aiContentDisclosureNeeded = true` in addition to `signatureReviewRequired = true`.

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
| No pricing | Confirmed — package categories reference SKUs only |
| Sourced from governed documents | Confirmed — Reference Guide v1.1 + Full Catalog v2.1 (May 2026) |
| Scoring scale | **1–5 canonical scale applied throughout** |
| JM Signature dual authorization | **BP-07 — two deliberate Jackie actions** |
| Hard stops | **Grounded on filed Section 4 table; author conduct/suitability demoted** |
| Brand misalignment | **Jackie's approved language applied verbatim** |
| AI caps | **Confirmed as canon; advisory-only framing; not automatic rejection** |
| humanReviewTrigger | **Closed enum of 11 approved phrases** |
| Legal/defamation routing | **High = Hard Stop; Low/moderate = Needs Manual Review** |
| Legacy exclusion | **Stated as a rule in Section 8** |
| Imprint fit advisory | **Confirmed — advisory only at Stage 0** |
| Package categories | **Confirmed** |
| Publishing goals | **Confirmed** |

## Marker Count

| | Count |
|---|---|
| `[Jackie: confirm]` markers before pass 1 | 32 |
| `[Jackie: confirm]` markers after pass 1 | 8 |
| `[Jackie: confirm]` markers after pass 2 (this revision) | **0** |
| Total markers resolved across both passes | 32 |

## Remaining `[Jackie: confirm]` Items

None. All markers resolved.

## Governance Rulings Applied

### Pass 1 (2026-06-16)

| Ruling | Applied |
|---|---|
| Scoring scale: 1–5 canonical | Yes — all 11 dimensions and authorReadinessScore converted from 1–10 to 1–5 |
| JM Signature dual auth: BP-07, two Jackie actions | Yes — imprint definition and signatureReviewRequired section updated |
| Hard stops: grounded on filed Section 4; author conduct/suitability demoted | Yes — hardStopFlag section rewritten; suitability concern moved to humanReviewTrigger enum |
| Brand misalignment: Jackie's approved language | Yes — verbatim text applied |
| AI caps: advisory framing, author-disclosed language | Yes — aiContentDisclosureNeeded rewritten with advisory framing |
| humanReviewTrigger: closed enum | Yes — 11 approved phrases; freeform triggers disallowed |
| Legal/defamation routing: High = Hard Stop; Low/moderate = Needs Manual Review | Yes — legalFlag and defamationRiskFlag sections updated |
| Legacy exclusion: state as a rule | Yes — Section 8 legacy rule added |
| Imprint fit: confirmed as advisory | Yes — Section 1 preamble added |
| Package categories: confirmed | Yes — marker removed |
| Publishing goals: confirmed | Yes — marker removed |

### Pass 2 (2026-06-16) — Final

| Ruling | Applied |
|---|---|
| JM Works scope: commercial fiction + general trade nonfiction | Yes — imprint definition rewritten |
| JM Little age bands: 0–8 / 5–9 / 8–12; YA → Jackie review | Yes — age bands added; YA routing note added |
| JM Verse: poetry-first; literary fiction → JM Works unless verse-driven | Yes — imprint definition updated |
| Editorial path thresholds: Developmental First 3.0–4.1; Hold below 3.0; Co-Development human-review only | Yes — table updated with canonical 1–5 averages and Co-Development row |
| Ethics borderline = human-review flag; hard stop = clear material unresolved risk | Yes — ethicsFlag section updated |
| Fair-use threshold: diagnostic must not decide fair use; meaningful content always flags | Yes — rightsConcernFlag section rewritten |
| authorInvestmentFit Misaligned: always emit Suitability concern trigger | Yes — trigger rule stated explicitly |
| timelineFit: confirmed values + timeline signal list | Yes — signal list added |

## Related Documents

- [`docs/operations/int-pub-005-stage0-diagnostic-knowledge-grounding.md`](./int-pub-005-stage0-diagnostic-knowledge-grounding.md)
- [`docs/operations/int-pub-005-stage0-diagnostic-prompt-governance-review.md`](./int-pub-005-stage0-diagnostic-prompt-governance-review.md)
- [`docs/operations/int-pub-005-stage0-diagnostic-ai-activation-decision-record.md`](./int-pub-005-stage0-diagnostic-ai-activation-decision-record.md)
