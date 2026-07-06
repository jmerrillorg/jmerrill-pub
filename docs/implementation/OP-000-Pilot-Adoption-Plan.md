# OP-000 — Pilot Adoption Plan

**Status:** Planning only — no title adopted, no record written, no schema live
**Authority:** OP-000 Pipeline Adoption, Recovery & Catalog Certification; IS-008 Deployment Plan; Jackie's continuity authorization to move OP-000 into deployment/pilot planning (2026-07-04)
**Owner:** Jackie Smith Jr.
**Plan Owner:** Cece
**Fence:** This plan describes what pilot adoption *will* do once IS-008 schema is live and Jackie authorizes execution. No pilot title is touched by this document. Runs alongside — never interrupts — the live commissioning of *The Intentional Leader*.

---

## 1. Purpose

Prove OP-000's three tracks against three real, already-documented JMP titles before any broader catalog adoption. Each pilot candidate below is chosen because real evidence already exists in this repository — no synthetic records, matching the discipline OP-002's own controlled validation used.

---

## 2. Pilot Candidate 1 — Track A: *Establishing Glory: The Library*

### Source records (real, already in repo)

| Field | Value | Source |
|---|---|---|
| Intake reference | `JMP-INT-202606-UFYG60` | `docs/operations/int-pub-005-milestone-6-agreement-onboarding-readiness.md` |
| Diagnostic ID | `64e387e0-7e6a-f111-a826-00224820105b` | Same |
| Opportunity ID | `2653fca9-eacd-4c44-b3ed-1764dd5d35aa` | Same |
| Opportunity name | `Publishing Intake - Establishing Glory: The Library` | Same |
| Opportunity step (as of Milestone 6 readiness doc) | `2-Develop` | `int-pub-005-milestone-6-agreement-onboarding-readiness.md` |
| Manuscript status at intake | `Complete` | `docs/operations/backups/flow-closeout-2026-06-24/join-live-row-readback-*.json` |
| Genre/subject | Self-Help | Same |
| Author | Jackie Smith, Jr. | Same |
| Diagnostic AI pilot history | 4 controlled attempts (PRs #77, #79, #81, #82); attempt 4 (2026-06-18) passed schema/no-quotation validation with an internal-only "Needs Human Review" result | `int-pub-005-real-manuscript-pilot-attempt-4.md` |
| Milestone 7/7C/8 system-readiness status | Editorial Command Center and Distribution Setup Readiness are *system-ready*; live work for this record remains explicitly gated pending human authorization | `int-pub-005-milestone-7c-editorial-command-center.md`, `int-pub-005-milestone-8-distribution-setup-readiness.md` |
| OP-002 validation | Used as Jackie's real active project to pass OP-002 controlled validation, 2026-07-01 | `PROGRAM-002-Autonomous-Publishing-Production-Pipeline.md` |

Note: `data/books.json` (public catalog) contains three already-published, unrelated *Establishing Glory* volumes (1/2/3, 2019-2021, imprint J Merrill Publishing) by the same author. **This pilot's *Establishing Glory: The Library* is a distinct, currently in-flight title** — not one of the three published volumes — and must not be matched or merged against those catalog records during adoption. Duplicate-prevention check #1 below exists specifically to catch this.

### Current stage/state

In-flight, mid-pipeline: intake and diagnostic complete, Opportunity at step `2-Develop`, Milestone 7/7C/8 system-readiness satisfied but live human-gated stages (editorial, distribution) not yet opened for this specific record. Not yet in Editorial in the OP-004-011 sense — closer to post-intake, pre-Editorial-command-center-activation.

### Expected Relationship State

`jm1pub_relationshipstate = Active Author` is premature — Track A does not set Relationship State on intake alone; it is a Track B/published-catalog concept. For a Track A adoption, Relationship State is left as whatever the Contact record already carries (author-first, not overwritten by adoption). **Correction to OP-000's original framing:** OP-000's Track A section never claimed to set Relationship State, so no change needed there — flagging here only to confirm this pilot won't incorrectly force it to `Active Author` before the title is actually published.

### Expected Workspace Mode

No `jm1pub_workspacemode` change. Track A workspace handling is SharePoint lifecycle position + Dataverse stage, not portal mode — Published Author Workspace mode is Track B-only. This author's Author Workspace (portal) proceeds through the existing Two-Phase model from the Author Workspace Onboarding Scope Note v1.0, unaffected by OP-000.

### Expected Imprint Result

Genre "Self-Help" → per the existing `deriveImprint()` classification (`app/api/join/route.ts`), this falls under the `JM Works` genre bucket. Expected: `jm1pub_adoptiontrack = Track A`, `jm1pub_adoptionsource = Native PROGRAM-002` (this title entered through `/join`, not legacy import), high-confidence non-conflicting classification → `jm1pub_imprintlockstatus = Locked` automatically, imprint = `JM Works`. No Publisher review expected for this title.

### Expected Execution-Log Events

Per IS-008 §5.7 event-key list, written to `jm1_executionlog`:
- `TITLE_ADOPTED_INTO_PROGRAM002`
- `IMPRINT_ASSIGNED`
- `IMPRINT_LOCKED`
- `ADOPTION_WORKSPACE_LINKED` (existing SharePoint workspace, not created — see below)

No `CERTIFIED_BY_JACKIE` expected yet — Track A certifies only completed stages, and this title has not completed Editorial/Cover/Distribution. `CERTIFICATION_EXCEPTION_LOGGED` is expected for the not-yet-completed downstream stages, per OP-000's per-item (not all-or-nothing) certification model.

### Duplicate-prevention checks

1. Confirm the adopted `jm1pub_title` (or intake/Opportunity record) resolves to *Establishing Glory: The Library* specifically — by Opportunity ID `2653fca9-eacd-4c44-b3ed-1764dd5d35aa` — and is not matched against, or merged with, the three unrelated published *Establishing Glory* volumes in `data/books.json`.
2. Confirm no second Opportunity is created — "Opportunity handling for this record is update/use existing Opportunity. Do not create a duplicate Opportunity" is already explicit doctrine in `int-pub-005-milestone-6-agreement-onboarding-readiness.md`; OP-000 adoption must follow the same rule.
3. Confirm no second SharePoint folder is created for this author/title if one already exists from the `/join` intake lifecycle.

### SharePoint workspace linking/reuse

Since this title entered through `/join` (real inquiry, real intake reference), a SharePoint workspace should already exist somewhere in the `01_Pre-Pipeline` → `02_Active-Pipeline` lifecycle. Pilot adoption **links** whatever folder already exists at its current lifecycle position — it does not create a new one. If no folder is found (a legitimate possibility to check for, not assume), that is itself a pilot finding to report, not something to silently paper over by creating one without Jackie's knowledge.

---

## 3. Pilot Candidate 2 — Track B: *100 Wisdom Lessons for Life and Living*

### Source records (real, already in repo)

| Field | Value | Source |
|---|---|---|
| Title ID | `100-wisdom-lessons-for-life-and-living` | `data/books.json` |
| Author | J. Derrick Johnson | Same |
| Imprint (as catalogued today) | `J Merrill Publishing` | Same |
| ISBN (paperback) | 978-1-961475-57-1 | Same |
| ISBN (hardcover) | 978-1-961475-58-8 | Same |
| ISBN (ebook) | 978-1-961475-59-5 | Same |
| ISBN (audiobook) | 978-1-961475-60-1 | Same |
| Formats | Paperback, Hardcover, eBook, Audiobook | Same |
| Genre | (blank in catalog — a real data gap, not an OP-000 omission) | Same |

### Current stage/state

Already published and distributed across all four formats — this is a fully post-distribution, ongoing-relationship-stage title. No production/editorial work remains.

### Expected Relationship State

`jm1pub_relationshipstate = Active Author` — this is the canonical Track B case the field was designed for.

### Expected Workspace Mode

`jm1pub_workspacemode = Published Author Workspace`.

### Expected Imprint Result

Already carries `J Merrill Publishing` — the default/fallback imprint per `deriveImprint()` when no more specific genre match applies. Since genre is blank in the catalog record, classification confidence is **not** automatically high here: there's no genre signal to classify against, only the already-recorded imprint. Expected: `jm1pub_adoptiontrack = Track B`, `jm1pub_adoptionsource = Legacy JMP Import`. Imprint Certification treats an already-assigned, non-Signature imprint with no genre data as **acceptable to lock as-is** (the recorded imprint is accepted at face value, not re-derived from a genre that isn't on file) rather than escalating to Publisher review — re-deriving from missing data would be worse than trusting the existing catalog record. `jm1pub_imprintlockstatus = Locked`.

### Expected Execution-Log Events

- `TITLE_ADOPTED_INTO_PROGRAM002`
- `RELATIONSHIP_STATE_ASSIGNED`
- `IMPRINT_ASSIGNED`
- `IMPRINT_LOCKED`
- `EDITORIAL_COMPLETED_LEGACY`
- `COVER_APPROVED_LEGACY`
- `DISTRIBUTION_COMPLETED_LEGACY`
- `ADOPTION_WORKSPACE_CREATED` (see below — no existing SharePoint folder expected for this author)
- `ADOPTION_MIGRATION_COMPLETED`

No `CERTIFIED_BY_JACKIE` event is written automatically — per OP-000's Publisher-Certified Automation doctrine, routine Track B imports are auto-processed, but the `CERTIFIED_BY_JACKIE` key specifically records Jackie's own certification action and should only be written when Jackie (or a Publisher-Certified-Automation path explicitly authorized for that exact decision class) actually certifies, not merely because import succeeded. This pilot plan flags that distinction rather than assuming every successful Track B import auto-writes a Jackie-attributed event.

### Duplicate-prevention checks

1. Confirm no existing `jm1pub_authoragreement`/`jm1pub_titleownership`/`jm1pub_royaltyrule` records already exist for this author/title combination before creating any — if J. Derrick Johnson already has Dataverse records from a prior manual entry, adoption must link/update those, not create parallel ones.
2. Confirm no existing Contact record for J. Derrick Johnson is duplicated — match by email/name against the canonical Contact + URL model (IS-001 §4) before creating a new Contact.
3. Confirm this author has no existing SharePoint folder before creating one (see below).

### SharePoint workspace linking/reuse

Since this title never went through `/join` (a genuinely legacy/pre-PROGRAM-002 title), no `01_Pre-Pipeline`-lifecycle folder is expected to exist. Pilot adoption should first **search** for an existing folder under any prior ad hoc author-file storage convention before concluding none exists — only if confirmed absent does it create a workspace directly at the post-distribution/ongoing-relationship position, per OP-000's SharePoint addendum. This search-before-create step is the concrete duplicate-prevention mechanism for Track B SharePoint handling.

---

## 4. Pilot Candidate 3 — JM Signature Exception Validation: *A Portrait of Paradise*

### Source records (real, already in repo)

| Field | Value | Source |
|---|---|---|
| Title ID | `a-portrait-of-paradise` | `data/books.json` |
| Author | Iyorwuese Hagher | Same |
| Imprint (as catalogued today) | `JM Signature` | Same |
| ISBN (paperback) | 978-1-961475-65-6 | Same |
| ISBN (hardcover) | 978-1-961475-66-3 | Same |
| ISBN (ebook) | 978-1-961475-67-0 | Same |
| Formats | Paperback, Hardcover, eBook | Same |

This is the single JM Signature title in the 122-title public catalog (confirmed by the imprint tally run during OP-000's original research) — and it carries the imprint with **no dual-authorization record visible anywhere in this repository**.

### Current stage/state

Already published and distributed (paperback/hardcover/ebook) — same post-distribution stage as Candidate 2.

### Expected Relationship State

`jm1pub_relationshipstate = Active Author` — same Track B baseline as Candidate 2.

### Expected Workspace Mode

`jm1pub_workspacemode = Published Author Workspace`.

### Expected Imprint Result — the actual test case

This is the pilot's core validation target: **the imprint must not silently auto-lock.**

- `jm1pub_adoptiontrack = Track B`, `jm1pub_adoptionsource = Legacy JMP Import`.
- Because the recorded imprint is JM Signature, BR-OP000-1 (IS-008 §7) must fire: `jm1pub_imprintlockstatus` cannot be set to `Locked` without both BP-07 dual-authorization fields independently recorded, and neither is on file.
- Expected result: `jm1pub_imprintlockstatus = Publisher Review Pending`, `jm1pub_signaturereviewrequired = Yes`. The title keeps its existing JM Signature imprint (OP-000 does not strip it), but unlocked, pending Jackie's actual dual authorization.
- This is explicitly **not** a failure state — it is the correct, doctrine-compliant outcome. A pilot "pass" here means the system correctly refused to auto-lock, not that it assigned an imprint.

### Expected Execution-Log Events

- `TITLE_ADOPTED_INTO_PROGRAM002`
- `RELATIONSHIP_STATE_ASSIGNED`
- `SIGNATURE_REVIEW_FLAGGED`
- `CERTIFICATION_EXCEPTION_LOGGED` (imprint certification is the specific open exception on this title)
- `EDITORIAL_COMPLETED_LEGACY`
- `COVER_APPROVED_LEGACY`
- `DISTRIBUTION_COMPLETED_LEGACY`
- `ADOPTION_WORKSPACE_CREATED` (pending duplicate-check, same as Candidate 2)

**No `IMPRINT_LOCKED` event** — its absence is itself the thing this pilot candidate is meant to prove.

### Duplicate-prevention checks

Same pattern as Candidate 2 (Contact, agreement/ownership/rule records, SharePoint folder) — no author-specific difference expected, since the duplicate-prevention mechanism doesn't vary by imprint.

### SharePoint workspace linking/reuse

Same search-before-create approach as Candidate 2.

---

## 5. Cross-Pilot Validation Summary

| Check | Candidate 1 (Track A) | Candidate 2 (Track B) | Candidate 3 (JM Signature exception) |
|---|---|---|---|
| In-flight vs. published adoption path exercised | ✓ Track A | ✓ Track B | ✓ Track B |
| Relationship State assignment | Not set (correctly, per Track A scope) | Active Author | Active Author |
| Workspace Mode assignment | Unchanged (SharePoint lifecycle only) | Published Author Workspace | Published Author Workspace |
| Imprint auto-lock (normal path) | ✓ Expected | ✓ Expected | ✗ Must not occur |
| Imprint Publisher-review exception path | Not applicable | Not applicable | ✓ Expected — the point of this candidate |
| Execution history backfilled with historical tags | ✓ (partial — mid-pipeline) | ✓ (full legacy set) | ✓ (full legacy set) |
| Duplicate-prevention (Opportunity/Contact/agreement/SharePoint) | ✓ | ✓ | ✓ |
| SharePoint reuse vs. create | Reuse (existing `/join` folder expected) | Create (search-first) | Create (search-first) |

Together these three candidates exercise every validation item OP-000's own Validation section already committed to (in-flight adoption, published adoption, JM Signature review path, execution history creation, duplicate prevention, SharePoint linking) against real data, not hypothetical titles.

---

## 6. Sequencing Relative to IS-008 Deployment

Pilot execution cannot begin until:

1. IS-008 Dev build passes validation (`IS-008-Deployment-Plan.md` §7).
2. Jackie reviews Dev validation results.
3. Jackie separately authorizes a controlled pilot run (per IS-008 Deployment Plan §9, item 3/4 boundary — Test promotion and any pilot activity are gated separately from the initial Dev build authorization).

Until then, this document is planning only. No pilot candidate's Dataverse record, SharePoint folder, or execution log entry is touched.

---

## 7. Explicit Non-Interruption Confirmation

None of the three pilot candidates is *The Intentional Leader*. Nothing in this plan reads, writes, or references that title's workspace, Dataverse records, or commissioning run. Pilot execution — whenever separately authorized — runs entirely in parallel with, and has no dependency on, that commissioning.

---

*Model output is recommendation. Jackie approval creates canon. Logged execution creates operational truth.*
