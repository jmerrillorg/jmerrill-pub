# Azure Functions Certification

## Platform Support

Azure Functions v4 supports Node.js 24. Both active Function projects are JavaScript v4-model compatible packages using `@azure/functions@^4.7.0`.

## Source Changes

| Function project | Change |
| --- | --- |
| `azure-functions/acs-email-relay` | Added Node `>=24 <25` engine; regenerated lockfile |
| `azure-functions/diagnostic-ai-runner` | Added Node `>=24 <25` engine; regenerated lockfile |

## Local Function Validation

| Function project | Node/npm | Result |
| --- | --- | --- |
| `azure-functions/acs-email-relay` | Node `v24.18.1`, npm `11.19.0` | `npm ci`, lint, and 43/43 tests PASS |
| `azure-functions/diagnostic-ai-runner` | Node `v24.18.1`, npm `11.19.0` | `npm ci`, lint, and 1757/1757 tests PASS |

## Deployment Boundary

No Function App production runtime was changed during this pass. Function source and lockfile readiness are complete; deployment remains a separately governed Function App release step where trigger discovery, invocation, managed identity, and Key Vault references must be rechecked in Azure.

