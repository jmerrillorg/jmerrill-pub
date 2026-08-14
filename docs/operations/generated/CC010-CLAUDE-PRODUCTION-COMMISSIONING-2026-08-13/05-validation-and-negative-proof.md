# 05 - Validation and Negative Proof

Last verified: 2026-08-14T01:20:30Z

## Local Validation

Lint:

```text
npm --prefix azure-functions/diagnostic-ai-runner run lint
PASS
```

Focused regression suite:

```text
node --test \
  azure-functions/diagnostic-ai-runner/test/microsoftFoundryClaudeProvider.test.js \
  azure-functions/diagnostic-ai-runner/test/providerSupport.test.js \
  azure-functions/diagnostic-ai-runner/test/governedRouteRegistry.test.js \
  azure-functions/diagnostic-ai-runner/test/editorialModelRoutingRegistry.test.js \
  azure-functions/diagnostic-ai-runner/test/providerAbstraction.test.js \
  scripts/stage0_model_routing_authority_guard.test.mjs
```

Result:

```text
tests 85
pass 85
fail 0
```

## Deployment Validation

| Check | Result |
| --- | --- |
| Function publish | PASS |
| Trigger sync | PASS |
| `run-stage0-diagnostic` indexed | PASS |
| Protected no-key probe | PASS, returned `UNAUTHORIZED` |
| Governed header replay | PASS |
| Release SHA app setting | `fa8c66f7e5d7b0a7acfa0395516bb95eb3955197` |

## Negative Proof

| Required proof | Result | Evidence |
| --- | --- | --- |
| `stage0_openai_silent_default=0` | PASS | Live Stage 0 selected `microsoft-foundry-claude`; `fallback=false`; routing authority `governedRouteRegistry`. |
| `developmental_openai_silent_default=0` | PASS | Developmental routing registry points to `jm1-editorial-devline-primary`; no Developmental execution occurred because no safe real execution boundary was found. |
| `line_openai_silent_default=0` | PASS | Line routing registry points to `jm1-editorial-devline-primary`; no Line execution occurred because the only real Line record found was already approved/completed. |
| `silent_fallbacks=0` | PASS | Live Stage 0 returned `fallback=false` and `fallbackReason=null`. |
| `duplicate_routing_authorities=0` | PASS | Live Stage 0 selected through `governedRouteRegistry`; tests prove Stage 0 does not hard-code the OpenAI fallback as a business routing decision. |
| `legacy_anthropic_direct_normal_runtime=0` | PASS | Direct Anthropic remains behind explicit legacy override only; normal route selected Microsoft Foundry Claude. |
| `hardcoded_stage_model_choice=0` | PASS | `scripts/stage0_model_routing_authority_guard.test.mjs` passed. |
| `Jackie_impersonated_model_calls=0` | PASS | Production invocation used Function App managed identity and governed runner header; no user impersonation model call was used for the live Stage 0 replay. |
| `unapproved_cost_commitments=0` | PASS | Deployment used existing Azure Foundry `GlobalStandard` capacity; no reserved/minimum commitment was encountered. |
| `manual_stage_progression=0` | PASS | Live response states no Opportunity created and no email sent; this action completed diagnostic metadata only. |
| `unrelated_title_mutations=0` | PASS | No Developmental/Line title was advanced; no unrelated title mutation was performed. |
| `PR431_progression=0` | PASS | PR #431/manual operations lane was not progressed. |

## Regression Protection Added

- Foundry Claude provider test asserts Anthropic Messages endpoint.
- Foundry Claude provider test asserts bearer auth and `anthropic-version`.
- Foundry Claude provider test asserts no `temperature`.
- Foundry Claude provider test asserts `max_tokens=4096`.
- Route registry test asserts certified Claude route resolves without fallback.
- Editorial routing test asserts Stage 0, Developmental, and Line prefer commissioned Claude route.
- Stage 0 model routing authority guard asserts OpenAI fallback is not hardcoded as the business route.

