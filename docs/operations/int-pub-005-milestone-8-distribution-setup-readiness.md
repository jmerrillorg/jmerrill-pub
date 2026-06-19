# INT-PUB-005 Milestone 8 Distribution Setup Readiness

## Purpose

Milestone #8 defines the governed distribution setup readiness system after Milestone #7 production readiness. It prepares title metadata, ISBN/imprint decisions, production file readiness, pricing/territory readiness, channel setup, proof-order review, internal visibility, task payloads, and safe Dataverse evidence.

Milestone #8 stops before launch, release, retail publication, royalty setup, and post-release management.

## Required Distribution Setup Rule

Distribution setup may not proceed unless all are true:

1. Production files are complete or explicitly waived by Jackie.
2. Title metadata is approved.
3. ISBN/imprint decision is approved.
4. Print interior file is approved or print is not applicable.
5. eBook file is approved or eBook is not applicable.
6. Cover file is approved.
7. Pricing and territory setup is approved.
8. At least one governed distribution channel is selected.
9. Human distribution setup authorization is recorded.
10. `JM1_DISTRIBUTION_SETUP_ENABLED=true`.
11. Safe Dataverse evidence can be created.

If any condition is missing, Milestone #8 must fail closed and produce readiness blockers only.

## Distribution Setup Gate

Gate:

- `JM1_DISTRIBUTION_SETUP_ENABLED`

Default:

- `false`

Milestone #8 must not open:

- `JM1_AI_EXECUTION_ENABLED`
- `JM1_INTERNAL_NOTIFICATIONS_ENABLED`
- `JM1_AUTHOR_RESPONSE_SEND_ENABLED`
- `JM1_PUBLISHING_ONBOARDING_ENABLED`
- `JM1_OPPORTUNITY_CREATION_ENABLED`
- `JM1_OPPORTUNITY_UPDATE_ENABLED`
- `JM1_AGREEMENT_PREPARATION_ENABLED`
- `JM1_STRIPE_PAYMENT_OPTIONS_ENABLED`
- `JM1_AUTHOR_PAYMENT_LINK_SEND_ENABLED`
- `JM1_PRODUCTION_AUTHORIZATION_ENABLED`

## Distribution Setup Paths

Milestone #8 covers these setup paths:

| Path | Purpose | Human Checkpoint |
| --- | --- | --- |
| `TITLE_METADATA` | Title, subtitle, author name, description, categories, keywords | `TITLE_METADATA_APPROVAL` |
| `ISBN_IMPRINT` | ISBN status and imprint decision | `ISBN_IMPRINT_APPROVAL` |
| `PRINT_FILE_SETUP` | Print interior file readiness | `PRINT_FILE_APPROVAL` |
| `EBOOK_FILE_SETUP` | eBook file readiness | `EBOOK_FILE_APPROVAL` |
| `COVER_FILE_SETUP` | Cover file readiness | `COVER_FILE_APPROVAL` |
| `PRICING_TERRITORY` | Price, currency, territory, discount readiness | `PRICING_TERRITORY_APPROVAL` |
| `CHANNEL_SETUP` | Distribution channel readiness | `CHANNEL_SETUP_APPROVAL` |
| `PROOF_ORDER_REVIEW` | Proof-order review before any public release | `PROOF_ORDER_APPROVAL` |

Confirmed distribution channels supported by the readiness model:

- `INGRAM_PRINT`
- `EBOOK_RETAIL`
- `AUTHOR_DIRECT`
- `LIBRARY_RETAIL_NETWORK`

## Dataverse Payload Targets

Milestone #8 uses the same safe task target confirmed in Milestone #7:

- table: `jm1_publishingtask`
- entity set: `jm1_publishingtasks`
- task fields: `jm1_taskname`, `jm1_iscompleted`, `jm1_duedate`

Milestone #8 prepares task payloads only after the readiness rule passes. Task payload preparation is not live task creation.

Safe evidence target:

- `jm1_executionlogs`

The evidence payload records identifiers, readiness result, blockers, and boundary confirmations. It must not include manuscript text, prompt body, raw model output, Ingram credentials, retailer credentials, FTP credentials, API keys, tokens, payment links, invoice URLs, live retail links, or release details.

## Internal Visibility

Milestone #8 prepares internal visibility to:

- `publishing@jmerrill.one`

The notification is internal-only. It does not include the author in To/CC/BCC, does not send author email, and does not submit distribution data.

## Explicit Stop Before Launch/Release

Milestone #8 stops before:

- launch/release
- retail publication
- public release-date setting
- royalty setup
- post-release management

Those belong to later milestones and require separate governed authorization.

## Implementation

The Milestone #8 readiness implementation is:

`azure-functions/diagnostic-ai-runner/src/distribution/milestone8DistributionSetupReadiness.js`

It provides:

- distribution setup gate model
- distribution prerequisite check
- title metadata readiness
- ISBN/imprint readiness
- print/eBook/cover file readiness
- pricing/territory readiness
- channel setup readiness
- proof-order review readiness
- task template/payload model
- human checkpoint model
- internal visibility payload
- safe execution-log payload
- fail-closed unsafe field handling

It does not:

- submit to Ingram
- submit to any retailer
- publish retail listings
- set public release dates
- launch or release a book
- start royalty setup
- start post-release management
- send author email
- create payment links
- create invoices
- charge cards
- create duplicate Opportunity
- use QBO
- expose credentials

## Current Controlled Record

Milestone #7 is complete for the system. The current controlled record remains:

| Item | Value |
| --- | --- |
| Intake reference | `JMP-INT-202606-UFYG60` |
| Diagnostic ID | `64e387e0-7e6a-f111-a826-00224820105b` |
| Existing Opportunity | `2653fca9-eacd-4c44-b3ed-1764dd5d35aa` |
| Opportunity name | `Publishing Intake - Establishing Glory: The Library` |

Milestone #8 distribution setup readiness is system-ready, but live distribution setup remains blocked until the distribution readiness rule passes and `JM1_DISTRIBUTION_SETUP_ENABLED=true`.
