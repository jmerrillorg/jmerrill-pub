# 00 - Executive Summary

Classification: `JMP_LIFECYCLE_WAVE_B_READY_FOR_REVIEW`

Wave B establishes the Publisher Operating Center as the first real consumer of `JMP_PUBLISHING_LIFECYCLE_v1.0`.

Architectural assertion:

The Publisher Operating Center now reads and presents the canonical JMP lifecycle authority without migrating live operational state.

Implemented scope:

- Added a reusable canonical Operating Center projection adapter at `lib/publishing/lifecycle/operating-center-read-model.ts`.
- Extended `PublisherTitleOperatingCard` with `canonicalLifecycle`.
- Replaced Operating Center stage-column derivation with Wave A registry-derived stages.
- Added operator-visible lifecycle dimensions, mapping status, Waiting On, System Attention, Author Action Required, next governed action, artifact authority, readiness, commercial/workspace/royalty data gaps, and diagnostics.
- Added deterministic Wave B projection guard coverage and CI wiring.

Production mutation boundary:

- live title stage writes: 0
- live title substage writes: 0
- Dataverse schema changes: 0
- Power Automate changes: 0
- author communications: 0
- Stripe mutations: 0
- agreement/referral/editorial/distribution/post-publication mutations: 0
- new competing lifecycle authority: 0
- UI-owned stage sequence: 0
- automatic conflict guessing: 0
