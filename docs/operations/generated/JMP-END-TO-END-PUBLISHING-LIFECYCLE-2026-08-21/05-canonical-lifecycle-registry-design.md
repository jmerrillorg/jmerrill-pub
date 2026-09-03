# 05 - Canonical Lifecycle Registry Design

## Proposed Authority

`JMP_PUBLISHING_LIFECYCLE_v1.0`

## Proposed Location

Repository source:

`lib/publishing/lifecycle/registry.ts`

Generated/operational documentation:

`docs/architecture/publishing/JMP_PUBLISHING_LIFECYCLE_v1.0.md`

## Proposed Schema

Required fields:

| Field | Purpose |
|---|---|
| lifecycleVersion | Versioned authority identifier |
| stageCode | Canonical code, e.g. `01_INQUIRY_INTAKE` |
| stageName | Canonical founder-approved name |
| sequence | Canonical ordering |
| substageCode | Optional substage, e.g. `06B_LINE_EDITING` |
| substageSequence | Ordering inside parent stage |
| lifecycleDimension | ProspectCommercial, Title, AuthorRelationship |
| entryCondition | Required source-backed condition |
| exitContract | Exact event/artifact/state required to exit |
| sourceOfTruth | Dataverse/Stripe/SharePoint/execution log authority |
| governingArtifactTypes | Required artifact types |
| qualityGate | Validation policy |
| waitingOwners | Prospect, Author, JMP, JMP/System, External |
| systemAttentionBehavior | When system must surface a hold |
| authorGateRequired | Boolean plus gate artifact contract |
| parallelWorkAllowed | Preparatory work allowed before irreversible gate |
| nextStage | Governed transition target |
| terminal | Terminal/nonterminal |
| adapters | Runtime mapping for legacy labels/codes |

## Adapter Strategy

Adapters should map, not replace, current sources:

- J0-J8 Pipeline Register to canonical stages.
- Package Engine stage codes to canonical stage/substage package policies.
- Notification Engine package types to canonical package policies.
- Editorial runtime `STAGE_SEQUENCE` to 06A/06B/06C and 07 handoff.
- Dataverse option-set values to prospect/commercial dimensions.
- Operating Center workload states to canonical title cards.

## Migration Strategy

Wave A introduces registry and read-only adapters only. No live title mutation. Subsequent waves switch one consumer at a time to registry-derived policy and prove before/after behavior with tests and readback.

## Validation Strategy

Validation should fail when:

- an unknown stage code appears;
- a runtime label maps to more than one canonical stage without context;
- a transition skips a required author gate;
- a package policy has mismatched artifact roles between package and notification engines;
- a title/asset/commercial/relationship state is collapsed into one field.
