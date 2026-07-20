# JMP Edition Lifecycle Execution Log Event Specification

Status: specification only for PR #326 remediation. Live emission begins in the Dataverse Commercial Catalog Deployment slice.

Every `jm1_executionlog` edition-lifecycle event must preserve:

- `event_type`
- `title_id`
- `title_edition_id`
- `prior_state`
- `resulting_state`
- `execution_source`
- `actor_or_service_principal`
- `correlation_id`
- `occurred_on`
- `evidence_reference`
- `result`
- `exception_or_failure_detail`

## Event Definitions

| Event type | Required | Retry permitted | Idempotency protection | Notes |
|---|---:|---:|---:|---|
| `TITLE_EDITION_CREATED` | Yes | No | `title_edition_id` + `correlation_id` | First creation of a real edition instance. |
| `TITLE_EDITION_STATUS_TRANSITIONED` | Yes | Yes | `title_edition_id` + `prior_state` + `resulting_state` + `correlation_id` | Any governed status movement. |
| `EDITION_VALIDATION_GATE_INITIATED` | Yes for ENH/CPLX and distribution-bound editions | Yes | `title_edition_id` + gate code + `correlation_id` | Starts validation/conformance review. |
| `EDITION_VALIDATION_GATE_PASSED` | Yes before live distribution when validation applies | Yes | `title_edition_id` + gate code + result + `correlation_id` | Requires evidence reference. |
| `EDITION_VALIDATION_GATE_FAILED` | Yes on failure | Yes | `title_edition_id` + gate code + failure code + `correlation_id` | Must include exact failure detail and restart action. |
| `EDITION_DISTRIBUTION_SUBMITTED` | Yes | Yes | `title_edition_id` + distributor + submission reference | Records governed distributor submission. |
| `EDITION_DISTRIBUTOR_ACCEPTED` | Yes for live path | Yes | `title_edition_id` + distributor + distributor product ID | Records distributor acceptance/readback. |
| `TITLE_EDITION_LIVE` | Yes | No | `title_edition_id` + live distributor product ID | May occur only after required validation and distributor acceptance. |
| `TITLE_EDITION_RETIRED` | Yes when retired | No | `title_edition_id` + retirement date + `correlation_id` | Must preserve replacement/supersession evidence where applicable. |

## Retry and Failure Rules

- Creation, live, and retirement events are not replayed automatically.
- Validation and distribution submission events may be retried only with the same idempotency key or a linked retry correlation.
- Failed validation and failed distribution attempts must preserve exact failure detail.
- A duplicate event with the same idempotency key must read back the original event rather than create another record.
- Human-in-the-loop validation is mandatory before ENH/CPLX editions transition to live distribution.

