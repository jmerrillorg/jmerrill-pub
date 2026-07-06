# OP-000 — Deployment Risks, Blockers & Jackie Approval Gate

**Status:** Track A pilot authorized; broader schema/catalog expansion remains separately fenced
**Authority:** Jackie's continuity authorization to move OP-000 into deployment planning (2026-07-04); Jackie's authorization to begin PROGRAM-002 Phase II with one Track A pilot (2026-07-05)
**Owner:** Jackie Smith Jr.

---

## 1. Risks

| Risk | Where it surfaces | Mitigation already in the plan |
|---|---|---|
| `jm1pub_title` may not exist in JM1-Dev | IS-008 §3 pre-deployment check #1 | Read-only confirmation required before any column is added; if absent, this is a build-order blocker to report, not silently work around |
| `jm1_executionlog`'s exact column shape (Choice vs. free text) is undocumented in this repo | IS-008 §3 pre-deployment check #2 | Event-key list (§5.7) written generically so it can convert to either format once confirmed; no guessed Choice values |
| Establishing Glory: The Library could be mismatched against the three unrelated published *Establishing Glory* volumes already in the catalog | Pilot Candidate 1, duplicate-prevention check #1 | Match by Opportunity ID (`2653fca9-eacd-4c44-b3ed-1764dd5d35aa`), never by title-string similarity |
| A Portrait of Paradise already carries the JM Signature imprint live, with no dual-authorization on file | Pilot Candidate 3 | This is treated as the intended exception-path test, not swept under an auto-lock; BR-OP000-1 blocks any lock attempt |
| Track B titles with genre blank in the catalog (e.g. 100 Wisdom Lessons) have no classification signal | Pilot Candidate 2 | Existing recorded imprint is accepted as-is rather than re-derived from missing data, avoiding a false "conflict" escalation |
| JMP Integration Service role does not automatically inherit new fields | IS-008 Deployment Plan §4 | Explicit field-level grant identified as the one real security change this deployment requires |
| Confusing `jm1_executionlog` (live, production) with `jm1_executionevent` (Dev/Foundation ALM sandbox only) | Already corrected once in OP-000/IS-008 during the prior session | Both docs now explicitly cross-reference and distinguish the two tables at every mention |

None of these risks require a governance decision to resolve — each has a defined, mechanical next step (a read-only check, a matching rule, or an expected exception path). None blocks progress; each is a "confirm this, then proceed" item.

---

## 2. Blockers Requiring Jackie (Governance-Level)

**None.** Consistent with the original OP-000 build, everything identified in this deployment-planning pass is resolvable under existing locked doctrine (JM Signature Governance Overlay, Management by Exception Doctrine, SharePoint Workspace Rule, Author Workspace Onboarding Scope Note v1.0) or is a mechanical/technical pre-check, not a policy question.

---

## 3. Current Approval Boundary

Planning is complete and Jackie has authorized the first Track A pilot for *Establishing Glory: The Library*. That authorization is limited to proving OP-000 adoption for one active title and does not authorize Track B, Track C, catalog-wide adoption, production data redesign, or unrelated schema expansion.

The implementation may execute the Track A pilot gate-by-gate, stopping automatically at any failed check:

1. Deploy the OP-000 Track A runner.
2. Open `JM1_OP000_ADOPTION_ENABLED` only for the controlled run.
3. Execute the allowlisted *Establishing Glory: The Library* adoption.
4. Validate execution-log evidence and duplicate prevention.
5. Close the gate.
6. Mark Track A certified only if validation passes.

**Broader JM1-Core schema/catalog movement remains explicitly out of scope for this authorization** and requires its own, later, separate approval. Nothing in this authorization touches Business Central, Stripe, royalties, distribution submission, production release, or additional titles.

Track B, Track C, and catalog-wide adoption must not begin until Track A is certified.

---

*Model output is recommendation. Jackie approval creates canon. Logged execution creates operational truth.*
