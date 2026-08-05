# Rider Compliance Matrix

Named source note: no file named `Activation Wave Riders 1-3` was found on `origin/main`. This matrix uses the explicit rider requirements in the executive instruction and the approved commercial/PAM/editorial evidence present on `origin/main`.

| Requirement | Current canon status | Path B v0.9 status | Compliance | Required disposition |
|---|---|---|---|---|
| `jm1pub_title` | Canonical Intellectual Work and Title-Pubs identifier surface | Not explicitly preserved by proposed names | FAIL | `EXTEND_EXISTING_ENTITY` |
| `jm1pub_edition` | Approved Title Edition target in commercial architecture | Collides with `jm1_titleproductform` if renamed | FAIL | `EXTEND_EXISTING_ENTITY` |
| Edition-level ISBN | Required on Title Edition; operationally present on `jm1pub_publishingasset` | Not explicit | FAIL | `EXTEND_EXISTING_ENTITY` |
| Publishing Track | Approved: Hybrid, Traditional, Institutional-Government, Partnership-Commissioned | At risk of conflation with `jm1_productionmode` | FAIL | `CONFLICT` |
| Package entitlement fields | Approved package tiers and slot counts exist in commercial projection | Not explicit | FAIL | `EXTEND_EXISTING_ENTITY` |
| Slot entitlement fields | Edition slot eligibility exists in commercial projection | Not explicit | FAIL | `EXTEND_EXISTING_ENTITY` |
| PF attributes | Approved as PF-04 narration, PF-05 complexity, PF-07/PF-08 program-only flags | Needs normalized child or attribute record | PARTIAL | `NEW_ENTITY_REQUIRED` |
| Editorial Master version | Artifact version label exists; exact Editorial Master version field not found | Not explicit | FAIL | `RESEARCH_REQUIRED` |
| Title-level artifact authority | `jm1pub_editorialartifact` title lookup exists | Generic `jm1_artifact` would obscure it | FAIL | `CONFLICT` |
| PF-level artifact authority | `jm1pub_editorialartifact` publishing asset lookup and PAM file references exist | Generic `jm1_artifact` would obscure it | FAIL | `CONFLICT` |
| Release anchor date | Title Edition requires publication/release dates; no release-plan entity | Implied by `jm1_releaseplan` | PARTIAL | `NEW_ENTITY_REQUIRED` |
| Submission date | Required through distribution submission evidence/events | Not guaranteed | FAIL | `NEW_ENTITY_REQUIRED` |
| Confirmed-live date | Required through distributor acceptance/live evidence/events | Not guaranteed | FAIL | `NEW_ENTITY_REQUIRED` |
| Scoping/SOW gate | Quote/SOW commercial posture approved | Not explicit | FAIL | `CONFLICT` for production mode; `NEW_ENTITY_REQUIRED` for release/distribution workflow |
| FTL evidence | No exact canonical field found on main | Not explicit | FAIL | `RESEARCH_REQUIRED` |
| `CORRECTION_AUTHORIZED` | Related approval/decision fields exist; exact field not found | Not explicit | FAIL | `EXTEND_EXISTING_ENTITY` |
| Author-facing status projection | Author Workspace hides internal labels and uses author-safe module language | Not explicit | FAIL | `EXTEND_EXISTING_ENTITY` |
| `jm1_executionlog` event requirements | Edition lifecycle event spec defines required events/payload | Not explicit | FAIL | `EXTEND_EXISTING_ENTITY` or `NEW_ENTITY_REQUIRED` by concept |

## Compliance Summary

| Result | Count |
|---|---:|
| PASS | 0 |
| PARTIAL | 2 |
| FAIL | 16 |

Path B must be rewritten before v1.0 so that its entities extend or subordinate to current canon instead of renaming settled authorities.

