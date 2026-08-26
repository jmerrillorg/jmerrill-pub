# Validation

Last verified: 2026-08-26

## Local Validation

| Check | Result |
|---|---|
| `node --check src/lifecycle/wholeSystemLifecycleClosure.js` | PASS |
| `node --check src/functions/runWholeLifecycleClosureProbe.js` | PASS |
| Registry JSON parse | PASS |
| `npm ci` | PASS with Node 26 engine warning |
| `npm run lint` | PASS |
| `node --test test/wholeSystemLifecycleClosure.test.js` | 8 / 8 PASS |
| `npm test -- --test-reporter=tap` | 2186 / 2186 PASS |
| root `npm ci` | PASS with Node 26 engine warning |
| root `npm run type-check` | PASS |

## Local Probe Readback

| Field | Result |
|---|---|
| status | `ready` |
| classification | `JMP_PUBLISHING_LIFECYCLE_FULLY_COMMISSIONED` |
| handoffs | 10 / 10 |
| golden path | PASS |
| negative path | 19 / 19 PASS |
| negative proof | 23 / 23 PASS |
| master register | 52 / 52 COMMISSIONED |

## Notes

The diagnostic runner declares Node `>=22 <25`, and the repository declares Node `>=24 <25`; local validation was run under Node `v26.0.0`, which emits expected engine warnings during `npm ci`. No runtime/application failure was observed from those warnings.
