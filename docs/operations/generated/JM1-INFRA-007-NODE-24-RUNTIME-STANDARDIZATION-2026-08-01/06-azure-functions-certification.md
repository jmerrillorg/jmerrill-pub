# Azure Functions Certification

## Platform Support

Azure Functions v4 supports Node.js 24. Both active Function projects are JavaScript v4-model compatible packages using `@azure/functions@^4.7.0`.

## Source Changes

| Function project | Change |
| --- | --- |
| `azure-functions/acs-email-relay` | Declares Node `>=22 <25` compatibility; regenerated lockfile under Node 24/npm 11 |
| `azure-functions/diagnostic-ai-runner` | Declares Node `>=22 <25` compatibility; regenerated lockfile under Node 24/npm 11 |

## Local Function Validation

| Function project | Node/npm | Result |
| --- | --- | --- |
| `azure-functions/acs-email-relay` | Node `v24.18.1`, npm `11.19.0` | `npm ci`, lint, and 43/43 tests PASS |
| `azure-functions/diagnostic-ai-runner` | Node `v24.18.1`, npm `11.19.0` | `npm ci`, lint, and 1757/1757 tests PASS |

## Azure Runtime Attempt

| Function App | Before | Attempted | Result | Rollback |
| --- | --- | --- | --- | --- |
| `func-jm1-acs-email-relay` | `Node|22`, 5 functions indexed, no-key protected probe 401 | `Node|24` | 5 functions indexed, no-key protected probe 503 | Returned to `Node|22`; 5 functions indexed; no-key protected probe 401 |
| `func-jm1-diagnostic-ai-runner` | `Node|22`, 24 functions indexed, no-key protected probe 401 | `Node|24` | 24 functions indexed, no-key protected probe 503 | Returned to `Node|22`; 24 functions indexed; no-key protected probe 401 |

## Certification Decision

Function source compatibility under Node 24 is proven locally, and Azure platform support exists, but live Function host runtime certification failed. The active Function Apps remain on `Node|22` by rollback. A separate Function-host remediation is required before the overall JM1 runtime estate can be certified as fully Node 24.
