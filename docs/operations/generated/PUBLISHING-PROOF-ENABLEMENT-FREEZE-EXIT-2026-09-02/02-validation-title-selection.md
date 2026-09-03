# Validation Title Selection

Last Verified: 2026-09-02T04:47:24.358308Z

## Current internal/current-authority population

The current governed Operating Center sample contains 21 current-authority rows. It includes synthetic/internal validation titles such as `JM1 Preview Synthetic Artifact A`, `JM1 Preview Synthetic Artifact B`, `JM1 Synthetic Intake Final Proof ...`, `GATE-W1 App Service Staging ...`, and `GATE-W1 Synthetic ...` rows, plus real/legacy exception rows.

## Selected validation fixture

Selected validation title/fixture:

`Before You Were Born` mocked internal validation fixture from `azure-functions/diagnostic-ai-runner/test/editorialCadenceReleaseConsumer.test.js`.

Fixture identifiers:

- titleId: `title-before-you-were-born`
- stageId: `fd577d2b-01a0-f111-b8dc-6045bdd69435`
- gateId: `gate-before-you-were-born`
- contactId: `dfb397e7-3b7c-f111-ab0f-6045bdd69435`
- packageId: `pkg-before-you-were-born-developmental-v1`

## Why selected

This is the smallest meaningful lifecycle segment found that exercises the ratified proof model without client exposure: an author-facing editorial package cadence boundary evaluates state, evidence, time, authority, dependency, fail-closed behavior, idempotent/no-resend behavior, and execution-log payload creation using the real cadence consumer logic against in-memory governed-source fixtures.

It is not the most ambitious segment. It is intentionally bounded to avoid external send, contract, financial, distribution, or client-title mutation.

## Not selected

- Real client title sends: not selected because client-title automation freeze remains active.
- The Long Watch real cadence boundary: not selected because it may require real mailbox/ACS/Dataverse production effects.
- Operating Center projection proof: not selected as primary because it is projection proof, not a lifecycle segment.
- Proofreading approval to Interior Layout autostart: not selected because it requires an A5 author approval premise and production task mutation.
