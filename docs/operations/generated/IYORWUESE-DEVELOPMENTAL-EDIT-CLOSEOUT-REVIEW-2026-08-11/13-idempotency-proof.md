# Idempotency Proof

Last verified: 2026-08-11T17:37:29.998Z

| Command | Result |
| --- | --- |
| `node --test scripts/author_final_approval_gate.test.mjs` | PASS after remediation |
| `node --test scripts/author_decision_closeout_propagation.test.mjs` | PASS after remediation |
| `node --test scripts/publishing_title_closeout_service.test.mjs` | 18 / 18 PASS |

The protected closeout service remains idempotent and now supports eligible non-pilot governed titles once all gate conditions pass.
