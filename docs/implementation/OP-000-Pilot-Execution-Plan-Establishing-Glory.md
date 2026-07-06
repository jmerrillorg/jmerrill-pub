# OP-000 — First Pilot Execution Plan: *Establishing Glory: The Library* (Track A)

**Status:** Phase II Track A pilot authorized — implementation candidate, pending governed deployment and controlled adoption run
**Authority:** OP-000; IS-008 Deployment Package; OP-000 Pilot Adoption Plan (Candidate 1); Jackie's authorization to begin PROGRAM-002 Phase II with this one-title pilot (2026-07-05)
**Owner:** Jackie Smith Jr.
**Plan Owner:** Cece
**Fence:** This document governs the first OP-000 pilot. It does not itself execute the adoption. Nothing in this title's Dataverse record, SharePoint folder, or execution log is created or modified by this document.

This plan extracts and finalizes Pilot Candidate 1 from `OP-000-Pilot-Adoption-Plan.md` as the specific, named first-pilot target. Jackie has authorized this Track A pilot only; Track B, Track C, and catalog-wide adoption remain deferred until this pilot is certified.

---

## 1. Current State (as it exists today, unmodified)

| Field | Value | Source |
|---|---|---|
| Title | *Establishing Glory: The Library* | Repository-confirmed, not a synthetic/test record |
| Author | Jackie Smith, Jr. | `docs/operations/backups/flow-closeout-2026-06-24/join-live-row-readback-*.json` |
| Intake reference | `JMP-INT-202606-UFYG60` | `int-pub-005-milestone-6-agreement-onboarding-readiness.md` |
| Diagnostic ID | `64e387e0-7e6a-f111-a826-00224820105b` | Same |
| Opportunity ID | `2653fca9-eacd-4c44-b3ed-1764dd5d35aa` | Same |
| Opportunity name | `Publishing Intake - Establishing Glory: The Library` | Same |
| Opportunity step | `2-Develop` (as of Milestone 6 readiness doc) | Same |
| Manuscript status at intake | `Complete` | Flow closeout readback JSON |
| Genre/subject | Self-Help | Same |
| Diagnostic AI pilot history | 4 controlled attempts (PRs #77, #79, #81, #82); attempt 4 (2026-06-18) passed schema/no-quotation validation, internal-only "Needs Human Review" result | `int-pub-005-real-manuscript-pilot-attempt-4.md` |
| Milestone 7/7C/8 readiness | System-ready; live human-gated stages (editorial, distribution) not yet opened for this record | `int-pub-005-milestone-7c-editorial-command-center.md`, `int-pub-005-milestone-8-distribution-setup-readiness.md` |
| OP-002 validation | Used as Jackie's real active project to pass OP-002 controlled validation, 2026-07-01 | `PROGRAM-002-Autonomous-Publishing-Production-Pipeline.md` |
| Current SharePoint workspace | Not yet confirmed present/absent — to be checked during pre-pilot verification, not assumed here | — |
| Current `jm1pub_relationshipstate` | Not applicable — field does not exist yet (IS-008 not deployed) | — |
| Current `jm1pub_workspacemode` | Not applicable — field does not exist yet | — |
| Current `jm1pub_adoptiontrack` / `certificationstatus` / `imprintlockstatus` | Not applicable — fields do not exist yet | — |

**Distinct from, and must never be matched against:** the three already-published *Establishing Glory* volumes (1/2/3, 2019-2021, imprint J Merrill Publishing) already in `data/books.json`. This pilot title is a separate, currently in-flight work, identified unambiguously by Opportunity ID `2653fca9-eacd-4c44-b3ed-1764dd5d35aa`.

---

## 2. Expected Adopted State (after pilot execution — not yet true)

Adoption follows Track A (Active Pipeline Adoption): adopt current stage, verify evidence, link/create workspace, backfill history, certify completed stages, resume at current gate. Applied to this title's actual current position (post-intake, pre-Editorial-command-center-activation — not yet in Editorial/Cover/Distribution in the OP-004-011 sense):

| Step | Expected Result |
|---|---|
| Adopt current state | `jm1pub_adoptiontrack = Track A - Active Pipeline Adoption`, `jm1pub_adoptionsource = Native PROGRAM-002` (entered through `/join`, not a legacy import) |
| Verify evidence | Manuscript status `Complete` + diagnostic attempt history are sufficient evidence for the stages actually completed (intake, diagnostic). Downstream stages (editorial, distribution) have no evidence yet because they have not run — expected as Certification Exceptions, not failures. |
| Create/link workspace | See §5 |
| Create history | See §6 |
| Certify completed stages | Intake and diagnostic stages certified; Editorial/Cover/Distribution logged as open Certification Exceptions pending actual completion |
| Resume at current gate | Title re-enters the normal OP-004–OP-011 flow at its true current position (Opportunity step `2-Develop`) — OP-000 does not restart it at intake |

---

## 3. Expected Relationship State

Relationship State for this Track A pilot is certified as `Active Author`.

This does not mean the title is treated as already published or royalty-active. It means the author relationship is active inside PROGRAM-002 and should resume from the current in-flight gate rather than return to prospect/pre-contract intake.

---

## 4. Expected Workspace Mode

Workspace Mode for this Track A pilot is certified as `Active Author Workspace`.

This is distinct from `Published Author Workspace`, which remains the Track B mode for already-distributed titles. OP-000 must not force this active author through completed pre-contract steps unless required information is missing.

---

## 5. Expected SharePoint Result

Since this title entered through a real `/join` inquiry (intake reference `JMP-INT-202606-UFYG60`), a SharePoint workspace is expected to already exist somewhere in the `01_Pre-Pipeline` → `02_Active-Pipeline` lifecycle.

Expected pilot action: **link** the existing folder at its current lifecycle position — never create a duplicate, never reset it to `01_Pre-Pipeline/00_Inquiry`. If pre-pilot verification finds no folder exists (a real possibility, not assumed either way), that is a pilot finding to report to Jackie, not something the pilot silently resolves by creating one.

Dataverse remains the stage/status authority throughout — the SharePoint result is a link/verification action, not a source of truth.

---

## 6. Expected Execution-Log Events

Written to `jm1_executionlog` (confirmed canonical target — not `jm1_executionevent`), in UPPER_SNAKE_CASE per IS-008 §5.7 and the Author Workspace Onboarding Scope Note v1.0 convention:

| Event Key | Expected? | Why |
|---|---|---|
| `OP000_ADOPTION_STARTED` | Yes | OP-000 Track A adoption started |
| `OP000_IMPORTED_INTO_PROGRAM_002` | Yes | Existing active title imported into PROGRAM-002 without restarting lifecycle |
| `OP000_EDITORIAL_CERTIFIED` | Yes | Prior editorial diagnostic/review evidence certified from INT-PUB-005 commissioning records |
| `OP000_PACKAGE_CERTIFIED` | Yes | Existing package/business-source evidence certified |
| `OP000_OPPORTUNITY_LINKED` | Yes | Existing Opportunity linked; no duplicate Opportunity created |
| `OP000_WORKSPACE_LINKED` | Yes | Existing workspace expected for reuse; no duplicate SharePoint workspace |
| `OP000_AGREEMENT_PAYMENT_CERTIFIED` | Yes | Existing agreement/payment readiness evidence certified where present; no new payment or agreement action |
| `OP000_PRODUCTION_READINESS_CERTIFIED` | Yes | Existing production-readiness evidence certified without restarting production |
| `OP000_DISTRIBUTION_READINESS_CERTIFIED` | Yes | Existing distribution-readiness evidence certified without retailer submission |
| `OP000_IMPRINT_LOCKED` | Yes | `JM Works` classification locked; no JM Signature exception |
| `OP000_RELATIONSHIP_STATE_ASSIGNED` | Yes | Active Author / Active Author Workspace assigned for continuation |
| `OP000_ADOPTION_CERTIFIED` | Yes | Track A adoption certification event |

These events are historical certification evidence. They do not claim that the certified work happened on the adoption-run date.

---

## 7. Expected Certification Outcome

| Certification Item | Expected Result |
|---|---|
| Metadata | Certifiable — title, author, genre on file |
| ISBNs | Not yet assigned — title is pre-distribution; expected as open item, not a failure |
| Files | Manuscript on file (`manuscriptUrlPresent: true` per intake record) — certifiable for the stage reached |
| Contracts | Not yet confirmed in this plan — to be checked during pre-pilot verification |
| Royalty terms | Not applicable yet — pre-distribution |
| Distribution | Not started — open Certification Exception |
| Marketing assets | Not started — open Certification Exception |
| Production assets | Not started — open Certification Exception |
| Author relationship | Certifiable — real, confirmed Contact |
| Workspace | Certifiable pending §5 link confirmation |
| Execution history | Certifiable — backfilled per §6, honestly reflecting actual progress |
| Imprint | Certifiable and auto-locked — `JM Works`, high confidence, non-Signature |
| JM Signature review | Not applicable — imprint is not JM Signature, no dual-authorization question arises |

**Overall OP-000 Track A expected result: `Certified for Active Pipeline Adoption`** — this certifies the adoption path and existing evidence. It does not certify that all downstream publishing work is complete.

---

## 8. Duplicate-Prevention Checks (pre-pilot verification, read-only)

1. Confirm the adopted record resolves to Opportunity ID `2653fca9-eacd-4c44-b3ed-1764dd5d35aa` specifically — not matched or merged against the three unrelated published *Establishing Glory* volumes.
2. Confirm no second Opportunity is created — existing doctrine already states "update/use existing Opportunity. Do not create a duplicate Opportunity" (`int-pub-005-milestone-6-agreement-onboarding-readiness.md`).
3. Confirm no second SharePoint folder is created if one already exists.
4. Confirm no second Contact record is created for Jackie Smith, Jr. — match against the existing canonical Contact.

---

## 9. Explicit Confirmation: This Plan Does Not Migrate the Title

No Dataverse record for this title is created or modified by this document. No SharePoint folder is created or moved. No execution-log entry is written. No certification report is generated from hypothetical data — every value in §1 (Current State) is a real, sourced fact from this repository; every value in §2-§7 (Expected State) is explicitly labeled as an expectation pending execution, not a claim of completed work.

This pilot has no dependency on, and makes no changes to, *The Intentional Leader*'s live commissioning run.

---

*Model output is recommendation. Jackie approval creates canon. Logged execution creates operational truth.*
