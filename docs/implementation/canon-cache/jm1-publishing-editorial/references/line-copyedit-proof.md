# JMP Line Editing, Copyediting & Proofreading — Reference

**Status:** CANON — approved by Jackie Smith, Jr., June 2026
**Approval rulings:** calibration block (§1.3) confirmed as written; deity pronoun house default (§2.3.4) ruled CAPITALIZE when author states no preference
**Version:** 1.0 (replaces three stubs)
**Source doctrine:** Damaged copyedit, Ch. 24–38 + Epilogue (street-lit
voice preservation; CMOS compliance without voice erasure) · Kimberly
Reeder line edit, Ch. 1–5 (first-time author line editing experience) ·
Crowley (CMOS application to faith/inspirational nonfiction) · Author
Journey v1.0a CANON J3 doctrine · developmental-editing.md v1.0 CANON

---

# PART 0 — SHARED DOCTRINE (ALL THREE STAGES)

## 0.1 The governing principle: compliance without erasure *(Damaged doctrine)*

CMOS — or the style guide determined at Editorial Review — governs
**mechanics**. It does not standardize **voice**. The entire discipline of
these three stages lives in that distinction:

- **Mechanics** (style guide territory): punctuation logic, capitalization
  conventions, number style, citation format, spelling consistency,
  document formatting.
- **Voice** (author territory): dialect, cadence, idiom, syntax rhythm,
  intentional fragments, register shifts, vocabulary, repetition used for
  effect.

**The test for every edit:** is this an unintentional error, or an
intentional choice? Errors are corrected. Choices are preserved — and
standardized for *internal consistency with the author's own usage*, not
against the dictionary. When intent is ambiguous, query; never assume
error.

## 0.2 Stage sequence and inheritance

```
Line Editing → Copyediting → Proofreading
```

- Line editing operates after developmental editing is complete, or when
  Editorial Review confirms structure is sound (Line + Copyediting
  pathway: avg ≥ 4.2, no major flags).
- The **style guide determination from Editorial Review is the governing
  default** for all three stages unless overridden in writing by the
  Publisher. Mixed or conflicting styles are flagged, never silently
  resolved.
- The **voice profile** (built at developmental stage where that stage
  ran; built at line-edit start otherwise) travels downstream — every
  stage tests its work against it.
- The **style sheet** (built at copyedit — §2.5) travels to proofreading
  and to production. Proofreading does not relitigate copyedit decisions.

## 0.3 Visible edits

All work is delivered with changes visible (tracked changes in Word —
Microsoft-first). Where editorial material is *added* (a transition, a
clarifying phrase), the developmental convention applies: additions
italicized; in passages with existing authorial italics, the JMP standard
mechanism is brackets wrapping the italicized addition — `[*like this*]`
(developmental-editing.md §2.3 CANON). The edit letter declares the
convention.

## 0.4 Query discipline

- Queries are questions, not instructions: "Is the shift to present tense
  here intentional? It works if so — confirming before I touch anything."
- One query per issue *pattern*, not per instance — flag the pattern,
  list locations, let the author rule once.
- The author's ruling is final on their own book and is recorded on the
  style sheet so it never has to be re-asked downstream.

## 0.5 First-time author standards *(Reeder doctrine — applies at every stage)*

The developmental-editing.md §5 communication standards extend to these
stages in full: explain the why, no unexplained jargon, lead with what's
working, volume-controlled action lists, family-standard tone, proactive
process transparency. Stage-specific applications appear in each part
below.

## 0.6 Internal overlays

The three JM1 overlays (Faith & Inspirational, Urban/Street-Lit Voice
Preservation, Children's Book Standard) operationalize most heavily at
these stages. They are **internal-only — never named or referenced in
author-facing materials**. The author experiences the overlay as an editor
who respects their voice; they never see the doctrine document.

---

# PART 1 — LINE EDITING

## 1.1 Role

Line editing addresses sentence-level clarity, rhythm, word choice, and
prose style. It is the stage where an editor is most tempted to substitute
their own ear for the author's — which makes voice discipline most
critical here.

**Entry conditions:** developmental complete (or structure confirmed
sound); package scope includes line editing; payment current; voice
profile on hand or built now.

**Boundary:** line editing does not restructure (developmental territory)
and does not chase mechanical consistency (copyedit territory). A line
editor who finds a structural problem flags it; if significant, the
manuscript routes back rather than being patched at sentence level.

## 1.2 What line editing does

1. **Clarity** — sentences that make the reader work for the wrong
   reasons: ambiguous referents, buried subjects, tangled modifiers.
2. **Rhythm** — within the author's own cadence. The fix for a clunky
   sentence in a staccato voice is a better staccato sentence, not a
   flowing one.
3. **Word choice** — precision and register *as the author defines
   register*. Elevating diction the author kept deliberately plain is
   voice erasure.
4. **Redundancy and throat-clearing** — cuts proposed, not imposed;
   repetition is queried before cut, because repetition is a rhetorical
   device in many voices (pulpit cadence in faith nonfiction, refrain in
   street-lit narration).
5. **Continuity of tone** — flag drift the author didn't intend; preserve
   shifts they did.

## 1.3 Calibration pass *(Reeder doctrine, Ch. 1–5)*

Before line editing the full manuscript, edit an **opening calibration
block** (the first chapters — typically 1–5 or the first ~10–15% of the
manuscript) and deliver it for author review with a short note explaining
the editing approach taken.

Purpose: the author sees exactly what line editing means on *their* prose
before the whole book is touched. They confirm the hand is right, or
correct it while correction is cheap. For first-time authors this pass is
**mandatory**; for returning authors it may be waived at their request.

The approved calibration sets the editing register for the remainder —
logged as `LineEditCalibrationApproved`.

## 1.4 First-time author application

- Pattern teaching, gently: when the author has a recurring tic, one
  margin note names the pattern, explains its effect on the reader, and
  marks instances — the author learns their own prose rather than
  receiving 200 identical corrections.
- Never let tracked-changes density read as failure. The edit letter
  states plainly that heavy markup is normal and says what it means.
- Celebrate sentences. When a line lands, say so in the margin — an
  author should finish reviewing a line edit knowing what their best
  writing looks like.

## 1.5 Line edit deliverables

1. Line-edited manuscript (tracked changes; additions per §0.3 convention)
2. Edit letter: approach taken, voice-profile notes, pattern summary,
   open queries
3. Query list (consolidated, pattern-grouped)
4. Handoff note to copyediting: voice rulings made, rhythm conventions
   established, items deliberately left for copyedit

**Log events:** `LineEditStarted` · `LineEditCalibrationApproved` ·
`VoiceFlagRaised` (as applicable) · `EditorialStageComplete (Line)`

---

# PART 2 — COPYEDITING

## 2.1 Role

Copyediting addresses grammar, punctuation, spelling, consistency, and
style guide compliance. It operates after line editing is complete.

This is the stage where the Damaged doctrine was forged: a copyeditor
applying CMOS mechanically to street-lit prose would destroy the book
while making every individual edit defensible. The doctrine below exists
so that never happens.

## 2.2 The voice/mechanics rulebook *(Damaged doctrine, Ch. 24–38 + Epilogue)*

**Dialogue: maximum voice latitude.** Dialogue is character speech.
Grammar inside quotation marks belongs to the character, not to CMOS.
Copyedit corrects only: unintentional spelling errors (vs. intentional
dialect spellings), punctuation *of* the dialogue (comma-before-close,
quotation mark logic — mechanics), and inconsistency in a character's own
established speech pattern.

**Voice-driven narration: near-dialogue latitude.** First-person and
close-third narration written in a vernacular voice (street-lit, regional,
generational) is a sustained performance, not lapsed formality. Preserved:
nonstandard verb forms used consistently, intentional fragments, dialect
vocabulary and spellings, syntax that carries cadence, profanity and slang
as written. Corrected: mechanics that don't carry voice (its/it's,
homophone errors, quotation punctuation, paragraph logic) and
*inconsistency within the voice itself*.

**Consistency means consistency with the author's own system.** If a
dialect spelling appears three ways, the copyeditor standardizes to the
author's dominant form (or queries which they prefer) — never to the
dictionary form. The style sheet records every such ruling.

**The dignity rule.** Vernacular voice is craft, not error. No query, edit
letter, or margin note may frame dialect, AAVE, or street idiom as a
deficiency to be tolerated. The Urban/Street-Lit Voice Preservation
overlay governs internally; the author simply experiences an editor who
gets it.

## 2.3 Faith & inspirational application *(Crowley doctrine)*

CMOS application to faith/inspirational nonfiction carries specific
rulings, coordinated with Scripture Display Governance:

1. **Scripture quotation:** KJV is the JMP/AIC standard. Quoted scripture
   is verified against KJV wording — scripture is never "corrected" to
   modern grammar. Translator-supplied italics are preserved exactly.
2. **LORD/GOD:** small caps in styled outputs; ALL CAPS in plain-text
   contexts.
3. **Scripture citation format:** book-chapter:verse per CMOS
   (e.g., John 3:16); abbreviation style chosen once and recorded on the
   style sheet; version cited on first quotation or in front matter.
4. **Deity pronoun capitalization:** CMOS and KJV both lowercase deity
   pronouns; many faith authors capitalize as an act of reverence. **The
   author's preference rules** — established at copyedit start, recorded
   on the style sheet, applied with total consistency. **JMP house
   default when the author states no preference: capitalize.** (Ruled by
   Jackie, June 2026 — JMP's imprint base is faith-forward; a lowercase
   default would require correction on most manuscripts JMP publishes.
   Capitalize-unless-author-objects is the operationally correct house
   default.)
5. **Church/theological capitalization:** CMOS conventions (church vs.
   the Church, biblical lowercase, Bible capitalized) unless author
   preference is established and recorded.
6. **Pulpit cadence:** sermonic repetition, call-and-response rhythm, and
   direct address ("Beloved, hear me") are voice, not redundancy. The
   Faith & Inspirational overlay governs internally.

## 2.4 Children's application (JM Little)

- Vocabulary and sentence-length checks against the target reading
  level / Lexile band established at Editorial Review.
- Read-aloud test: picture book and early reader text is checked for
  oral rhythm — these books are performed by parents, not just read.
- Any content sensitivity issue surfaced at copyedit = hard stop,
  escalate immediately (knowledge.md Section 4 — no exceptions).

## 2.5 The style sheet (mandatory deliverable)

Built during copyedit; travels to proofreading and production. Contains:

1. Style guide + edition (e.g., CMOS 18) and all deviations authorized
2. Word list: spellings, hyphenation rulings, capitalization rulings
3. Character/name register (people, places, invented terms) with
   established spellings
4. Dialect and voice rulings (the author's system, standardized)
5. Scripture conventions (version, citation format, deity pronoun ruling)
6. Numbers, dates, time conventions
7. Punctuation rulings (serial comma, em-dash style, ellipsis style)
8. Author query rulings — every decision, so nothing is re-asked

For series titles, the style sheet extends the volume-1 sheet and the
continuity ledger (developmental-editing.md §4) — never starts fresh.

## 2.6 JM Verse application

The poet's established form overrides CMOS conventions for line breaks,
capitalization, punctuation, and spacing — these are craft decisions.
Copyediting in poetry confines itself to: unintentional spelling errors
(queried, never assumed), consistency within the poet's own system, and
front/back matter mechanics. When in doubt, everything is a choice.

## 2.7 Copyedit deliverables

1. Copyedited manuscript (tracked changes)
2. Style sheet (§2.5)
3. Edit letter: rulings made, conventions applied, query summary
4. Consolidated query list

**Log events:** `CopyeditStarted` · `StyleSheetCreated` ·
`VoiceFlagRaised` (as applicable) · `EditorialStageComplete (Copyedit)`

---

# PART 3 — PROOFREADING

## 3.1 Role

Proofreading is the final quality check before layout or publication. It
addresses typographical errors, formatting inconsistencies, and
production-ready compliance. It is conservative by design.

**Entry conditions:** copyedit complete and author-accepted; style sheet
in hand. Proofreading **against the style sheet** — the proofreader
enforces recorded rulings and does not reopen them.

**Editorial floor note:** professional proofread is the minimum standard
for any book carrying the "Produced by J Merrill Publishing, Inc." credit
(including JM Legacy Editions work — Legacy Tier Specifications CANON).

## 3.2 Pre-layout proof (manuscript proof)

- Residual typos, doubled words, missing words
- Style-sheet compliance sweep (spellings, hyphenation, caps as ruled)
- Scripture quotations: final KJV wording verification; LORD/GOD
  treatment correct for output format; translator italics intact
- Cross-reference integrity (chapter references, "see page" placeholders
  flagged for layout)
- Front/back matter completeness against package scope

## 3.3 Post-layout proof (page proof)

- Typographic: widows/orphans, bad breaks, hyphenation stacks, rivers
- Running heads/feet, page numbers, folio logic
- TOC entries and page numbers match the laid-out book
- Chapter openers consistent; drop caps/ornaments per design spec
- Image/caption placement and numbering (JM Little: text/illustration
  pairing verified spread by spread)
- ISBN, copyright page, CIP block accuracy (against ISBN Master Register
  assignment)
- Cover/interior consistency: title, subtitle, author name identical in
  every location

## 3.4 Change discipline at proof stage

Proof-stage changes are minimal and conservative — errors only, never
preference. Any change that would reflow text is weighed against
production impact and flagged to production before being made. **No voice
queries exist at proof stage**; a voice-level concern discovered this late
is escalated as a flag, not edited.

## 3.5 Proofreading deliverables

1. Proofed manuscript or marked page proofs
2. Proof report: corrections made, items escalated, production notes
3. Sign-off line: "Proofread complete against style sheet [version/date]"

**Log events:** `ProofreadStarted` · `ProofCorrectionsDelivered` ·
`EditorialStageComplete (Proofread)` → feeds G3 editorial-completion gate

---

# PART 4 — FLAGS & ESCALATION (ALL STAGES)

| Flag | Trigger | Action |
|---|---|---|
| `VoiceFlagRaised` | Required mechanical compliance would erase voice; or voice profile cannot be honored | Stop; document; route to Jackie |
| Structural discovery | Line/copy stage surfaces a developmental-level problem | Flag; significant issues route back, not patched |
| Hard-stop discovery | knowledge.md Section 4 flag surfaces at any stage | Halt stage; escalate; do not deliver |
| Style conflict | Manuscript needs deviate from the review-stage style determination | Flag for Publisher override in writing; never silently switch |
| Scope creep | Author requests rewriting/new content at copy or proof stage | Pause; re-scope to the correct service |

---

# PART 5 — GOVERNANCE

| Item | Value |
|---|---|
| Reference | line-copyedit-proof.md v1.0 |
| Status | **CANON — approved June 2026** |
| Replaces | Three stubs (April 2026) |
| Authority | Jackie Smith, Jr. — approval creates canon |
| Review cycle | On overlay canon changes or completion of the next two full line→proof engagements, whichever first |

**Memory-check items — RESOLVED at approval (June 2026):**

1. Calibration block (Reeder): confirmed as written — opening chapters /
   ~10–15%, mandatory for first-time authors.
2. Deity pronoun default (Crowley): author preference rules; house
   default when no preference is stated is CAPITALIZE
   (capitalize-unless-author-objects). §2.3.4 updated accordingly.
