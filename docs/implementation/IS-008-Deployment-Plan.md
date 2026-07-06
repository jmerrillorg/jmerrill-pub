# IS-008 — Dataverse Deployment Plan

**Status:** Planning only — no schema created, no data written, no solution imported
**Authority:** IS-008 Pipeline Adoption & Certification Schema; OP-000; Jackie's continuity authorization to move OP-000 from documentation into deployment planning (2026-07-04)
**Owner:** Jackie Smith Jr.
**Plan Owner:** Cece
**Fence:** This document plans the deployment. It does not execute it. No column, choice set, or event-key entry is created in JM1-Dev or JM1-Core until Jackie explicitly authorizes execution after reviewing this plan.

---

## 1. Purpose

This plan turns `IS-008-Pipeline-Adoption-Certification-Schema.md` into an executable deployment sequence, following the same discipline IS-001 used (spec → pre-deployment verification → Dev build → Test validation → Jackie sign-off → Production). It stops short of execution, per this workstream's explicit authorization boundary: plan only, do not create live schema without separate go-ahead.

---

## 2. Pre-Deployment Verification (must complete before any build step)

These are read-only checks against the live environment — no writes, no schema changes:

| # | Check | Why it matters | Owner |
|---|---|---|---|
| 1 | Confirm `jm1pub_title` exists in JM1-Dev with a documented column list | IS-001's own execution report found it absent in JM1-Dev at build time. If still absent, every `jm1pub_title` column addition in IS-008 §4.2 is blocked until that table exists — this is a build-order dependency, not something IS-008 resolves. | Cece (read-only query) |
| 2 | Confirm `jm1_executionlog`'s live schema in JM1-Core: exact event-type field name, and whether it is a Choice column or free text | IS-008 §5.7's event-key list is written generically (string keys) because this repo confirms the table but not its column shape. Wrong assumption here breaks every event write OP-000 makes. | Cece (read-only query) |
| 3 | Confirm current next-available Choice values for any *existing* choice set IS-008 extends (none currently — IS-008 §5.1–§5.6 are net-new choice sets, so no collision risk there; only §5.7 touches an existing table) | Avoids silently colliding with a value already in use | Cece (read-only query) |
| 4 | Confirm JM1-Dev is reachable and JM1-Core is not touched by any of the above | Matches the IS-001 fence: Dev/Test first, Core only after Jackie approval | Cece |

**If check 1 or 2 fails (table/field absent or shape unknown), stop and report to Jackie before proceeding to §3.** This is exactly the kind of blocker the Incidental Completion Rule does not cover — it's a real environment dependency, not a documentation inconsistency.

---

## 3. Field Additions/Changes Summary

Restating IS-008 §4 for deployment sequencing (full detail lives in IS-008; nothing here changes it):

**Contact:**
| Field | Type | Choice Set |
|---|---|---|
| `jm1pub_relationshipstate` | Choice | §5.1 (4 values) |
| `jm1pub_workspacemode` | Choice | §5.2 (2 values) |

**`jm1pub_title`:**
| Field | Type | Choice Set |
|---|---|---|
| `jm1pub_adoptiontrack` | Choice | §5.3 (3 values) |
| `jm1pub_adoptionsource` | Choice | §5.4 (2 values) |
| `jm1pub_certificationstatus` | Choice | §5.5 (4 values) |
| `jm1pub_imprintlockstatus` | Choice | §5.6 (3 values) |
| `jm1pub_signaturereviewrequired` | Two Options (Boolean) | — |

**`jm1_executionlog`:** no new columns — only new event-key entries per IS-008 §5.7 (13 keys), format depending on pre-deployment check #2.

No lookups, no new tables, no relationship changes (IS-008 §6).

---

## 4. Security / Permission Impact

| Role (existing, per IS-001 §13) | Impact |
|---|---|
| JMP Publisher Admin | Gains read/write on the 7 new columns automatically (organization-level, full-table access already granted). No role definition change needed. |
| JMP Royalty Operator | No impact — none of the new columns are royalty/statement fields. |
| JMP Agreement Manager | No impact — none of the new columns are agreement fields. |
| JMP Read Only | Gains read on the 7 new columns automatically. No role definition change needed. |
| JMP Integration Service | **Needs an explicit field-level grant** to write `jm1pub_relationshipstate`, `jm1pub_workspacemode`, `jm1pub_adoptiontrack`, `jm1pub_adoptionsource`, `jm1pub_certificationstatus`, `jm1pub_imprintlockstatus`, `jm1pub_signaturereviewrequired`, and to write new `jm1_executionlog` entries — this role is deliberately narrow-scoped (IS-001 §13: "scoped to the minimum fields required") and does not automatically inherit new columns. This is the one real security change this deployment requires. |

No new security role is created. No existing role's access level changes. The only action is adding 7 field names to the JMP Integration Service role's existing narrow field list.

---

## 5. PAC CLI Deployment Approach

Following the same tool chain IS-001 actually used (`IS-001-Dataverse-Table-Build-Execution-Report.md`):

```
pac solution export --path JM1_Publishing_IS008.zip --name JM1_Publishing --managed false
pac solution unpack --zipfile JM1_Publishing_IS008.zip --folder ./IS008-unpacked --clobber
# Add/edit: Contact and jm1pub_title column XML, new global choice sets, jm1_executionlog event-key entries
pac solution pack --zipfile JM1_Publishing_IS008.zip --folder ./IS008-unpacked
pac solution import --path JM1_Publishing_IS008.zip --environment <JM1-Dev URL>
# PublishAllXml, then run verification queries against JM1-Dev
```

Sequence:

1. Export current `JM1_Publishing` solution from JM1-Dev (unmanaged, for editing).
2. Unpack, add the 7 columns + 6 choice sets + `jm1_executionlog` event-key entries (exact mechanism depends on pre-deployment check #2 result).
3. Pack, import to **JM1-Dev only**.
4. Publish, then run the validation checklist (IS-008 §10) against JM1-Dev.
5. Export a **managed** solution from JM1-Dev once validated.
6. Import the managed solution to **JM1-Test** (if distinct from JM1-Dev in current environment topology — confirm during execution) and re-run validation.
7. **Stop.** JM1-Core import happens only after Jackie reviews validation results and issues explicit deployment authorization — same fence IS-001 used before Governance Gate GO.

No step touches JM1-Core in this plan. Steps 1-6 are Dev/Test only.

---

## 6. Rollback / Export Plan

| Stage | Rollback Action |
|---|---|
| Before any import | Nothing to roll back — export/unpack/pack are local file operations only |
| After Dev import, before validation passes | `pac solution delete --solution-name JM1_Publishing_IS008` (if packaged as a separate solution) or restore the pre-IS-008 unmanaged export as a re-import, matching IS-001's own approach of keeping a SHA-256-verified baseline archive before each change |
| After Test import | Same as Dev — re-import the pre-IS-008 baseline |
| After Core import (only after Jackie authorization, out of scope for this plan) | Restore from the pre-deployment managed solution backup; Dataverse column deletions are non-destructive to existing data on other columns, but a rollback plan must still be re-confirmed at that time, not assumed from this document |

**Baseline requirement before any Dev import:** export and SHA-256-verify the current `JM1_Publishing` solution exactly as IS-001 did (`IS-001-Dataverse-Table-Build-Execution-Report.md` describes this baseline-archive discipline) so there is always a known-good state to restore to.

---

## 7. Validation Planning

| Step | Description | Environment |
|---|---|---|
| Schema diff review | Compare pre- and post-import solution exports; confirm only the 7 columns, 6 choice sets, and `jm1_executionlog` event-key entries changed — nothing else | Dev |
| Solution export backup | SHA-256-verified baseline archived before any import (see §6) | Dev |
| Field-level test in Dev | Create one throwaway test Contact and one throwaway test `jm1pub_title` record (clearly marked test data, deleted after), set each new field through all its Choice values, confirm no save errors and business rules BR-OP000-1/2/3 fire correctly on violation cases | Dev |
| Business rule violation tests | Attempt to lock `jm1pub_imprintlockstatus = Locked` on a JM Signature-imprint test record without both BP-07 authorizations present — must block (BR-OP000-1); attempt `Certified` with an open exception — must block (BR-OP000-2); attempt `Published Author Workspace` with no `jm1pub_relationshipstate` — must block (BR-OP000-3) | Dev |
| Controlled pilot | Only after the above pass and Jackie reviews results — see `OP-000-Pilot-Adoption-Plan.md`. Pilot uses real titles but is still non-production-write until Jackie separately authorizes each record's actual adoption. | Test → Production, gated |
| Post-deployment verification checklist | IS-008 §10, re-run in full against whichever environment was just changed | Dev / Test / Core (each stage) |

---

## 8. What This Plan Does Not Do

Per this workstream's explicit boundaries:

- Does not create any live column, choice set, or event-key entry.
- Does not modify production data.
- Does not migrate any catalog record.
- Does not create any author, title, workspace, contract, or royalty record — duplicate or otherwise.
- Does not auto-lock JM Signature under any test case (the Dev test above exists specifically to prove it can't).
- Does not touch `The Intentional Leader`'s live commissioning run in any way — this plan operates entirely outside that title's workspace/records.

---

## 9. Jackie Approval Required Before Live Schema Change

Exactly one approval gate stands between this plan and execution:

**Jackie reviews this deployment plan and the IS-008 schema spec, then explicitly authorizes:**
1. Pre-deployment verification (§2) to run against JM1-Dev (read-only — low risk, could arguably proceed without a separate ask, but held here since "do not create live schema yet unless explicitly authorized" was stated broadly).
2. If verification passes, Dev solution build/import (§5 steps 1-4).
3. Test promotion (§5 steps 5-6), separately, after Dev validation passes.
4. **Core (production) import is a separate, later authorization — not implied by authorizing Dev/Test.**

No other governance decision is outstanding. This is a scoped, technical go/no-go — not a doctrine or canon question.

---

*Model output is recommendation. Jackie approval creates canon. Logged execution creates operational truth.*
