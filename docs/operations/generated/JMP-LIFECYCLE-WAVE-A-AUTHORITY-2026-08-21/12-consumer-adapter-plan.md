# 12 - Consumer Adapter Plan

| Consumer | Classification | Wave A status |
|---|---|---|
| Dataverse adapters | READY_FOR_ADAPTER | Mapping contract exists; no schema mutation |
| Diagnostic/author Functions | READY_FOR_ADAPTER | Legacy stage sequence can map through registry |
| Publisher Operating Center | READY_FOR_ADAPTER | Recommended next Wave B consumer |
| Power Automate | LEGACY_READ_ONLY | Map flows first; no live edits |
| Author Workspace | LEGACY_READ_ONLY | Read-only future adapter |
| Editorial workers | NEEDS_REMEDIATION_FIRST | Line runtime hold remains |
| Production runtime | NEEDS_REMEDIATION_FIRST | Production task/title linkage needs later wave |
| Communication business services | READY_FOR_ADAPTER | Package/notification semantics defined |
| Payment-event runtime | READY_FOR_ADAPTER | Joined the Family contract defined |
| Distribution services | LEGACY_READ_ONLY | Stage 08/09 contracts defined; implementation later |

Wave A exposes a lightweight library: `getCanonicalStage`, `getCanonicalSubstage`, `isTransitionAllowed`, `validateTransition`, `isStageApplicable`, `validateWaitingOwner`, and `mapLegacyLifecycleValue`.
