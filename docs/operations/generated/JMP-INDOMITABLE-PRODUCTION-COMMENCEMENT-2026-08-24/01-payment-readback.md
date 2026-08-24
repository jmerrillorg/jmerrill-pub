# Payment Readback

## Stripe Payment Evidence

The first payment evidence had already been verified before this production-commencement pass and was preserved in Dataverse/payment-event evidence:

| Field | Value |
| --- | --- |
| Stripe customer | `cus_V8DlN4Jeu1jDBi` |
| Invoice ID | `in_1U7xLRJCiOVFpgYu1SKo9kgC` |
| Invoice number | `QXKWX2LC-0001` |
| Amount | `$209.06` |
| PaymentIntent | `pi_3U7xLSJCiOVFpgYu1ABnQR6G` |
| Charge | `ch_3U7xLSJCiOVFpgYu1VuBLXtf` |
| Success event | `evt_1U7yLhJCiOVFpgYusvcMXT3j` |
| First payment timestamp used for business event | `2026-08-24T13:55:38Z` |

## Dataverse Readback

| Field | Value |
| --- | --- |
| Opportunity | `455daa4a-629f-f111-b8dc-6045bdd69678` |
| First payment status | `Paid Confirmed` / `835510002` |
| Contract status | `Signed` / `196650003` |
| Payment evidence note | `FIRST_PAYMENT_RECEIVED / PRODUCTION_COMMENCED / DEV_EDIT_READY` |
| Existing initial payment log | `b6fbef7b-c39f-f111-b8dc-000d3a14673b` |
| Existing Joined the Family log | `080294cc-fb9f-f111-b8db-7c1e525801f6` |
| New production commenced log | `3b924c32-01a0-f111-b8dc-00224820105b` |

## Idempotency

The production commencement script was replayed after the first successful write. The replay returned idempotent matches for all four governed events:

- `PRODUCTION_COMMENCED`
- `EDITORIAL_SOURCE_ARTIFACT_BOUND`
- `DEVELOPMENTAL_EDITING_STAGE_MATERIALIZED`
- `DEVELOPMENTAL_EDITING_EXECUTION_BLOCKED_EXACT_GATE`

