# Stage07 context-envelope reservation, version 1

Scope: existing six-component Jackie Stage07 batch only. No new inference
authority, model substitution, limit increase, retry authorization or Stage08.
Paid dispatch stays disabled during repair and completion-forecast review.

## Basis and applicability

The verified Foundry deployment `jm1-editorial-devline-primary` in
`ais-jm1-foundry` is `claude-sonnet-5`, version `2`, GlobalStandard. ARM model,
version and SKU are checked before dispatch. Tenant tariff evidence already
bound to the batch specifies USD2/million ordinary input and USD10/million
output, with no long-context premium. The approved tariff expires November 1.
Model drift or tariff expiry fails closed; there is no automatic substitution.

Official sources read October 15, 2026:
- https://platform.claude.com/docs/en/models/sonnet-5/overview
- https://platform.claude.com/docs/en/build-with-claude/context-windows
- https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/claude-models
- https://platform.claude.com/docs/en/build-with-claude/token-counting

The documented context ceiling is 1,000,000 tokens including messages, tool
definitions, system material, input and output. Thinking consumes max_tokens
and is billed as output. Token counting remains an estimate, not financial
authority. Reserve the full context as input PLUS max_tokens as output; not
subtracting output deliberately makes this looser than the combined ceiling.

For one canonical EDIT/synthesis request:
1,000,000 * 2 + 8,192 * 10 = 2,081,920 microUSD = USD2.081920.
For a section review with max_tokens=4096: USD2.040960.
These are temporary reserved exposure, not estimates or charges.

The complete serialized request must equal the canonical producer output:
one text user message, strict client output tool, adaptive medium thinking,
fixed max_tokens, non-streaming. No cache-control, images, server tools, MCP,
compaction, extra turns, speed/service tiers or batch/discount assumptions.
Extra request fields fail closed. The transport compares the reserved hash
with the exact serialized bytes, pins endpoint/API version and permits no
hidden retries. No tool execution is performed by this request. Tool schema,
structured output and thinking are accounted within input/output categories.
Any unexpected caching usage remains unresolved rather than released at the
ordinary rate. Taxes or unrelated infrastructure spend are not represented as
inference usage by this ledger; no new provider purchase is authorized.

## Ledger and preservation

The existing USD50 CAS ledger and maximum12 additional attempts are unchanged.
Eight additional attempts already used remain used. Unknown reservations never
expire. A retrospective supplement can increase an unresolved reservation only
after reconstructing its exact hash-bound request and checking current model
authority. It preserves the original reservation, ID, status and receipt. It
does not assert actual usage, settle the charge, or authorize retry. All legacy
unresolved bounds must be reconciled before independent dispatch.
The migration records its preimage hash and advances the budget schema to2;
older deployments reject it instead of silently ignoring a supplement. Rollback
must keep dispatch disabled and preserve the migrated ledger, not restore the
under-reserved preimage.

Glory EDIT/14 remains unretried. Its prior USD0.099024 must remain visible;
USD2.081920 is the prospective conservative accounting envelope if exact
reconstruction passes. Difference: USD1.982896. Total exposure would be
USD6.344786 settled + USD2.081920 unresolved = USD8.426706. This is not a bill.

Settlement uses verified provider input/output usage only. Unknown usage or
receipt-storage failure retains the entire reservation. Exceeding a certified
bound is recorded as fact and stops further dispatch. Concurrent CAS controls
prevent admission beyond USD50; capacity estimates cannot reduce reservations.
Production supplement/release/enablement requires exact source and ledger
readback. Local tests are not production acceptance.

## Editorial plan

651 was633 estimated editing spans plus18 whole-component passes. Exact
paragraph splitting produced644 spans. Whole-work bounded planning (98),
consistency review (192), and hierarchical synthesis (53) total343, replacing
the original18. Local validation/rendering/assembly are not paid tasks.

Retain all144 validated results and every source paragraph. No repeat planning,
second rewrite or removed consistency pass is introduced. For unexecuted
consistency tasks, identical original/proposed paragraphs are transmitted once
with an explicit equality marker; changed paragraphs retain both complete
versions. Coverage and ordering are validated before constructing the prompt.
This removes duplicated text, not editorial review. Existing task/source/plan
identities remain, while each actual request is bound to its own immutable hash.

Full delivery is a forecast, not guaranteed by reservation safety. The large
context reserve also needs temporary headroom near the end. Reforecast using
actual receipts and retain that headroom before authorizing further paid work.
