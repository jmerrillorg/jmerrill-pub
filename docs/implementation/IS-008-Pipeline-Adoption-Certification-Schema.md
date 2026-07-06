# IS-008 — Pipeline Adoption & Certification Schema

**Status:** Draft — Requires Jackie approval before build begins
**Authority:** OP-000 Pipeline Adoption, Recovery & Catalog Certification; IS-001 (does not reopen its schema); PROGRAM-002 Author Workspace Onboarding Scope Note v1.0 (CANON, approved 2026-07-03) — confirms `jm1_executionlog` as the live execution-log target
**Owner:** Jackie Smith Jr.
**Build Owner:** Cece (continuity from Cody)
**Environment:** JM1-Core (`jm1hq.crm.dynamics.com`) — production. JM1-Dev (`org52409ff2.crm.dynamics.com`) — build/test target.
**Fence:** No schema creation, data write, or solution import to JM1-Core until Jackie approval and Governance Gate GO, consistent with IS-001.

---

## 1. Purpose and Scope

This specification adds the minimum Dataverse fields required for OP-000 to adopt and certify legacy, active, and published titles into PROGRAM-002. It does not reopen or modify the royalty/agreement schema defined in IS-001.

**In scope:** New Choice/Boolean columns on `contact` and `jm1pub_title`; new event-key entries on the live `jm1_executionlog` table.
**Out of scope:** New tables, changes to `jm1pub_authoragreement`/`jm1pub_titleownership`/`jm1pub_royaltyrule`/`jm1pub_royaltystatement`/`jm1pub_royaltyline`, Business Central, Stripe, Power Automate flow changes, and any Azure Function (`azure-functions/diagnostic-ai-runner`) code change.

---

## 2. Non-Goals

This specification intentionally does not:

- Redesign the royalty/agreement schema settled by IS-001.
- Introduce a second party/identity model. Contact remains canonical.
- Create `jm1pub_title` if it does not already exist. Its presence in the target environment must be confirmed before this spec is deployed — the IS-001 execution report found it absent in JM1-Dev at build time (`IS-001-Dataverse-Table-Build-Execution-Report.md:72`). If still absent, that is a build-order blocker for this spec, not something this spec resolves.
- Modify the INT-PUB-005 BP/Milestone gate code. The reconciliation described in OP-000 is documentation-level only in this pass.
- Make licensing, entitlement, or compliance decisions.

If a build question arises during IS-008 execution that appears to require any of the above, stop and route to Jackie.

---

## 3. Pre-Deployment Verification Required

Before any column in this spec is created:

1. Confirm `jm1pub_title` exists in the target environment and record its actual schema name/columns (not assumed from other docs).
2. Confirm `jm1_executionlog`'s exact live schema in JM1-Core (its event-type field name, and whether it's a Choice column or free text) before adding the entries in §5.7 — this repo confirms the table is canonical (per the Author Workspace Onboarding Scope Note v1.0 and the IS-001 execution report's own statement that "the legacy `jm1_executionlog` table remains in JM1-Core as current-state/legacy proof infrastructure") but does not document its column list. Do not confuse it with `jm1_executionevent`, which is a separate, dependency-light table created only for the JM1-Dev/Foundation ALM package (per `ALM-001-Portable-Solution-Packaging.md`) and is not a live business-event log target.

---

## 4. New/Changed Columns

### 4.1 Contact enhancements

| Display Name | Schema Name | Type | Required | Notes |
|---|---|---|---|---|
| Relationship State | `jm1pub_relationshipstate` | Choice | No | See choice set §5.1. New — distinct from `jm1pub_authorstatus` (IS-001 §7.2) and `jm1_loyaltytier` (Milestone 10); see OP-000 "Relationship State" disambiguation table. |
| Workspace Mode | `jm1pub_workspacemode` | Choice | No | See choice set §5.2. Placed on Contact (author-first, per PROGRAM-002 Core Principle), not per-title. |

### 4.2 `jm1pub_title` enhancements

| Display Name | Schema Name | Type | Required | Notes |
|---|---|---|---|---|
| Adoption Track | `jm1pub_adoptiontrack` | Choice | No | See choice set §5.3. Null = native PROGRAM-002 title, never adopted through OP-000. |
| Adoption Source | `jm1pub_adoptionsource` | Choice | No | See choice set §5.4. |
| Certification Status | `jm1pub_certificationstatus` | Choice | No | See choice set §5.5. |
| Imprint Lock Status | `jm1pub_imprintlockstatus` | Choice | No | See choice set §5.6. |
| Signature Review Required | `jm1pub_signaturereviewrequired` | Two Options (Yes/No) | No | Mirrors the existing diagnostic-AI canon flag name (`signatureReviewRequired`) used in `docs/operations/int-pub-005-stage0-diagnostic-knowledge-md-content-review.md`, so the same concept has one name across both governance systems. |

---

## 5. Choice Sets

All choice sets are global (solution-scoped) and prefixed `jm1pub_`, following IS-001's numbering convention (values start at `100000000`).

### 5.1 `jm1pub_relationshipstate`
| Label | Value |
|---|---|
| Prospective | 100000000 |
| Active Author | 100000001 |
| Legacy Author | 100000002 |
| Inactive | 100000003 |

### 5.2 `jm1pub_workspacemode`
| Label | Value |
|---|---|
| Standard Pipeline Workspace | 100000000 |
| Published Author Workspace | 100000001 |

### 5.3 `jm1pub_adoptiontrack`
| Label | Value |
|---|---|
| Track A - Active Pipeline Adoption | 100000000 |
| Track B - Published Author Workspace Adoption | 100000001 |
| Track C - Catalog Certification Only | 100000002 |

### 5.4 `jm1pub_adoptionsource`
| Label | Value |
|---|---|
| Native PROGRAM-002 | 100000000 |
| Legacy JMP Import | 100000001 |

### 5.5 `jm1pub_certificationstatus`
| Label | Value |
|---|---|
| Not Started | 100000000 |
| In Progress | 100000001 |
| Certified | 100000002 |
| Certification Exception - Publisher Review | 100000003 |

### 5.6 `jm1pub_imprintlockstatus`
| Label | Value |
|---|---|
| Unlocked | 100000000 |
| Locked | 100000001 |
| Publisher Review Pending | 100000002 |

### 5.7 `jm1_executionlog` event-key additions

`jm1_executionlog` is the live, canonical execution/audit log — confirmed by `PROGRAM-002-Author-Workspace-Onboarding-Scope-Note-v1.0.md`, which logs Author Workspace onboarding events there using UPPER_SNAKE_CASE string keys (e.g. `WORKSPACE_PRE_CONTRACT_PROVISIONED`, `AGREEMENT_SIGNED`). OP-000 adds the following event keys in the same convention, not as Dataverse Choice integer values — confirm during deployment whether `jm1_executionlog`'s event-type field is a Choice column or free text, per §3 item 2, before assuming this list is a Choice-set addition:

| Event | Log Entry |
|---|---|
| Adopted into PROGRAM-002 | `TITLE_ADOPTED_INTO_PROGRAM002` |
| Editorial completed, source Legacy JMP | `EDITORIAL_COMPLETED_LEGACY` |
| Cover approved, source Legacy JMP | `COVER_APPROVED_LEGACY` |
| Distribution completed, source Legacy JMP | `DISTRIBUTION_COMPLETED_LEGACY` |
| Certified by Jackie Smith Jr. | `CERTIFIED_BY_JACKIE` |
| Certification exception logged | `CERTIFICATION_EXCEPTION_LOGGED` |
| Imprint assigned | `IMPRINT_ASSIGNED` |
| Imprint locked | `IMPRINT_LOCKED` |
| Signature review flagged | `SIGNATURE_REVIEW_FLAGGED` |
| Workspace created | `ADOPTION_WORKSPACE_CREATED` |
| Workspace linked | `ADOPTION_WORKSPACE_LINKED` |
| Relationship State assigned | `RELATIONSHIP_STATE_ASSIGNED` |
| Migration completed | `ADOPTION_MIGRATION_COMPLETED` |

If `jm1_executionlog`'s event-type field turns out to be a Choice column rather than free text, these become Choice labels instead of string keys, with values assigned at deployment time from the actual next-available range — not guessed here.

---

## 6. Relationships

No new relationships. All new columns are scalar (Choice/Boolean) additions to existing tables (`contact`, `jm1pub_title`). No new lookups.

---

## 7. Referential Integrity / Business Rules

| Rule | Table | Condition | Action |
|---|---|---|---|
| BR-OP000-1 | `jm1pub_title` | `jm1pub_imprintlockstatus = Locked` and imprint = JM Signature | Block save unless both BP-07 dual-authorization fields (existing, per diagnostic-AI canon) are independently recorded |
| BR-OP000-2 | `jm1pub_title` | `jm1pub_certificationstatus = Certified` | Requires no open Certification Exception on that title |
| BR-OP000-3 | `contact` | `jm1pub_workspacemode = Published Author Workspace` | Requires `jm1pub_relationshipstate` to be set (not null) |

---

## 8. Auditing

| Table | Field | Audit |
|---|---|---|
| `jm1pub_title` | `jm1pub_imprintlockstatus`, `jm1pub_certificationstatus`, `jm1pub_signaturereviewrequired` | Yes |
| `contact` | `jm1pub_relationshipstate`, `jm1pub_workspacemode` | Yes |

Consistent with IS-001's "audit everything with financial or legal significance" principle — imprint lock and certification status both gate downstream production/marketing decisions.

---

## 9. Deployment Order

1. Confirm pre-deployment items in §3.
2. Choice sets §5.1–§5.6 (new).
3. `jm1_executionlog` event-key additions §5.7 (confirm live schema and, if Choice-based, next-available values first).
4. Contact column additions §4.1.
5. `jm1pub_title` column additions §4.2.
6. Business rules §7.
7. Auditing §8.
8. Validation checklist (§10).

---

## 10. Validation Checklist

| Check | Expected Result |
|---|---|
| `jm1pub_title` confirmed present in target environment with documented schema | ✓ Schema recorded before any column is added |
| `jm1_executionlog` live schema confirmed (event-type field name and type) | ✓ Confirmed reachable for writes; not confused with `jm1_executionevent` (Dev/Foundation ALM only) |
| All 6 new choice sets created, values match §5 | ✓ Choice values confirmed |
| `jm1_executionlog` event-key additions do not collide with existing entries | ✓ Confirmed at deployment time, not assumed from this doc |
| Contact/`jm1pub_title` column additions present and non-breaking | ✓ Existing records unaffected |
| Business rules BR-OP000-1 through BR-OP000-3 active | ✓ Each tested with a violation case, including the real *A Portrait of Paradise* JM Signature case from OP-000 |
| No changes made to IS-001 tables/columns | ✓ Diff confirms IS-001 schema untouched |
| No schema changes to JM1-Core | ✓ Core environment unmodified until Jackie approval |

---

## 11. Acceptance Criteria

IS-008 is complete when:

1. All validation checklist items pass.
2. A written validation report is submitted referencing each checklist item.
3. Jackie reviews and approves.
4. Approval is logged to the confirmed live execution-event table with `last_verified_date`, evidence source, and owner (Jackie Smith Jr.).

*Model output is recommendation. Jackie approval creates canon. Logged execution creates operational truth.*
