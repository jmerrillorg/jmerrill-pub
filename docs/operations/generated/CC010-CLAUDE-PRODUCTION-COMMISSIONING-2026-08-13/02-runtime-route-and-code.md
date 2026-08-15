# 02 - Runtime Route and Code Evidence

Last verified: 2026-08-14T01:20:30Z

## Deployed Runtime

| Field | Value |
| --- | --- |
| Function App | `func-jm1-diagnostic-ai-runner` |
| Runtime release SHA | `fa8c66f7e5d7b0a7acfa0395516bb95eb3955197` |
| Node host | `Node|22` |
| Worker runtime | `node` |
| Route | `run-stage0-diagnostic` |
| Auth contract | Governed `x-jm1-diagnostic-runner-key` header |

App setting readback:

```json
[
  { "name": "FUNCTIONS_WORKER_RUNTIME", "value": "node" },
  { "name": "JM1_PROMPT_MODEL_DEPLOYMENT_ALIAS", "value": "jm1-editorial-devline-primary" },
  { "name": "JM1_RELEASE_SHA", "value": "fa8c66f7e5d7b0a7acfa0395516bb95eb3955197" },
  { "name": "AZURE_FOUNDRY_ENDPOINT", "value": "https://ais-jm1-foundry.services.ai.azure.com" },
  { "name": "AZURE_FOUNDRY_CLAUDE_DEPLOYMENT_NAME", "value": "jm1-editorial-devline-primary" },
  { "name": "AZURE_FOUNDRY_ANTHROPIC_VERSION", "value": "2023-06-01" }
]
```

Node 22 is retained because prior JM1-INFRA-007 production evidence records Node 24 host incompatibility and rollback for this Function App family. This commissioning did not reopen that host-runtime exception.

## Code Changes

| File | Change |
| --- | --- |
| `azure-functions/diagnostic-ai-runner/src/model/providers/microsoftFoundryClaudeProvider.js` | Uses Microsoft Foundry Anthropic Messages endpoint; uses Entra ID token scope `https://ai.azure.com/.default`; removes OpenAI chat-completions request shape; removes `temperature`; removes Azure OpenAI JSON response format; parses Anthropic content blocks; raises Foundry Claude output budget to `4096`. |
| `azure-functions/diagnostic-ai-runner/src/model/governedRouteRegistry.js` | Certifies `jm1-editorial-devline-primary` as the governed Claude route with explicit OpenAI fallback only. |
| `azure-functions/diagnostic-ai-runner/src/editorial/editorialModelRoutingRegistry.js` | Marks Stage 0, Developmental Editing, and Line Editing Claude route as deployed/certified; preserves OpenAI preference for Copyediting and Proofreading. |
| `azure-functions/diagnostic-ai-runner/src/functions/runStage0Diagnostic.js` | Aligns Stage 0 request-sizing output estimate with Foundry Claude `4096` output budget. |
| Tests | Adds/updates regression coverage for Anthropic Messages endpoint, bearer auth, no `temperature`, 4,096 output tokens, certified Claude route, fallback separation, and no hardcoded OpenAI Stage 0 route. |

## Routing Contract

Stage 0 live routing selected:

```json
{
  "routingAuthority": "governedRouteRegistry",
  "promptTemplateSource": "dataverse",
  "promptModelDeploymentAlias": "jm1-editorial-devline-primary",
  "requestedDeploymentAlias": "jm1-editorial-devline-primary",
  "routeSource": "registry",
  "routePolicy": "explicit-fallback-only",
  "preferredDeploymentAlias": "jm1-editorial-devline-primary",
  "selectedDeploymentAlias": "jm1-editorial-devline-primary",
  "selectedDeploymentName": "jm1-editorial-devline-primary",
  "provider": "microsoft-foundry-claude",
  "model": "claude-sonnet-5",
  "modelVersion": "2",
  "fallback": false,
  "fallbackReason": null,
  "certificationStatus": "certified"
}
```

## Superseded/Competing Path Handling

The legacy direct Anthropic provider remains present only behind the explicit governed legacy-provider override gate. No normal Stage 0, Developmental, or Line route points to direct Anthropic. The production Stage 0 replay selected `microsoft-foundry-claude` through `governedRouteRegistry`.

