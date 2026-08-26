# Due Record Classification

Last Verified: 2026-08-26T09:14:05Z

## Classification Standard

Each due cadence record must classify as one of:

- `ALREADY_DELIVERED`
- `AUTHOR_ALREADY_RESPONDED`
- `TRUE_DUE_AND_UNSENT`
- `AMBIGUOUS`

The send path may execute only for `TRUE_DUE_AND_UNSENT`.

## Records

| Title | Package | Classification | Evidence Basis | Send |
| --- | --- | --- | --- | --- |
| The Long Watch | `editorial-review-v1` | `AMBIGUOUS` / non-author-release eligible | Cadence evidence identified this row as publisher-facing Editorial Review decision material, with `CADENCE_NOT_REQUIRED`, `PUBLISHER_INTERNAL_DECISION`, and `NOT_REQUIRED_PUBLISHER_FACING`; later publisher action moved the title beyond that review decision. | No |
| Before You Were Born | `developmental-editing-v2` | `ALREADY_DELIVERED` | Gate/status evidence shows `OPERATIONALLY_CERTIFIED`, response period started after compliant delivery on `2026-08-19T03:06:54.452Z`. | No |
| The General's Will and Last Testament | `developmental-editing-v2` | `TRUE_DUE_AND_UNSENT` if live mailbox correlation remains clear at timer execution | Package and QA evidence exist; author/contact/title/gate/intake data are present. The timer must perform live Publishing mailbox correlation immediately before send. | Conditional governed send |
| Establishing Glory: The Library | `developmental-editing-v2` | `AMBIGUOUS` | Stage/package evidence exists but required contact/author email is absent from the current readback, so the sender must fail closed. | No |

## Duplicate Guard

The consumer treats any existing governed send log or delivered/awaiting-author gate as already released. It also records blocked/non-sendable classifications idempotently, so timer replay cannot repeatedly notify or resend.

