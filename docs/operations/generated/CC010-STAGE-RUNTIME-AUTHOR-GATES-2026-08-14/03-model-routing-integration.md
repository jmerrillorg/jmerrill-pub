# Model Routing Integration

Last verified: 2026-08-14

## Integration

The stage executor now routes through `routeToProvider` using the governed route registry.

Stage transaction mapping:

| Stage | Transaction |
| --- | --- |
| Editorial Review | `editorial_diagnostic` |
| Developmental Editing | `developmental_editing` |
| Line Editing | `line_editing` |
| Copyediting | `copy_editing` |
| Proofreading | `proofreading` |

## Fallback Policy

Fallback is disabled for stage execution. If the configured route is missing or falls back, the stage blocks with `MODEL_INVOCATION_FAILED`.

## Production Route Configuration

Readback on 2026-08-14:

| Setting | Value |
| --- | --- |
| `JM1_PROMPT_MODEL_DEPLOYMENT_ALIAS` | `jm1-editorial-devline-primary` |
| `JM1_COPY_PROOF_MODEL_DEPLOYMENT_ALIAS` | `jm1-pub-diagnostic-primary` |

Copy/proof routing is explicit. It uses the currently certified fallback route until a separate preferred GPT copy/proof deployment is commissioned under governed authority.

Evidence source:

- `azure-functions/diagnostic-ai-runner/src/editorial/editorialExecutionRuntime.js`
- `azure-functions/diagnostic-ai-runner/src/model/providerRouter.js`
- `azure-functions/diagnostic-ai-runner/src/model/governedRouteRegistry.js`
