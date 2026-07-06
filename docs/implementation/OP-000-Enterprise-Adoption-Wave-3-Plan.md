# OP-000 Enterprise Adoption Wave 3 Plan

**Program:** PROGRAM-002
**Mode:** Enterprise Adoption Operations
**Wave:** Wave 3
**Status:** Certified
**Date:** 2026-07-06

## Authority

Jackie authorized OP-000 Enterprise Adoption Wave 3 after the Enterprise Imprint Canonization Initiative.

## Imprint Authority

`books.json` is not authoritative for imprint assignment. Wave 3 uses `data/enterprise-imprint-canonization.json` as the canonized imprint recommendation source.

## Wave 3 Selection

| # | Author | Title | Current Published Imprint | Canonized PROGRAM-002 Imprint | Canon Decision | Contract Status | Stripe Status |
|---:|---|---|---|---|---|---|---|
| 1 | Juanita Travis | *Rhyming It up with Church Stuff* | JM Little | JM Little | LOCKED | Signed / Exists - Location Pending Reconciliation | Stripe Migration Required |
| 2 | Karen Hill | *The Great Hair Restart* | JM Works | JM Works | LOCKED | Signed / Exists - Location Pending Reconciliation | Stripe Migration Required |
| 3 | Kiena Hughley | *Your Peace Is a Priority* | J Merrill Publishing | J Merrill Publishing | LOCKED | Signed / Exists - Location Pending Reconciliation | Stripe Migration Required |
| 4 | Leslie Banks | *Uncomfortable Conversations with God* | J Merrill Publishing | J Merrill Publishing | LOCKED | Signed / Exists - Location Pending Reconciliation | Stripe Migration Required |
| 5 | Lisa Clark | *Let Me Tell You About It* | JM Works | JM Works | LOCKED | Signed / Exists - Location Pending Reconciliation | Stripe Migration Required |
| 6 | M A Grayson | *Mirror of Refining Insight* | JM Works | J Merrill Publishing | LOCKED | Signed / Exists - Location Pending Reconciliation | Stripe Migration Required |
| 7 | Mack Hughley | *When a Thug Meets Jesus* | J Merrill Publishing | J Merrill Publishing | LOCKED | Signed / Exists - Location Pending Reconciliation | Stripe Migration Required |
| 8 | TJ Mars | *Hop, Hop, Hop* | JM Little | JM Little | LOCKED | Signed / Exists - Location Pending Reconciliation | Stripe Migration Required |
| 9 | Adrean Young | *Naughty Tales* | JM Works | JM Works | LOW CONFIDENCE | Signed / Exists - Location Pending Reconciliation | Stripe Migration Required |
| 10 | Bishop Thomas Johnson | *God's Word For This World* | J Merrill Publishing | J Merrill Publishing | LOW CONFIDENCE | Signed / Exists - Location Pending Reconciliation | Stripe Migration Required |

## Selection Rationale

Wave 3 begins with all remaining clean single-title candidates whose canonized imprint decision is `LOCKED`. Because only eight remaining single-title candidates met that condition, the wave includes the next two remaining single-title candidates with `LOW CONFIDENCE` decisions. Those two titles may be adopted, but their PROGRAM-002 imprint lock remains Publisher Review Pending.

## Expected Coverage Impact

| Metric | Before Wave 3 | After Wave 3 |
|---|---:|---:|
| Catalog titles adopted | 22 | 32 |
| Published authors adopted | 22 | 32 |
| Active Author Workspaces certified | 23 | 33 |
| OP-000 remaining catalog titles | 100 | 90 |
| OP-000 remaining published authors | 49 | 39 |
| Enterprise Coverage | 18.03% | 26.23% |

## Certification Evidence

Wave 3 was executed through the governed `run-op000-track-b-adoption` endpoint after PR #200 was merged and `func-jm1-diagnostic-ai-runner` was redeployed.

| Author | Title | Endpoint Result | Canonized Imprint | Lock Status | Dataverse Evidence |
|---|---|---|---|---|---|
| Juanita Travis | *Rhyming It up with Church Stuff* | `OP000_TRACK_B_ADOPTION_CERTIFIED` | JM Little | Locked | 10 OP000 execution-log events |
| Karen Hill | *The Great Hair Restart* | `OP000_TRACK_B_ADOPTION_CERTIFIED` | JM Works | Locked | 10 OP000 execution-log events |
| Kiena Hughley | *Your Peace Is a Priority* | `OP000_TRACK_B_ADOPTION_CERTIFIED` | J Merrill Publishing | Locked | 10 OP000 execution-log events |
| Leslie Banks | *Uncomfortable Conversations with God* | `OP000_TRACK_B_ADOPTION_CERTIFIED` | J Merrill Publishing | Locked | 10 OP000 execution-log events |
| Lisa Clark | *Let Me Tell You About It* | `OP000_TRACK_B_ADOPTION_CERTIFIED` | JM Works | Locked | 10 OP000 execution-log events |
| M A Grayson | *Mirror of Refining Insight* | `OP000_TRACK_B_ADOPTION_CERTIFIED` | J Merrill Publishing | Locked | 10 OP000 execution-log events |
| Mack Hughley | *When a Thug Meets Jesus* | `OP000_TRACK_B_ADOPTION_CERTIFIED` | J Merrill Publishing | Locked | 10 OP000 execution-log events |
| TJ Mars | *Hop, Hop, Hop* | `OP000_TRACK_B_ADOPTION_CERTIFIED` | JM Little | Locked | 10 OP000 execution-log events |
| Adrean Young | *Naughty Tales* | `OP000_TRACK_B_ADOPTION_CERTIFIED` | JM Works | Publisher Review Pending | 10 OP000 execution-log events |
| Bishop Thomas Johnson | *God's Word For This World* | `OP000_TRACK_B_ADOPTION_CERTIFIED` | J Merrill Publishing | Publisher Review Pending | 10 OP000 execution-log events |

Total evidence written: 100 OP000 execution-log events.

## Safety Boundaries

Wave 3 does not run `/join`, send author/customer communications, regenerate contracts, request signatures, start Stripe onboarding, touch royalty payments, touch Business Central, create payments, create duplicate workspaces, start production/distribution, overwrite historical published imprints, or run catalog-wide adoption.

## Gate State

`JM1_OP000_TRACK_B_ADOPTION_ENABLED=false` after certification. `JM1_OP000_ADOPTION_ENABLED=false` after certification.
