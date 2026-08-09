# Idempotency Proof

Last verified: 2026-08-09T23:12:00Z

## Idempotency Key

Stable shadow idempotency key:

`6114167df44508a87cbd1f22220ac858f0aa99cc789cbb3fa5a842f721bc4334`

The key is derived from:

- operation version;
- title ID;
- stage ID;
- gate ID;
- approved artifact ID;
- approved artifact checksum.

## Test Evidence

`node --test scripts/publishing_title_closeout_service.test.mjs`

Result: 17 / 17 PASS

Relevant tests:

- valid approved title dry-run passes;
- successful closeout creates no communication and no response clock;
- rerun returns idempotent;
- another title cannot be mutated;
- stable idempotency key includes operation facts.

## Risk

Idempotency: PASS in shadow/test harness.

Duplicate state/event risk: 0 if the protected executor is used and live prerequisites pass.

Current execution readiness remains NOT READY because live prerequisites do not pass.

