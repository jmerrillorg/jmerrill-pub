# 01 - Read Model Contract

The canonical projection is `CanonicalPublisherReadModel`.

Required fields covered:

- author
- bookTitle
- prospectCommercialState
- authorRelationshipState
- titleLifecycleStage
- titleLifecycleSubstage
- legacySourceState
- canonicalMappingStatus
- status
- executionStatus
- waitingOn
- systemAttention
- authorActionRequired
- sourceArtifact
- working/recommended/confirmed imprint
- package recommendation/acceptance/payment
- joinedTheFamily
- editorial/production/cover/metadata/distribution/post-publication
- workspace state and entitlement state
- onboarding
- royaltyPayoutReadiness
- nextGovernedAction
- age

Unavailable fields return `DATA_GAP` or `NOT YET AVAILABLE` rather than invented state.
