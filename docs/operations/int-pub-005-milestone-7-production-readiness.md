# INT-PUB-005 Milestone 7 Production Readiness

## Purpose

Milestone #7 defines the governed production-readiness system after Milestone #6 package, agreement, onboarding, and payment readiness are satisfied. It prepares production authorization, task creation, human checkpoints, internal visibility, and Dataverse evidence without starting distribution, release, royalty setup, or post-release management.

Milestone #7 does not authorize live production for a real author unless the author-specific readiness rule passes.

## Required Author-Specific Readiness Rule

Production for a real author may not start unless all of these are true:

1. Author package selection is recorded.
2. Agreement requirement is satisfied or explicitly waived by Jackie.
3. Onboarding requirement is satisfied or explicitly waived by Jackie.
4. Payment requirement is satisfied or explicitly waived by Jackie.
5. Human production authorization is recorded.
6. `JM1_PRODUCTION_AUTHORIZATION_ENABLED=true`.
7. Safe Dataverse evidence can be created.

If any condition is missing, Milestone #7 must fail closed and produce readiness blockers only.

## Production Authorization Gate

Gate:

- `JM1_PRODUCTION_AUTHORIZATION_ENABLED`

Default:

- `false`

The gate is separate from:

- `JM1_AI_EXECUTION_ENABLED`
- `JM1_INTERNAL_NOTIFICATIONS_ENABLED`
- `JM1_AUTHOR_RESPONSE_SEND_ENABLED`
- `JM1_PUBLISHING_ONBOARDING_ENABLED`
- `JM1_OPPORTUNITY_CREATION_ENABLED`
- `JM1_OPPORTUNITY_UPDATE_ENABLED`
- `JM1_AGREEMENT_PREPARATION_ENABLED`
- `JM1_STRIPE_PAYMENT_OPTIONS_ENABLED`
- `JM1_AUTHOR_PAYMENT_LINK_SEND_ENABLED`

Milestone #7 must not open diagnostic, author-email, onboarding, Opportunity, agreement, payment-link, or Stripe payment gates.

## Production Paths

Milestone #7 production readiness covers these internal production paths:

| Path | Purpose | Human Checkpoint |
| --- | --- | --- |
| `EDITORIAL_PRODUCTION` | Editorial production plan and handoff | `EDITORIAL_PLAN_APPROVAL` |
| `DESIGN_COVER_LAYOUT` | Cover and layout design brief | `DESIGN_BRIEF_APPROVAL` |
| `PROOFING` | Proofing plan and proof review | `PROOF_REVIEW_APPROVAL` |
| `FILE_READINESS` | Print/digital file readiness check | `FILE_READINESS_APPROVAL` |

The model prepares task payloads only after the readiness rule passes. The payload target is `jm1_publishingtask` / `jm1_publishingtasks`, using the confirmed safe fields:

- `jm1_taskname`
- `jm1_iscompleted`
- `jm1_duedate`

Task payload preparation is not live task creation.

## Human Checkpoints

Milestone #7 requires these human checkpoints:

- `PRODUCTION_AUTHORIZATION_REVIEW`
- `EDITORIAL_PLAN_APPROVAL`
- `DESIGN_BRIEF_APPROVAL`
- `PROOF_REVIEW_APPROVAL`
- `FILE_READINESS_APPROVAL`
- `DISTRIBUTION_RELEASE_STOP_REVIEW`

The final checkpoint is intentionally a stop sign. It prevents Milestone #7 from drifting into distribution, release, royalty setup, or post-release management.

## Dataverse Evidence

Milestone #7 prepares one safe `jm1_executionlog` payload with:

- diagnostic ID
- intake reference code
- existing Opportunity ID
- selected package status
- production readiness result
- readiness blockers, if any
- confirmation that no distribution/release/royalty/post-release work started

The evidence payload must not include manuscript text, prompt body, raw model output, secrets, headers, tokens, payment links, invoice URLs, contract send URLs, or distribution/release details.

## Internal Visibility

Milestone #7 prepares an internal notification payload to:

- `publishing@jmerrill.one`

The notification is internal-only and safe. It does not include author in To/CC/BCC, does not send author email, and does not start production.

## Explicit Stop Before Later Milestones

Milestone #7 stops before:

- distribution setup
- release/launch
- royalty setup
- post-release management

Those belong to later milestones and require separate governed authorization.

## Implementation

The Milestone #7 readiness implementation is:

`azure-functions/diagnostic-ai-runner/src/production/milestone7ProductionReadiness.js`

It provides:

- production authorization gate model
- author-specific readiness check
- production task template model
- task payload preparation model
- human checkpoint model
- internal visibility payload
- safe execution-log payload
- fail-closed unsafe field handling

It does not:

- create production tasks
- start editing
- start layout
- start cover design
- activate Flow D
- assign ISBN
- start distribution
- start release
- start royalty setup
- send author email
- send contracts
- create payment links
- create invoices
- charge cards
- create duplicate Opportunity
- use QBO

## Current Controlled Record

Milestone #6 is complete for the controlled record:

| Item | Value |
| --- | --- |
| Intake reference | `JMP-INT-202606-UFYG60` |
| Diagnostic ID | `64e387e0-7e6a-f111-a826-00224820105b` |
| Existing Opportunity | `2653fca9-eacd-4c44-b3ed-1764dd5d35aa` |
| Opportunity name | `Publishing Intake - Establishing Glory: The Library` |

Milestone #7 readiness is system-ready, but live author production remains blocked until the author-specific readiness rule passes and the production authorization gate is explicitly enabled.

## Completion Evidence

Milestone #7 was completed to governed production-readiness system build on June 19, 2026.

| Evidence | Value |
| --- | --- |
| PR | `#108` |
| Merge commit | `8d8b0ce7317a5597616e0f8e8b12fc579b56ae1e` |
| Implementation commit | `8ab7ef1` |
| Build and Deploy Job | Passed |
| Full diagnostic runner tests | `828` passing |

Completion confirms:

- production readiness model exists
- task template/payload model exists
- human checkpoints are defined
- internal visibility payload is defined
- safe execution-log payload is defined
- live production remains blocked until author-specific readiness and gate requirements pass
- distribution/release/royalty/post-release work remains outside Milestone #7

No live production, Flow D activation, ISBN assignment, editing, layout, cover design, distribution setup, release work, royalty setup, author email, contract send, payment link, invoice, charge, duplicate Opportunity, QBO logic, or secret exposure occurred during Milestone #7 completion.
