# J0-J8 Binding

Status: DESIGN ONLY
Implementation authority: NO

## Binding Rule

J0-J8 is canonical lifecycle authority, but the reviewed merged files do not materialize the complete expanded J0-J8 label set. This package binds only to current merged authority and documents gaps where authority is missing.

Do not invent stages.

## Current Merged Source Binding

| Slice 3 concept | Current binding | Source | Gap |
|---|---|---|---|
| Content Freeze | J3/J4 editorial handoff area | line edit, copyedit, proofread, mandatory style sheet mapping | exact J-label not materialized |
| FTL | J4 release lock boundary | BP10 Release Lock governs date commitments and downstream submissions | FTL-specific event vocabulary needs implementation package |
| ISBN | after verified FTL | Target Architecture v1.0 and commercial architecture require edition-level ISBN after lock | exact J-label not materialized |
| PF Activation | J1/J2 contract/package + Slice 2 catalog + PF state machine | package/contract authority and catalog authority | expanded J-label not materialized |
| Distribution Ready | J5/J6 distribution review and launch planning boundary | publishing strategy mapping and launch readiness mapping | exact J-label not materialized |
| Submission | J5/J6 release/distribution area | BP10 release lock and BP11 launch readiness | exact J-label not materialized |
| Release | J6 launch readiness / confirmed-live | BP11 launch readiness and release readiness sources | exact release-event mapping incomplete |
| Companion Editions | no complete direct J0-J8 authority materialized | Target Architecture requires governed edition/release-plan relationship | relationship model gap remains |

## Anchor Map

| Anchor | Current merged evidence |
|---|---|
| J0-J8 overall | approved as lifecycle vocabulary and record structure |
| J1/J2 | included services, package, onboarding, agreement policy |
| J2 exit | AI disclosure capture before AI-assisted execution |
| J3 | editorial stage tracker, editorial event vocabulary, G3 exit |
| J3/J4 | line edit, copyedit, proofread, mandatory style sheet |
| J4 | cover validation and release lock before date commitments/downstream submissions |
| J5/J6 | distribution review, strategy, launch planning |
| J6 | launch readiness and author marketing support |
| J8 | annual review and loyalty progression; not started |

## Documented Gaps

| Gap | Required before implementation |
|---|---|
| Expanded J0-J8 labels | Materialize or cite exact approved pipeline register with labels |
| Content Freeze vocabulary | Define relationship to Editorial Master and FTL |
| FTL event vocabulary | Define exact proof/event requirements |
| Companion Editions | Define relationship types, slot policy, and release-plan handling |
| Submission/release event mapping | Bind events to J-labels without inventing stages |

## Non-Authorization

This binding does not authorize:

- stage creation;
- schema mutation;
- runtime transition enforcement;
- client-title automation;
- release/submission work.

