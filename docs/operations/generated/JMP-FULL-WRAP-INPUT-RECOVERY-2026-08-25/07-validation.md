# Validation

Last verified: 2026-08-25T07:53:36Z

## Commands

| Command | Result |
| --- | --- |
| `curl https://func-jm1-diagnostic-ai-runner.azurewebsites.net/api/health` | PASS |
| Live `POST /api/run-full-wrap-executor` with recovered governed inputs | PASS, fail-closed |
| `npm ci` in `azure-functions/diagnostic-ai-runner` | PASS with Node 26 engine warning |
| `node --test --test-name-pattern='Full Wrap' test/fullWrapExecutor.test.js` | 5 / 5 PASS |
| `npm test` in `azure-functions/diagnostic-ai-runner` | 2052 / 2052 PASS |

## Local Environment Caveat

The local shell used Node `v26.0.0`; the runner package declares `>=22 <25`. The warning was preserved. Production health reports Node `v22.23.2`.

