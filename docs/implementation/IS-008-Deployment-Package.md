# IS-008 — Final Deployment Package

**Status:** Deployment-ready — planning complete, no live schema created, no pilot executed
**Authority:** IS-008 Pipeline Adoption & Certification Schema; IS-008 Deployment Plan; OP-000; Jackie's authorization to complete deployment readiness only (2026-07-04)
**Owner:** Jackie Smith Jr.
**Package Owner:** Cece
**Fence:** This package documents the deployment. It authorizes nothing by itself. No column, choice set, event-key entry, security role change, or pilot record is created until Jackie separately authorizes execution, per the gate in §5.

This package consolidates `IS-008-Pipeline-Adoption-Certification-Schema.md` and `IS-008-Deployment-Plan.md` into a single execution-ready reference. It supersedes neither — both remain the source of record for field-level and planning detail.

---

## 1. Deployment Sequence

### 1.1 PAC CLI order

```
1. pac auth create --environment <JM1-Dev URL>          (confirm active auth context)
2. pac solution export --path JM1_Publishing_baseline.zip --name JM1_Publishing --managed false
   → SHA-256 the export; archive as pre-IS-008 baseline (see §3 Rollback)
3. pac solution unpack --zipfile JM1_Publishing_baseline.zip --folder ./IS008-unpacked --clobber
4. [manual/scripted edit] Add Contact columns, jm1pub_title columns, 6 new global choice sets,
   jm1_executionlog event-key entries (exact mechanism depends on pre-deployment check result)
5. pac solution pack --zipfile JM1_Publishing_IS008.zip --folder ./IS008-unpacked
6. pac solution import --path JM1_Publishing_IS008.zip --environment <JM1-Dev URL>
7. [Dataverse] PublishAllXml
8. Run validation checklist (§4) against JM1-Dev
9. pac solution export --path JM1_Publishing_IS008_managed.zip --name JM1_Publishing --managed true
   (only after step 8 passes)
10. pac solution import --path JM1_Publishing_IS008_managed.zip --environment <JM1-Test URL>
11. Re-run validation checklist (§4) against JM1-Test
12. STOP — JM1-Core import is a separate, later authorization (§5)
```

This mirrors the exact tool chain used in `IS-001-Dataverse-Table-Build-Execution-Report.md` (export → unpack → edit → pack → import → publish → verify).

### 1.2 Solution import/export order

| Order | Environment | Action | Solution Type |
|---|---|---|---|
| 1 | JM1-Dev | Export baseline | Unmanaged |
| 2 | JM1-Dev | Import IS-008 changes | Unmanaged |
| 3 | JM1-Dev | Export post-validation | Managed |
| 4 | JM1-Test | Import | Managed |
| 5 | JM1-Core | Not in this package — separate authorization required | Managed (future) |

### 1.3 Security role updates

One update, applied after schema import passes validation in Dev:

| Role | Change | Environment |
|---|---|---|
| JMP Integration Service | Add field-level write grant for the 7 new columns (`jm1pub_relationshipstate`, `jm1pub_workspacemode`, `jm1pub_adoptiontrack`, `jm1pub_adoptionsource`, `jm1pub_certificationstatus`, `jm1pub_imprintlockstatus`, `jm1pub_signaturereviewrequired`) and for new `jm1_executionlog` event-key writes | Dev, then Test |
| JMP Publisher Admin | None — organization-level access already covers new columns | — |
| JMP Royalty Operator | None — no royalty/statement fields touched | — |
| JMP Agreement Manager | None — no agreement fields touched | — |
| JMP Read Only | None — read access already covers new columns | — |

### 1.4 Choice value deployment

| Choice Set | Values | New/Existing |
|---|---|---|
| `jm1pub_relationshipstate` | 4 (Prospective, Active Author, Legacy Author, Inactive) | New |
| `jm1pub_workspacemode` | 2 (Standard Pipeline Workspace, Published Author Workspace) | New |
| `jm1pub_adoptiontrack` | 3 (Track A, Track B, Track C) | New |
| `jm1pub_adoptionsource` | 2 (Native PROGRAM-002, Legacy JMP Import) | New |
| `jm1pub_certificationstatus` | 4 (Not Started, In Progress, Certified, Certification Exception) | New |
| `jm1pub_imprintlockstatus` | 3 (Unlocked, Locked, Publisher Review Pending) | New |
| `jm1_executionlog` event keys | 13 string keys (see IS-008 §5.7) | Additive to existing table — format (Choice vs. free text) confirmed at deployment time |

All 6 new choice sets are net-new — no collision risk against existing values. Only the `jm1_executionlog` addition touches a pre-existing table, and only after its live schema is confirmed (Pre-Deployment Verification, step 2 below).

### 1.5 Rollback sequence

See §3 in full. Summary: every stage below has a named rollback point before proceeding to the next.

---

## 2. Schema Impact

### 2.1 New fields

| Table | Field | Type |
|---|---|---|
| `contact` | `jm1pub_relationshipstate` | Choice |
| `contact` | `jm1pub_workspacemode` | Choice |
| `jm1pub_title` | `jm1pub_adoptiontrack` | Choice |
| `jm1pub_title` | `jm1pub_adoptionsource` | Choice |
| `jm1pub_title` | `jm1pub_certificationstatus` | Choice |
| `jm1pub_title` | `jm1pub_imprintlockstatus` | Choice |
| `jm1pub_title` | `jm1pub_signaturereviewrequired` | Two Options (Boolean) |

### 2.2 Modified fields

None. IS-008 adds columns; it does not alter any existing column's type, requirement level, or choice values on `contact`, `jm1pub_title`, or any IS-001 table.

### 2.3 Dependencies

| Dependency | Status | Risk if unmet |
|---|---|---|
| `jm1pub_title` exists in target environment with documented schema | **Unconfirmed** — IS-001 execution report found it absent in JM1-Dev at build time | Blocks all `jm1pub_title` column additions until resolved |
| `jm1_executionlog` live schema (event-type field name/type) | **Unconfirmed** in this repo | Blocks §5.7 event-key additions until resolved |
| IS-001 schema (Contact, `jm1pub_authoragreement`, etc.) | Confirmed complete (IB-001-17, Jackie sign-off 2026-06-29) | None — IS-008 does not modify it |

### 2.4 Security impact

See §1.3. One role (JMP Integration Service) requires a field-level grant update. No new role. No access-level change to any existing role.

### 2.5 Downstream flow impact

| System | Impact |
|---|---|
| Power Automate flows (IS-006, not yet built) | None currently — no live flow reads/writes these fields yet. Future flows that read `jm1pub_certificationstatus`/`jm1pub_imprintlockstatus` for gating will need to be written against this schema once IS-006 begins. |
| Azure Function diagnostic-AI runner (INT-PUB-005) | None in this pass — OP-000's BP-gate reconciliation is documentation-level only; no code change to `azure-functions/diagnostic-ai-runner` |
| Author Portal (`/author/portal`) | None directly — Published Author Workspace mode display logic is a future portal build item, not part of this schema deployment |
| `/join` route (`app/api/join/route.ts`) | None — already fixed in a prior pass (imprint-spoofing fix); IS-008 does not touch this file |

---

## 3. Rollback Plan

Exact rollback point after every stage:

| Stage | Rollback Point | Action |
|---|---|---|
| After baseline export (§1.1 step 2) | N/A — read-only | Nothing to roll back |
| After unpack/edit (§1.1 steps 3-4) | Local files only | Delete the working folder; no environment touched yet |
| After Dev import (§1.1 step 6) | **Rollback Point A** | Re-import the SHA-256-verified pre-IS-008 baseline export (§1.1 step 2 artifact) to JM1-Dev, or `pac solution delete --solution-name JM1_Publishing_IS008` if packaged as a distinct solution |
| After validation passes, before Test import (§1.1 step 9-10) | **Rollback Point B** | Same as Rollback Point A — Dev-only state, no Test/Core impact yet |
| After Test import (§1.1 step 10) | **Rollback Point C** | Re-import the pre-IS-008 baseline to JM1-Test |
| Core (production) import | **Out of scope for this package** — a separate authorization and its own rollback plan are required before Core is touched | Not applicable here |

Every rollback point restores to the SHA-256-verified baseline archived in §1.1 step 2 — the same baseline-archive discipline IS-001 used before its own changes.

---

## 4. Validation Checklist

| # | Task | Expected Evidence | Rollback Point | Jackie Approval Required |
|---|---|---|---|---|
| 1 | Confirm `jm1pub_title` exists in JM1-Dev with documented schema | Table + column list recorded in this package's execution log | N/A (read-only) | **No** — read-only check |
| 2 | Confirm `jm1_executionlog` live schema (event-type field name/type) in JM1-Core | Field name and type recorded | N/A (read-only) | **No** — read-only check |
| 3 | Confirm no existing choice-set value collisions for the `jm1_executionlog` additions | Next-available range confirmed | N/A (read-only) | **No** — read-only check |
| 4 | Export + SHA-256 baseline of current `JM1_Publishing` solution | Baseline zip + hash archived | Rollback Point A basis | **Yes** — first write-adjacent action (export itself is read-only, but marks the start of the deployment sequence) |
| 5 | Unpack, add 7 columns + 6 choice sets + `jm1_executionlog` event-key entries | Modified solution folder diff reviewed | Local files only | **No** — local file edit, no environment touched |
| 6 | Import to JM1-Dev | Import log clean, no errors | Rollback Point A | **Yes** — first live environment write |
| 7 | Publish (`PublishAllXml`) | Publish confirmation | Rollback Point A | **No** — covered by approval in step 6 |
| 8 | Schema diff review (Dev) | Only the 7 columns/6 choice sets/event-key entries changed; nothing else | Rollback Point A | **No** — verification, not a write |
| 9 | Field-level test: throwaway test Contact + `jm1pub_title` record, all new fields exercised, then deleted | No save errors; test records confirmed deleted after | Rollback Point A | **No** — test data only, self-cleaning |
| 10 | Business rule violation tests (BR-OP000-1/2/3) | Each rule blocks its violation case, including a JM Signature lock attempt | Rollback Point A | **No** — verification, not a write |
| 11 | Export managed solution from Dev | Managed zip produced, SHA-256 verified | Rollback Point B | **Yes** — promotion step |
| 12 | Import managed solution to JM1-Test | Import log clean | Rollback Point C | **Yes** — second live environment write |
| 13 | Re-run validation checklist against JM1-Test | All checks pass | Rollback Point C | **No** — verification, not a write |
| 14 | Security role update — JMP Integration Service field grant | Role tested with a test user; can write new fields, cannot write outside its scoped list | Rollback Point A/C (whichever environment) | **Yes** — permission change |
| 15 | **STOP.** No further step without separate authorization | This package's execution ends here | — | **Yes** — Core import authorization is a distinct, later gate, not implied by 1-14 |

---

## 5. Approval Gate

Consistent with `OP-000-Deployment-Risks-And-Approval-Gate.md`: this package requires **two grouped authorizations**, not one blanket approval —

1. **Steps 1-3** (read-only verification) — lowest risk, can be bundled with authorization for steps 4-10 if Jackie prefers, since nothing writes to any environment until step 6.
2. **Steps 4-14** (Dev build → Test promotion → security role update) — the actual deployment activity this package exists to authorize.

**Core (production) import is explicitly not covered by either authorization above** and requires its own separate, later review — no different from the fence IS-001 held before its own Governance Gate GO.

---

*Model output is recommendation. Jackie approval creates canon. Logged execution creates operational truth.*
