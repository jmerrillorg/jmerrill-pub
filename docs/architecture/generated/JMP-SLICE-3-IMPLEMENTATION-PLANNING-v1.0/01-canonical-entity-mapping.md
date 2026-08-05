# Canonical Entity Mapping

Implementation authority: NO
Schema mutation authority: NO

| Concept | Canonical entity/concept | Already exists | Extension required | New entity required | Reason | Disposition | Blocked by unresolved authority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Title lifecycle aggregate | jm1pub_title | YES | YES | NO | Title is canonical title-level authority; extend existing table for lifecycle summary, FTL, release, correction and author projection fields. | EXTEND_EXISTING | NO for planning; implementation blocked until schema implementation authorization. |
| Edition / product-form instance | jm1pub_edition | YES per canonical architecture; live completeness requires readback | YES | NO | Edition is canonical PF-instance authority for PF-01 through PF-08 states and identifiers. | EXTEND_EXISTING | YES for fields affected by edition-vs-asset unresolved decisions. |
| Commercial authority | jm1pub_commercialcatalogitem | YES; Slice 2 deployed | NO | NO | Commercial catalog item remains deployed authority for sellable forms, pricing, quoting, contract status, PF-07 inert posture and PF-08 SOW gating. | USE_EXISTING | NO. Read dependency only. |
| Execution log | jm1_executionlog | YES | YES | NO | Existing log authority is reused and extended as needed to carry exact event contract, idempotency, payload hashes and object lookups. | EXTEND_EXISTING | NO for planning; implementation blocked until schema authorization. |
| Editorial Master versions | existing canonical artifact authority | PARTIAL/UNRESOLVED | TBD | TBD | Architecture requires versioned Editorial Master and artifact references, but table/entity ownership is a governed gap. | BLOCKED_PENDING_AUTHORITY | YES. Cannot finalize affected implementation until authority names and storage model are resolved. |
| Source/output artifact references | existing canonical artifact authority | PARTIAL/UNRESOLVED | TBD | TBD | Slice 3 needs source/output artifact linkage, but must not invent a competing artifact table name. | BLOCKED_PENDING_AUTHORITY | YES for artifact-specific schema. |
| Production mode | existing production-mode authority | CONFLICT DOCUMENTED | TBD | NO until resolved | Production-mode authority conflict is carried forward; planning records choice and fail-closed behavior only. | CONFLICT | YES for affected runtime and schema fields. |
| PF attribute values | jm1pub_edition fields or child/config entity after decision | NO | TBD | TBD | PF-specific complexity fields can be fields unless extensible multi-value attributes are approved. | BLOCKED_PENDING_AUTHORITY | YES for storage model. |
| Release plans | jm1pub_title field initially; child entity if approved | NO | TBD | TBD | Release model and anchor can be title fields for simple plan; many release plans require explicit entity authority. | BLOCKED_PENDING_AUTHORITY | YES for multi-plan implementation. |
| Distribution jobs | execution-log event initially; child entity if approved | NO | TBD | TBD | Submission/readback can be event-driven; queue/job tracking may require child entity. | BLOCKED_PENDING_AUTHORITY | YES for job table implementation. |
| Author-facing projection | calculated projection or persisted projection if approved | NO | TBD | TBD | Projection can be calculated from title/edition state unless persistence is explicitly approved. | BLOCKED_PENDING_AUTHORITY | YES for persisted projection. |
| Correction authorization | execution-log event plus optional child/config entity | NO | TBD | TBD | CORRECTION_AUTHORIZED is canonical event; durable multi-edition authority may require child entity. | BLOCKED_PENDING_AUTHORITY | YES for correction table implementation. |
| Transition definitions | configuration entity or static registry after approval | NO | TBD | TBD | Transition matrix is canonical design; implementation may use config entity or versioned static registry after architecture decision. | BLOCKED_PENDING_AUTHORITY | YES for registry storage. |

## Naming Guard

This package uses the approved publishing entities and concepts only. Legacy or provisional competing names are not introduced as implementation targets.
