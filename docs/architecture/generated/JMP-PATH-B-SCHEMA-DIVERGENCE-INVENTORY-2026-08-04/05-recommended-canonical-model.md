# Recommended Canonical Model

## Model Principle

Path B should not introduce parallel names for authorities already settled by Publishing canon. The v1.0 target architecture should use existing canonical entities first, then add only the missing entities needed for release planning, product-form attributes, and distribution job execution.

## Recommended Entity Spine

| Layer | Canonical entity | Use |
|---|---|---|
| Party | `contact` | Person / author identity |
| Agreement | `jm1pub_contract` | Contract / agreement basis |
| Intellectual Work | `jm1pub_title` | Book as a concept and Title-Pubs identifier authority |
| Edition instance | `jm1pub_edition` | Real title edition/product form instance; requires edition-level ISBN or identifier |
| Asset operational layer | `jm1pub_publishingasset` | PAM format / edition / ISBN-bearing asset; existing operational layer until `jm1pub_edition` is promoted/reconciled |
| Marketplace presence | `jm1pub_assetmarketplace` | Marketplace/distribution presence for an asset |
| Editorial/production artifact | `jm1pub_editorialartifact` | Governed artifact references, visibility, checksum, version, stage/gate linkage |
| Execution proof | `jm1_executionlog` | Idempotent event, evidence, and mutation proof layer |

## New or Extended Concepts

| Need | Recommended model | Disposition |
|---|---|---|
| Title product form | Extend `jm1pub_edition`; reconcile with `jm1pub_publishingasset` rather than creating `jm1_titleproductform`. | `EXTEND_EXISTING_ENTITY` |
| Product-form attributes | Create a normalized child of Edition Catalog Definition only if Slice 2 needs live editable attributes. It must preserve PF-04 narration, PF-05 complexity, PF-07 schema-inert, and PF-08 scoping-gated rules. | `NEW_ENTITY_REQUIRED` |
| Release plan | Create a release-plan coordination entity after catalog reconciliation. It should reference title, edition, package, scoping gate, release anchor date, and author-facing status projection. | `NEW_ENTITY_REQUIRED` |
| Production mode | Do not create as a controlling authority. If needed, model as an execution setting under a stage/job while preserving Publishing Track, package tier, and SOW gates. | `CONFLICT` |
| Artifact | Do not create a generic `jm1_artifact`. Extend `jm1pub_editorialartifact` and PAM file-reference fields with missing fields such as Editorial Master version, FTL evidence reference, and `CORRECTION_AUTHORIZED` if approved. | `CONFLICT` |
| Distribution job | Add a subordinate job entity for submission attempts, retries, acceptance, failure handling, and distributor readbacks. It must not replace `jm1pub_assetmarketplace` or `jm1_executionlog`. | `NEW_ENTITY_REQUIRED` |

## Minimum v1.0 Field Requirements

Before Path B can become canonical v1.0, the target model must include or explicitly map:

- Parent `jm1pub_title`.
- Parent `jm1pub_edition` or reconciled PAM publishing asset.
- Edition-level ISBN or distribution identifier.
- Product Form `PF-01` through `PF-08`.
- Publishing Track.
- Package selection and package slot entitlement.
- PF attributes.
- Editorial Master version.
- Title-level artifact authority.
- PF-level artifact authority.
- Release anchor date.
- Distributor submission date.
- Confirmed-live date.
- Scoping/SOW gate.
- FTL evidence reference.
- `CORRECTION_AUTHORIZED`.
- Author-facing status projection.
- Required `jm1_executionlog` events and idempotency keys.

## Implementation Gate

Do not implement Path B until:

1. Catalog reconciliation is complete.
2. Slice 2 Dataverse commercial catalog deployment is complete or explicitly superseded.
3. `jm1pub_edition` and `jm1pub_publishingasset` relationship authority is reconciled.
4. PF-07 remains schema-inert and non-public unless separately authorized.
5. PF-08 remains active but scoping-gated.
6. Artifact authority is resolved without generic `jm1_artifact` duplication.

