# Remediation Validation

Last verified: 2026-08-12

## Code Remediation

The shared inbound response consumer now handles two governed populations:

- open editorial approval gates;
- Stage 0 editorial recommendation package-selection responses.

The mailbox reader still excludes internal publishing senders by default. It now admits self-addressed `publishing@jmerrill.one` messages only when the caller explicitly uses the governed package-selection path.

The package-selection path:

- reads the same monitored mailbox;
- classifies natural-language package replies;
- accepts Starter, Professional, and Premier selections;
- fails closed for ambiguous or irrelevant replies;
- writes durable response and `PACKAGE_SELECTED` execution evidence;
- uses stable message identity for idempotency;
- does not create a Jackie gate;
- does not send author clarification for clear package selections;
- does not manually mutate unrelated title state.

## Stage 0 / Operating Center Remediation

Routine Stage 0 handoffs no longer surface as Jackie gates merely because a diagnostic record says `Awaiting Jackie Review`.

Missing manuscript/source evidence now remains an Intake/source-material dependency.

The Publisher Operating Center visible title pipeline starts at Intake. No Inquiry swimlane is introduced.

Deep links now resolve exact `titleId`, `intakeId`, or `diagnosticId`. If the requested action cannot be resolved, the UI shows `Requested action could not be resolved` and does not fall back to the first or previous title.

## Validation Commands

| Command | Result |
| --- | --- |
| `npm run type-check` | PASS |
| `node --test azure-functions/diagnostic-ai-runner/test/authorReviewResponseConsumer.test.js` | 46 / 46 PASS |
| `node --test scripts/publishing_intake_orchestration_autostart.test.mjs scripts/publisher_today_read_model.test.mjs scripts/pr473_commissioning_consolidation_guard.test.mjs` | 16 / 16 PASS |
| `npm --prefix azure-functions/diagnostic-ai-runner run lint` | PASS |
| `npm --prefix azure-functions/diagnostic-ai-runner test` | 1831 / 1831 PASS |
| `git diff --check` | PASS |

## Live Replay Status

Pending deployment of this head.

Required post-deployment replay:

Real 2026-08-12T10:35Z message

detected

correlated to `'TIL DEATH DO US PART` / `JMP-INT-202608-3W6Q6L`

classified as `STARTER_PACKAGE_SELECTED`

durably captured

`PACKAGE_SELECTED` logged exactly once

awaiting-response state resolved

downstream continuation resumes without manual package entry.
