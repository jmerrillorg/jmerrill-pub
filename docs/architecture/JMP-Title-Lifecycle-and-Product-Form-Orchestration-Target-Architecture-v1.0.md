# JMP Title Lifecycle & Product-Form Orchestration - Target Architecture v1.0

Classification: CANON-CANDIDATE
Created: 2026-08-05
Implementation authority: NO
Schema mutation authority: NO
Slice 3-5 authorization: NO
Client-title automation: FROZEN
Client-title operations: MANUAL

## Authority Boundary

This document is a ratification candidate only. It does not authorize implementation, schema mutation, client-title automation, public-surface mutation, Business Central mutation, contract generation, author communication, or Slice 3-5 execution.

The current architecture work is unblocked because Slice 2 commercial catalog authority is complete and PF-08 authority has been corrected through the protected Slice 2 mechanism. The next action after this document is executive review, not production implementation.

## Evidence Basis

| Evidence | Source |
|---|---|
| Path B schema divergence inventory | `docs/architecture/generated/JMP-PATH-B-SCHEMA-DIVERGENCE-INVENTORY-2026-08-04/05-recommended-canonical-model.md` |
| Deployed commercial catalog authority | `jm1pub_commercialcatalogitem` / `jm1pub_commercialcatalogitems` |
| Slice 2 final ruling population | `docs/architecture/generated/JMP-CATALOG-RECONCILIATION-FINAL-2026-08-05/09-slice2-seed-manifest.json` |
| Slice 2 schema specification | `docs/architecture/generated/JMP-COMMERCIAL-CATALOG-SCHEMA-SPEC-2026-08-05/01-schema-manifest.json` |
| Matrix v1.1 product-form basis | `docs/operations/generated/2026-07-20-JMP-Commercial-Architecture-Dataverse-and-BC-Crosswalk.md` |
| J0-J8 lifecycle authority | `docs/operations/generated/JM1-WAVE-2-ENTERPRISE-STANDARD-APPROVALS-2026-08-01/03-approved-pipeline-register.md` |
| J0-J8 source mapping | `azure-functions/diagnostic-ai-runner/src/canon/milestoneCanonAlignment.js` |
| PF-08 amendment execution | GitHub Actions run `31019468597` |

## Current State

| Area | State |
|---|---|
| Slice 2 commercial catalog | COMPLETE / PRODUCTION-VERIFIED |
| Catalog rulings | 120 / 120 RECONCILED |
| Physical catalog records | 118 |
| PF-07 | SCHEMA_INERT / NO COMMERCIAL RECORD REQUIRED |
| PF-08 canonical SKU | `JMP-INT-EPUB3-STD` |
| PF-08 status | ACTIVE / SOW-GATED |
| Legacy interactive SKU | `JMP-DES-INTERACTIVE` / SUPERSEDED |
| PF-08 idempotency | PASS |
| Client-title automation | FROZEN |
| Client-title operations | MANUAL |

The 118-record physical count is correct. The governing population is 120 reconciled rulings, while two MERGE rulings are represented by already-existing canonical records.

## Canonical Entity Spine

The target architecture must use the merged canonical entity spine before adding new concepts.

| Layer | Entity | Target role |
|---|---|---|
| Party | `contact` | Person / author identity |
| Agreement | `jm1pub_contract` | Contract / agreement basis |
| Intellectual work | `jm1pub_title` | Book as concept and Title-Pubs identifier authority |
| Edition instance | `jm1pub_edition` | Real title edition or product-form instance; requires edition-level ISBN or identifier |
| Transitional asset layer | `jm1pub_publishingasset` | Existing operational asset layer until `jm1pub_edition` and publishing asset authority are reconciled |
| Marketplace presence | `jm1pub_assetmarketplace` | Marketplace and distribution presence for an asset |
| Commercial authority | `jm1pub_commercialcatalogitem` | Deployed Slice 2 commercial catalog authority for pricing, quoting, visibility, sellable posture, supersession, and SOW gating |
| Editorial / production artifact | `jm1pub_editorialartifact` | Governed artifact references, visibility, checksum, version, stage/gate linkage |
| Execution proof | `jm1_executionlog` | Idempotent event, evidence, mutation proof, and replay traceability |

Do not create parallel authority entities for title, edition, artifact, production mode, or commercial catalog functions already covered above.

## Publishing Track Handling

Publishing Track controls payer, entitlement, package responsibility, and operational presentation. It does not change SKU identity.

Track-dependent behavior must be modeled as:

- title or contract context for author-facing and payment responsibility;
- package entitlement context for included slots and premium upcharges;
- commercial catalog read dependency for price, quoting, and sellable posture;
- execution-log evidence for any track-dependent operational decision.

## Product Forms

Exactly PF-01 through PF-08 are in scope.

| Code | Product form | Target treatment |
|---|---|---|
| PF-01 | Paperback | Standard edition product form |
| PF-02 | Hardcover | Standard edition product form |
| PF-03 | Standard Ebook (born-accessible) | Born-accessible standard ebook; not a paid accessibility upgrade |
| PF-04 | Audiobook | Product form with narration-method attribute: AI, Human Single-Voice, Human Multi-Voice |
| PF-05 | Large Print | Product form with complexity attribute: Standard or Complex |
| PF-06 | Complex-Content Accessibility Edition | Premium / conformance edition |
| PF-07 | Vertical Graphic Edition | SCHEMA_INERT; no commercial row required |
| PF-08 | Interactive / Multimedia Edition | ACTIVE / SOW-GATED through `JMP-INT-EPUB3-STD` |

Product-form attributes must not create false sub-forms. `PF-05C` must not be created. PF-04 narration method and PF-05 complexity are attributes of the product form, not new product-form codes.

## PF-07 Rule

PF-07 remains schema-inert. Its absence from the sellable commercial catalog is correct.

The architecture must not create a placeholder commercial row merely to prove PF-07 exists. A future PF-07 activation would require separate authority, schema treatment, public/private policy, pricing treatment, and execution proof.

## PF-08 Rule

Canonical SKU: `JMP-INT-EPUB3-STD`

Required target posture:

- product form: PF-08 - Interactive / Multimedia;
- commercial status: ACTIVE;
- quoting status: SOW_GATED;
- scope gate: SOW_GATED;
- pricing method: STARTING_AT;
- price expression: Starting at $1,500; advanced features require SOW;
- requires SOW: YES;
- contract posture: contractable only after approved scope;
- legacy SKU `JMP-DES-INTERACTIVE`: SUPERSEDED and not reactivated.

PF-08 can be visible only according to approved public-surface policy. PF-08 cannot start ordinary production without approved scope.

## Lifecycle Anchors

J0-J8 is approved as the lifecycle vocabulary and record structure for enterprise capability movement. Each gate requires evidence before any package, title, capability, or agent is presented as active or proven.

The merged sources bind these currently evidenced anchors:

| Anchor | Merged source binding | Architecture use |
|---|---|---|
| J0-J8 | `JMP-PIPELINE-BLUEPRINT-v1_0.md` source mapping | Lifecycle sequencing authority; expanded label set remains a gap until directly materialized in merged source |
| J1/J2 | Included services, package, onboarding, agreement policy | Package, onboarding, and agreement prerequisites |
| J2 exit | AI disclosure capture before AI-assisted editorial / production execution | Gate before AI-assisted work |
| J3 | Editorial stage tracker, editorial event vocabulary, G3 exit, editorial doctrine | Title-level editorial authority and editorial-stage tracking |
| J3/J4 | Line edit, copyedit, proofread, mandatory style sheet | Editorial master and proofing handoff boundary |
| J4 | Cover validation and release lock before date commitments and downstream submissions | Format & Title Lock and release-lock boundary |
| J5/J6 | Distribution review, strategy, launch planning | Distribution and launch planning boundary |
| J6 | Launch readiness, author marketing kit, marketing support | Launch readiness and author-facing status projection boundary |
| J8 | Annual review and loyalty progression | Post-release lifecycle boundary; not started |

No title movement is authorized merely because a J-label exists. Evidence must show authority, actor, timestamp, correlation, source record, and next action.

## Editorial And Production Authority

Title-level editorial authority belongs to `jm1pub_title`, `jm1pub_editorialstage`, `jm1pub_editorialartifact`, approval gates, and execution logs.

Edition-level production states belong to `jm1pub_edition` or the reconciled `jm1pub_publishingasset` bridge until edition authority is fully promoted. Production state must reference product form and commercial authority, but commercial catalog state does not by itself make a title ready for production.

The target architecture must preserve:

- versioned Editorial Master;
- `CORRECTION_AUTHORIZED`;
- Format & Title Lock;
- title-level artifact authority;
- edition-level production evidence;
- author-facing plain-language status projection.

## Format & Title Lock

Format & Title Lock is the boundary after which edition identity, title metadata, and release-critical format commitments are controlled.

ISBN assignment must occur only after verified Format & Title Lock evidence. Additions after Format & Title Lock may be permitted only when they do not swap slots, invalidate edition identity, bypass product-form authority, or break release/submission evidence.

Companion Editions must be represented as governed edition relationships or release-plan relationships. They must not be modeled as hidden slot swaps, duplicate product forms, or untracked author-facing commitments.

## Release Dates And Propagation

The release architecture must distinguish:

- release anchor date;
- distributor submission date;
- confirmed-live date;
- author-facing plain-language status;
- minimum propagation lead.

Minimum propagation lead is 21 days unless separately superseded by approved channel policy. Release anchor changes after submission require execution-log evidence and author-facing status projection updates.

## Execution-Log Event Taxonomy

The architecture requires event names and idempotency keys for:

- catalog authority read dependency;
- edition creation or reconciliation;
- product-form assignment;
- Editorial Master version lock;
- `CORRECTION_AUTHORIZED`;
- Format & Title Lock;
- ISBN assignment after verified FTL;
- release anchor set or changed;
- distributor submission;
- confirmed-live readback;
- companion edition relationship creation;
- author-facing status projection;
- idempotent replay.

The current repository already includes Slice 2 event families such as `CATALOG_SLICE2_PF08_AUTHORITY_AMENDED` and `CATALOG_SLICE2_PF08_AUTHORITY_ALREADY_APPLIED`. This document does not create Dataverse execution-log rows.

## Entitlement And Pricing Dependencies

Entitlement, package slots, premium upcharges, quoting status, sellable status, SOW gates, and pricing display depend on the deployed Slice 2 commercial catalog.

No entitlement or pricing logic should be duplicated inside title lifecycle code. Title lifecycle may read catalog authority; it must not become the catalog authority.

## Manual Client-Title Operations

Client-title automation remains frozen. Client-title operations remain manual.

Manual operation means a human may use this architecture for review and planning, but no automation may:

- advance title lifecycle state;
- assign ISBNs;
- generate contracts;
- submit to distributors;
- change release dates;
- send author-facing messages;
- mutate Business Central;
- activate Slice 3-5 workflows.

## Unresolved-Gap Register

| Gap | Current disposition | Required next action |
|---|---|---|
| Expanded J0-J8 label set | Merged sources approve J0-J8 and map several anchors, but the full expanded label list is not directly materialized in the reviewed files | Materialize or cite the approved pipeline register source containing the exact J0-J8 labels before canon promotion |
| `jm1pub_edition` / `jm1pub_publishingasset` reconciliation | Path B recommends reconciliation before implementation | Decide relationship authority and migration/read model before Slice 3 implementation |
| Product-form attributes entity | Recommended only if Slice 2 needs live editable attributes | Decide whether attributes remain static definitions or become a child entity |
| Release-plan entity | Recommended after catalog reconciliation; not implemented here | Specify fields, ownership, relationships, and status vocabulary |
| Contract status vocabulary | Live commercial catalog currently exposes `CONTRACTABLE` / `NOT_CONTRACTABLE`; architecture needs contractable-after-approved-scope semantics | Add approved vocabulary or mapping before schema mutation |
| PF-08 public visibility | Amendment uses active SOW-gated authority; final public vs conditional surface policy remains reviewable | Executive/public-surface review before public presentation changes |
| Companion Editions | Concept required but relationship model not yet ratified | Define permitted relationship types and author-facing display rules |
| 21-day propagation exceptions | Minimum lead stated as target architecture rule; channel-specific exceptions not mapped | Produce channel-policy register before release automation |
| Execution-log taxonomy | Required event families listed; not yet deployed as a complete taxonomy | Create event taxonomy package before implementation |
| Client-title automation | Frozen | Executive review required before any thaw |

## Promotion Criteria

This document can move from CANON-CANDIDATE toward canon only after:

1. Executive review accepts or amends the unresolved-gap register.
2. The exact expanded J0-J8 labels are materialized from merged authority or this document is amended to cite the authoritative source.
3. `jm1pub_edition` and `jm1pub_publishingasset` reconciliation is decided.
4. Contractable-after-approved-scope vocabulary is approved or mapped to deployed schema.
5. Companion Editions are modeled without slot swapping.
6. Release-plan and propagation-lead rules are accepted.
7. Architecture consistency guards pass.
8. A separate implementation authorization is issued for any Slice 3-5 work.

## Explicit Non-Authorization

This document does not:

- reopen Slice 2;
- create or amend commercial catalog records;
- create a PF-07 commercial row;
- reactivate `JMP-DES-INTERACTIVE`;
- mutate Dataverse schema;
- mutate Business Central;
- change public website presentation;
- authorize client-title automation;
- authorize Slice 3, Slice 4, or Slice 5.
