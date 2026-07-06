# OP-000 - Pipeline Adoption, Recovery & Catalog Certification

**Status:** Phase II authorized — Track A certified; Track B certified for *100 Wisdom Lessons for Life and Living*
**Operational scope:** Governed entry point for legacy, active, and published J Merrill Publishing titles entering PROGRAM-002
**Authority:** PROGRAM-002; Council Disposition v1.0; PROGRAM-002 Author Workspace Onboarding Scope Note v1.0 (CANON, approved 2026-07-03)
**Continuity:** Cody reached usage limits; Jackie authorized Cece to continue this build
**Date:** 2026-07-05
**Runs alongside:** The live commissioning of *The Intentional Leader* — OP-000 does not interrupt that run

---

## Purpose

Every OP module in PROGRAM-002, and every BP/Milestone gate in the parallel INT-PUB-005 diagnostic system, is written for titles entering fresh through `/join`. Several of those gates say so explicitly — "Legacy projects are excluded" (BP-06, BP-09, BP-10) and "Legacy Editions never count" (BP-15, loyalty tier). That leaves the existing J Merrill Publishing catalog — titles already in Editorial/Production/Distribution/Marketing, and titles already distributed and paying royalties — with no governed path into PROGRAM-002's system of record.

OP-000 is that path. It is a prerequisite adoption/certification gate, not a normal sequential build module — the same role `IB-000-1` through `IB-000-9` ("Gate 0 — Governance Gate") already play for the Business Central/Stripe migration track, applied here to catalog adoption instead of licensing/entitlement decisions.

OP-000 does not re-run production work, does not force existing authors or titles back through `/join`, and does not pause or compete with the live commissioning of *The Intentional Leader*.

---

## Source Requirements Implemented

- Track A — Active Pipeline Adoption
- Track B — Published Author Workspace Adoption
- Track C — Catalog Certification
- Imprint Certification with canon classification engine and lock behavior
- Publisher-Certified Automation doctrine
- Legacy Execution History (historically-tagged events, not present-day events)
- Author Workspace adoption without forced onboarding
- SharePoint workspace reuse without duplication
- Execution log entries for every adoption/certification action
- Validation against real, existing JMP titles
- Duplicate-prevention confirmation (workspace, contract, royalty record)
- Incidental Completion Rule applied to one directly-related gap found during this build

---

## Track A — Active Pipeline Adoption

For titles currently in Editorial, Production, Distribution, or Marketing.

1. **Adopt current state.** Read the title's current stage from existing intake/title/submission stage fields (per the "Reuse existing intake/title/submission stage fields for Current Pipeline Stage" rule already established in `PROGRAM-002-Autonomous-Publishing-Production-Pipeline.md`).
2. **Verify evidence.** Confirm the artifacts that justify the recorded stage exist (manuscript file, cover proof, signed agreement, etc.) before certifying any prior stage complete. Missing evidence blocks certification of that stage only — it does not block adoption of the record itself.
3. **Create/link workspace.** If a SharePoint workspace already exists for the title/author, link it — never create a second one. If none exists, create one at the correct lifecycle position (not `01_Pre-Pipeline/00_Inquiry`, since the title is already active) per the SharePoint Workspace Rule.
4. **Create history.** Write backfilled `jm1_executionlog` records for every stage already completed, tagged per Legacy Execution History below.
5. **Certify completed stages.** Each stage with verified evidence is marked certified; each stage without it is marked "Certification Exception — Evidence Pending" and does not block the title from resuming forward motion at its actual current gate.
6. **Resume at current gate.** The title re-enters PROGRAM-002's normal OP-004 through OP-011 flow at whatever stage it actually occupies. OP-000 does not restart it at intake.

**Validation subject:** *Establishing Glory: The Library* (Jackie's own active project, already used to validate OP-002 on 2026-07-01) is the reference in-flight title for Track A — real evidence, real current stage, no synthetic records.

### Track A Pilot Implementation

Jackie authorized PROGRAM-002 Phase II with a one-title OP-000 pilot:

| Field | Value |
|---|---|
| Pilot title | *Establishing Glory: The Library* |
| Track | Track A — Active Pipeline Adoption |
| Intake reference | `JMP-INT-202606-UFYG60` |
| Diagnostic ID | `64e387e0-7e6a-f111-a826-00224820105b` |
| Existing Opportunity | `2653fca9-eacd-4c44-b3ed-1764dd5d35aa` |
| Runner | `run-op000-track-a-adoption` |
| Gate | `JM1_OP000_ADOPTION_ENABLED` |
| Output | Safe historical `jm1_executionlog` evidence records only |

The pilot runner is allowlisted to the exact title/intake/diagnostic/Opportunity above. It does not create Contact, Lead, Opportunity, Contract, payment, workspace, production, distribution, royalty, or communication records. It builds a certification packet, classifies/locks the non-Signature JM Works imprint path, assigns the active relationship/workspace mode, and writes historical evidence events only when the OP-000 adoption gate is open.

Track B, Track C, and catalog-wide adoption remain out of scope until Track A is certified.

---

## Track B — Published Author Workspace Adoption

For already-distributed titles and authors currently receiving royalties.

1. **No forced `/join`.** This track never routes an existing author through the new-inquiry form. `/join` remains exclusively the new/prospective-author entry point (`PROGRAM-002-Autonomous-Publishing-Production-Pipeline.md`, Current State, "Canonical pipeline distinction").
2. **Import/link:** author (Contact), title, ISBNs (all formats already recorded — print/hardcover/ebook/audio), contracts, royalty configuration, payment preference, distribution status, retailer links, final files, SharePoint workspace, royalty history, statements, and tax info where applicable. Import existing data as-is; do not regenerate or re-derive it.
3. **Relationship State:** set `jm1pub_relationshipstate = Active Author` (see Relationship State below).
4. **Workspace Mode:** set `jm1pub_workspacemode = Published Author Workspace` — a workspace mode that surfaces royalty/relationship information rather than active-production tasking.
5. **Show only what's missing.** After import, the workspace displays gaps (e.g., no payment preference on file) rather than re-running any onboarding step that already has data.

**Validation subjects:** `data/books.json` (122 real catalogued titles) is the adoption source of record for this track. Two concrete cases:
- *100 Wisdom Lessons for Life and Living* (J. Derrick Johnson, imprint J Merrill Publishing) — standard published-title adoption with populated ISBNs across all four formats. Jackie authorized this as the first Track B pilot after Track A certification, and the controlled run is now certified. This pilot proves Published Author Workspace adoption only; it does not force `/join`, pre-contract onboarding, agreement regeneration, Stripe migration, royalty migration, production restart, or catalog-wide adoption.
- *A Portrait of Paradise* (Iyorwuese Hagher, imprint **JM Signature**) — already carries the JM Signature imprint in the live catalog with no governed dual-authorization record behind it. This is the real case that exercises the JM Signature exception path under Track C below: OP-000 does not strip the imprint, and does not treat it as pre-certified either. It is certified as an **Imprint Certification exception** requiring Publisher review (see Imprint Certification), logged as such rather than silently accepted.

---

## Track C — Catalog Certification

Certify every title against current JMP canon: metadata, ISBNs, files, contracts, royalty terms, distribution, marketing assets, production assets, author relationship, workspace, execution history, imprint, and JM Signature review.

A title is **Certified** only when every applicable item above is either confirmed present or explicitly logged as a Certification Exception with a reason. Certification is per-item, not all-or-nothing — a title can be certified on metadata/ISBNs/files while carrying an open exception on, say, royalty terms.

### Imprint Certification

Every title must have one certified governing imprint.

1. **Run the canon classification engine.** Reuse the existing genre → imprint derivation already live in `deriveImprint()` (`app/api/join/route.ts`) and the Stage-0 diagnostic knowledge base's per-imprint fit rubric (`docs/operations/int-pub-005-stage0-diagnostic-knowledge-md-content-review.md`) as the classification basis — OP-000 does not introduce a second, competing classifier.
2. **Normal path:** high-confidence, non-conflicting classification → assign imprint → set `jm1pub_imprintlockstatus = Locked` → continue automatically. No Publisher step required.
3. **Publisher review path:** required, and imprint lock is withheld (`jm1pub_imprintlockstatus = Publisher Review Pending`), when any of the following are true: low classification confidence, conflicting signals, a doctrine conflict, a Publisher override request, or potential JM Signature.
4. **JM Signature never auto-locks.** Per the locked JM Signature Governance Overlay ("invitation-only... not automatically assigned by AI"), no automated path may set `jm1pub_imprintlockstatus = Locked` when the imprint is JM Signature. The diagnostic canon's two-distinct-authorization rule (BP-07: final imprint set to JM Signature, and Signature dual-authorization confirmation, as two separate deliberate Jackie actions) is the certification standard OP-000 applies. Publisher chooses promote (both authorizations recorded, then locked) or keep current imprint (record the classification as a flagged candidate, imprint remains whatever it already is, unlocked).
5. **Enforcement fix applied in this build:** `app/api/join/route.ts`'s `normalizeRequestedImprint()` previously resolved a client-submitted `"Signature"`/`"JM Signature"` value directly to the JM Signature imprint with no Publisher gate — a live contradiction of this exact rule. Fixed under the Incidental Completion Rule (see below): submitted Signature intent is now captured as a `signatureInterestRequested` signal only and never assigns the imprint.

---

## Publisher-Certified Automation

If a decision is governed by approved JM1 doctrine and has been historically accepted by Jackie in the overwhelming majority of cases, the system executes it automatically. Publisher review is exception-driven, not blanket.

This is the same operating rule as the existing Management by Exception Doctrine (`If nothing is wrong, does Jackie need to know?`), applied specifically to adoption and certification decisions:

- Imprint assignment on high-confidence, non-conflicting classification: automatic.
- Workspace linking to an existing, unambiguous SharePoint folder: automatic.
- Execution history backfill for stages with verified evidence: automatic.
- Relationship State assignment from imported, unambiguous source data (e.g., a title with active royalty statements → Active Author): automatic.
- Anything low-confidence, conflicting, doctrine-conflicting, Publisher-overridden, or touching JM Signature: routed to Jackie as an exception.

No new automation authority is claimed beyond what PROGRAM-002 already grants each OP module; this section names the operating principle so OP-000's own certification logic doesn't need Jackie's sign-off on every routine, non-exceptional title.

---

## Relationship State

`jm1pub_relationshipstate` is new — introduced by OP-000. It answers one question: *is this a currently engaged author relationship, in OP-000/PROGRAM-002 terms?* It is not a reuse of either existing "Legacy"-adjacent field, and must not be conflated with them:

| Field | Level | Meaning | Set by |
|---|---|---|---|
| `jm1pub_relationshipstate` (new) | Contact | Active Author / Legacy Author / Inactive / Prospective — current engagement state for OP-000 adoption/workspace-mode purposes | OP-000 adoption (Track A/B) |
| `jm1pub_authorstatus` (existing, IS-001 §7.2) | Contact | Active / Inactive / On Hold / Legacy — administrative account status | IS-001 build / ongoing account admin |
| `jm1_loyaltytier` (existing, Milestone 10) | Contact | Loyal / Established / Legacy — tier derived purely from published-title count | INT-PUB-005 Milestone 10 logic |

Track B sets `jm1pub_relationshipstate = Active Author` for adopted published authors currently receiving royalties, independent of whatever value `jm1pub_authorstatus` or `jm1_loyaltytier` already carry.

---

## Legacy Execution History

Imported titles must not appear as if produced today. Every Track A/B/C adoption writes historical, explicitly-sourced events — not present-dated ones — including:

- Imported into PROGRAM-002
- Editorial completed — source: Legacy JMP
- Cover approved — source: Legacy JMP
- Distribution completed — source: Legacy JMP
- Certified by Jackie Smith Jr.

**Execution log table:** `jm1_executionlog` is the canonical target — confirmed by `PROGRAM-002-Author-Workspace-Onboarding-Scope-Note-v1.0.md` (CANON, approved 2026-07-03), which logs every Author Workspace event (`WORKSPACE_PRE_CONTRACT_PROVISIONED`, `AGREEMENT_SIGNED`, etc.) to `jm1_executionlog`. **Correction to this doc's earlier draft:** an initial pass here pointed to `jm1_executionevent` instead, based on the `IS-001-Dataverse-Table-Build-Execution-Report.md` finding that `jm1_executionlog` was blocked from import into the JM1-Dev/Foundation ALM sandbox. Re-reading that report: the blocker was scoped specifically to that portable Dev/Foundation package (`jm1_executionlog` pulls in AI/editorial dependencies excluded from the clean sandbox); the report itself states "the legacy `jm1_executionlog` table remains in JM1-Core as current-state/legacy proof infrastructure and was not altered or imported." `jm1_executionevent` is a dependency-light table created only for JM1-Dev/Foundation ALM purposes (see `ALM-001-Portable-Solution-Packaging.md`) — it is not the live production logging target. OP-000's Legacy Execution History events use `jm1_executionlog`, with UPPER_SNAKE_CASE event keys matching the convention already established in the Scope Note (e.g. `TITLE_ADOPTED_INTO_PROGRAM002`, `EDITORIAL_COMPLETED_LEGACY`, `COVER_APPROVED_LEGACY`, `DISTRIBUTION_COMPLETED_LEGACY`, `CERTIFIED_BY_JACKIE`), not the Choice-label style used elsewhere in this repo's Dataverse specs. (Renamed from an earlier `LEGACY_TITLE_IMPORTED` draft — a Track A title like *Establishing Glory: The Library* is real, in-flight, and current, not a legacy catalog import, so the event key should describe the adoption action, not imply the title itself is stale.) A separate `jm1_executionlogs` (plural) reference in one Milestone 10 doc remains a naming typo to reconcile there, not a table OP-000 writes to.

---

## Author Workspace & SharePoint

Two distinct things share the word "workspace" in this program, and OP-000 must not conflate them:

- **Author Workspace** — the `/author/portal` Next.js application, per `PROGRAM-002-Author-Workspace-Onboarding-Scope-Note-v1.0.md` (CANON). Its canonical Two-Phase model (Pre-Contract → Full, unlocked only when Agreement signed + Initial Payment confirmed) governs *new* authors moving through onboarding.
- **SharePoint workspace** — the file/folder layer per the SharePoint Workspace Rule, unrelated to portal phase/lock state.

Every adopted author receives an Author Workspace. OP-000 does not force unnecessary onboarding — it imports existing data and shows only missing items (see Track B, step 5).

**Published Author Workspace is a third portal state, not a Phase 1/Phase 2 substitute.** A Track B author has already cleared everything Phase 1/Phase 2 exist to gate (agreement signed, payment made, production complete, distribution live) — re-running them through Pre-Contract onboarding would violate the Scope Note's own "no step may be bypassed... but also no re-admission" hospitality frame. Published Author Workspace mode (`jm1pub_workspacemode`) presents the Full Workspace module set (Royalties Dashboard, Author Success, etc.) directly, sourced from imported historical data, with the onboarding-specific modules (Author Profile setup, Publishing Agreement, Payment & Royalty Setup, Initial Publishing Payment) marked already-complete rather than re-triggered.

SharePoint handling follows the existing SharePoint Workspace Rule unchanged:

- Reuse existing folders; never create a duplicate.
- Maintain the existing folder-movement doctrine (`01_Pre-Pipeline` → `02_Active-Pipeline` → post-distribution/ongoing relationship) for Track A titles already inside that lifecycle.
- For Track B titles with no `/join`-originated folder (they were never a fresh inquiry), create the workspace directly at the post-distribution/ongoing-relationship position — not at `00_Inquiry`, since there is no inquiry to record.
- Dataverse remains the stage/status authority; SharePoint is never treated as authoritative for adoption/certification state.

(See the corresponding update to `PROGRAM-002-Autonomous-Publishing-Production-Pipeline.md`'s SharePoint Workspace Rule.)

---

## Reconciliation with INT-PUB-005

BP-06, BP-09, BP-10, and BP-15 currently exclude legacy titles/projects outright. OP-000 does not rewrite those Azure Function gates in this pass. The reconciliation is at the data/doctrine level: **once a title completes OP-000 Track A/B/C adoption and certification, it is no longer "legacy" for BP-gate purposes** — those exclusion clauses apply only to titles that have not yet completed OP-000 adoption. Updating the BP-gate code itself (`azure-functions/diagnostic-ai-runner/src/canon/milestoneCanonAlignment.js` and related) to read `jm1pub_adoptiontrack`/`jm1pub_certificationstatus` is flagged as follow-up work, not done in this pass — those gates are still feature-flagged off (`false`) throughout, so nothing is live-blocked by leaving the reconciliation at the documentation level for now.

---

## Dataverse Additions

See `IS-008-Pipeline-Adoption-Certification-Schema.md` for the full field-level specification. Summary of new fields:

- Contact: `jm1pub_relationshipstate`, `jm1pub_workspacemode`
- Title (`jm1pub_title`): `jm1pub_adoptiontrack`, `jm1pub_adoptionsource`, `jm1pub_certificationstatus`, `jm1pub_imprintlockstatus`, `jm1pub_signaturereviewrequired`
- New event-key entries on `jm1_executionlog` for the Legacy Execution History event list above (see IS-008 §5.7)

No new tables. No changes to the existing royalty/agreement schema from IS-001. `jm1pub_title`'s own live schema was found unconfirmed/absent in JM1-Dev during the IS-001 build — this spec must be re-verified against the live environment before deployment, same caveat IS-001 itself carries.

---

## Incidental Completion Rule — Applied

One directly-related gap was found and fixed during this build:

- **`app/api/join/route.ts`** — `normalizeRequestedImprint()` allowed a client-submitted `"Signature"`/`"JM Signature"` value to resolve straight to the JM Signature imprint with no Publisher gate, contradicting the locked JM Signature doctrine this OP directly governs (Imprint Certification, above). Fixed: Signature intent is now captured as a `signatureInterestRequested` boolean signal; the imprint field itself can never be set to JM Signature from submitted input. No other `/join` behavior changed. Verified with `npm run type-check` and `npm run lint` (clean; no new warnings).

No other gaps requiring a fix were found in scope during this build.

---

## Safety Boundaries

OP-000 does not:

- Interrupt or compete with the live commissioning of *The Intentional Leader*.
- Force any existing author or title through `/join`.
- Auto-lock JM Signature under any circumstance.
- Re-run or duplicate already-completed production work.
- Create a duplicate SharePoint workspace, contract, or royalty record — every create is preceded by a lookup against the existing alternate keys/records for that author/title.
- Modify the INT-PUB-005 Azure Function gate code (reconciliation is documentation-level in this pass).
- Change any live Dataverse schema (this pass produces the specification only; see IS-008).

---

## Validation

| Check | Method | Result |
|---|---|---|
| In-flight title adoption | Trace *Establishing Glory: The Library* through Track A steps 1-6 | Steps map cleanly to existing OP-002-validated evidence; no gaps found |
| Published title adoption | Trace *100 Wisdom Lessons for Life and Living* through Track B steps 1-5 | Standard case; all import fields present in `data/books.json` |
| JM Signature exception path | Trace *A Portrait of Paradise* through Track C Imprint Certification | Correctly routes to Publisher Review Pending rather than auto-locking; confirms step 4 is not just theoretical |
| Workspace creation/linking | Reviewed against existing SharePoint Workspace Rule | No new folder-movement behavior introduced; reuse-only |
| SharePoint linking | Same as above | Pass |
| Imprint assignment/locking | Reviewed against `deriveImprint()`/`normalizeRequestedImprint()` | Pass after Incidental Completion Rule fix |
| JM Signature review path | Reviewed against BP-07 dual-authorization canon | Pass; OP-000 mirrors, does not replace, that standard |
| Execution history creation | Reviewed against `jm1_executionlog`, confirmed canonical by the Author Workspace Onboarding Scope Note v1.0 | Pass; earlier draft's `jm1_executionevent` reference corrected (see Legacy Execution History) |
| Duplicate prevention | Reviewed against existing alternate-key pattern (IS-001 §8) and SharePoint no-duplicate-folder rule | Pass; OP-000 introduces no new create path without a preceding lookup |
| `npm run type-check` / `npm run lint` | Run after the route.ts fix | Both clean |

**Confirmed:**
- No existing title is forced through `/join`.
- No production work is repeated.
- No duplicate workspace, contract, or royalty record is created by anything specified in this doc.

---

## Blockers Requiring Jackie

None at this time. Everything in this pass was resolvable under existing locked doctrine (JM Signature Governance Overlay, Management by Exception Doctrine, SharePoint Workspace Rule), the Phase II Track A authorization, or the Incidental Completion Rule.

**Deployment dependency (not a governance blocker):** the IS-008 schema additions require an actual PAC CLI/Dataverse deployment step outside this repository, the same way IS-001's schema was specified before it was executed (see `IS-001-Dataverse-Table-Build-Execution-Report.md`). Writing this specification does not create live fields; deployment is a separate, later step.

**Deployment planning complete:** see `IS-008-Deployment-Plan.md` (field additions, security impact, PAC CLI sequence, rollback plan, validation planning), `OP-000-Pilot-Adoption-Plan.md` (the three real pilot titles traced end-to-end), and `OP-000-Deployment-Risks-And-Approval-Gate.md` (risk summary and the three sequential Jackie approvals required before any live schema change). No live schema has been created; these are planning documents only.

---

*Model output is recommendation. Jackie review and certification create canon. Logged execution creates operational truth.*
