# General's Will Line Execution

## Execution

- Execution mode: `EXECUTE`
- Function App release: `739b5a4f667008d1aa40f191b224a5a375a3846b`
- Idempotency key: `c0fb1de17c08a8aeded5cd7b216294029e0ac7535c06a863e8341f035ea16225`
- Stage ID: `e698257d-ca9c-f111-b8dc-00224820105b`
- Source artifact ID: `0c382466-0c9c-f111-b8dc-000d3a14673b`

## Result

- Status: `EXCEPTION`
- Exact blocker: `LINE_EDITING_BLOCKED — LINE_RETENTION_OUTSIDE_95_TO_100_PERCENT_WINDOW`
- Blocker log ID: `1454bf02-ce9c-f111-b8dc-6045bdd69435`
- Stage status: `IN_PROGRESS`
- Stage summary updated with exact blocker at `2026-08-20T19:33:30Z`.

## Certification

Line execution is not certified because retention/drift QA failed closed.

## Readback

- Line artifacts created: 0.
- Line author-review gates created: 0.
- Copy stages created: 0.
- Package handoff: null.
- External sends: 0.

## Current Waiting Owner

JMP/System. The next action is remediation of the Line retention/drift output behavior before retrying author-facing Line review.

