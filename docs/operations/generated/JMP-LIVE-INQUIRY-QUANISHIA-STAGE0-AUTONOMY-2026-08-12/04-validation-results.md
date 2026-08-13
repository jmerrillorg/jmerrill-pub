# Validation Results

Last verified: 2026-08-13T01:00:00Z

## Local Validation

| Command | Result |
|---|---|
| `npm ci` at repository root | PASS with Node 26 engine warning; repo declares Node >=24 <25 |
| `npm run type-check` | PASS |
| `node --test scripts/quanishia_stage0_autonomy_commissioning_guard.test.mjs scripts/publisher_today_read_model.test.mjs scripts/publishing_intake_orchestration_autostart.test.mjs` | PASS, 18 / 18 |
| `npm ci` in `azure-functions/diagnostic-ai-runner` | PASS with Node 26 engine warning; Function declares Node >=22 <25 |
| `npm run lint` in `azure-functions/diagnostic-ai-runner` | PASS |
| `node --test test/packageSelectionCommercialContinuation.test.js` | PASS, 4 / 4 |
| `npm test` in `azure-functions/diagnostic-ai-runner` | PASS, 1840 / 1840 |

## Notes

The repository root does not define an `npm test` script. Focused root tests were therefore run through `node --test`.

Node 26 engine warnings were observed locally and documented. They did not block validation.
