# Golden Path and Negative Path

Last verified: 2026-08-26

## Synthetic Golden Path

Result: PASS

Events: 28

Path:

`NEW_PROSPECT -> INTAKE_DURABLE -> MANUSCRIPT_RECEIVED -> NORMALIZED -> EDITORIAL_REVIEW_READY -> REVIEW -> RECOMMENDATION -> PACKAGE_ACCEPTED -> PRICING_LOCKED -> AGREEMENT -> FIRST_PAYMENT_SYNTHETIC_STATE -> JOINED_THE_FAMILY -> BLOCK_04 -> EDITORIAL_COMPLETE -> BLOCK_05 -> PRODUCTION_COMPLETE -> BLOCK_06 -> DISTRIBUTION_AUTHORIZED -> BLOCK_07 -> TITLE_LIVE_AND_VERIFIED -> BLOCK_08_LAUNCH -> BLOCK_09_TITLE_MANAGEMENT_ACTIVE -> LAUNCH_CYCLE_COMPLETE -> EVERGREEN_HANDOFF -> BLOCK_09_CONTINUES -> AUTHOR_RELATIONSHIP_UPDATED -> FUTURE_NEW_PROJECT -> BLOCK_01_RETURNING_AUTHOR_RECOGNIZED`

Returning author loop: PASS

Real email/payment/distribution/marketing mutations: 0

## Negative Golden Path

Result: PASS

Probes: 19 / 19 PASS

The negative path denies duplicate intake, wrong author/title binding, missing manuscript, package-not-accepted, incomplete agreement, insufficient payment state, Editorial bypass, cadence bypass, production without certification, stale artifact, release without Publisher authorization, distribution without frozen manifest, live claimed without verification, launch with broken CTA, Block 09 waiting for Block 08, list-price royalty basis, contract-specific economics overwrite, archival with unresolved liability, and returning author recognition failure.
