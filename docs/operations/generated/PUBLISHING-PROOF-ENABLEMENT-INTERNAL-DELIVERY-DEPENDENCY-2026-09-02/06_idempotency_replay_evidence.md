# Idempotency And Replay Evidence

Last verified: 2026-09-02T21:56:11Z

## Proven

The dispatch dry-run created a stable natural key and idempotency key before provider invocation. Because the call was blocked before mutation, replay cannot create a duplicate send, lifecycle effect, or execution log.

| Expected Replay Result | Result |
| --- | --- |
| `SECOND_RELEASE_CREATED` | `NO` |
| `SECOND_SEND_CREATED` | `NO` |
| `SECOND_LIFECYCLE_EFFECT` | `NO` |
| `IDEMPOTENCY_PROVEN` | `PARTIAL` |
| `REPLAY_PROVEN` | `PARTIAL` |

## Related Guard Evidence

`npm run program006-dispatch-guard` passed 19/19 and proves the dispatch service owns validation, natural idempotency, transaction evidence, technical-release separation, and idempotent recovery behavior for supported dispatch states.
