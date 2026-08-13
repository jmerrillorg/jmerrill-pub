# Stage 0 Runtime Remediation

Last verified: 2026-08-13T02:00:02Z

## Live Failure Observed Before Code Remediation

The production Stage 0 route was invoked against the authorized Quanishia diagnostic record after source correlation.

Shadow-mode attempt:

- Correlation ID: `QUANISHIA-STAGE0-COMPILED-SOURCE-20260813`
- Result: FAILED
- Error: `AZURE_OPENAI_HTTP_400`
- Failed stage: `hierarchicalShadowDiagnostic`
- Segmentation entries: `0`
- Segmentation batches: `0`

Non-shadow real-manuscript attempt:

- Correlation ID: `QUANISHIA-STAGE0-COMPILED-SOURCE-NONSHADOW-20260813`
- Result: FAILED
- Error: `AZURE_OPENAI_HTTP_400`
- Failed stage: `modelCall`
- Tokens: `0`

## Root Cause

The governed prompt route resolved to the certified Azure OpenAI fallback. The Azure provider requires JSON-object-compatible prompt wording when `response_format: { type: "json_object" }` is used. The real-manuscript prompt retained Anthropic/tool-call language and did not explicitly instruct a JSON-object response.

The diagnostic record reader also treated numeric Dataverse choice values for manuscript asset status as `null`, which made live readback less truthful after the source-correlation patch.

## Remediation

- `runStage0Diagnostic.js` now explicitly instructs the model to return one valid JSON object only with the four required Stage 0 keys.
- `diagnosticRecordReader.js` now preserves numeric Dataverse manuscript asset status values by converting them to strings for safe readback.
- `azureOpenAiProvider.js` now includes a sanitized provider message on non-OK Azure responses to prevent future opaque `AZURE_OPENAI_HTTP_400` failures.

## Post-Deployment Proof

PR #485 merged at:

- Merge SHA: `aa62b91489677f4479403cc730917ae1a39f75ad`

Function deployment:

- Function app: `func-jm1-diagnostic-ai-runner`
- Resource group: `rg-jm1-ai`
- First Core Tools publish completed but left no indexed functions and the protected route returned `404`.
- Explicit zip deployment restored the protected route.
- Zip package SHA-256: `569a3c08ecd5625f3668113cc13f1349ccbc275c5aa0be83e8b0b7792742003c`
- Unauthenticated Stage 0 probe after redeploy: `401 Unauthorized`

Quanishia Stage 0 retry after deployment:

- Correlation ID: `QUANISHIA-STAGE0-COMPILED-SOURCE-POSTFIX-20260813`
- Result: FAILED
- HTTP status: `503`
- Failed stage: `modelCall`
- Error: `AZURE_OPENAI_HTTP_429: Your requests to gpt-4o-mini for jm1-pub-diagnostic-primary in eastus have exceeded rate limit.`

Bounded retry:

- Correlation ID: `QUANISHIA-STAGE0-COMPILED-SOURCE-RETRY-20260813`
- Result: FAILED
- HTTP status: `503`
- Failed stage: `modelCall`
- Error: `AZURE_OPENAI_HTTP_429: Your requests to gpt-4o-mini for jm1-pub-diagnostic-primary in eastus have exceeded rate limit.`

Current Quanishia state:

- Source dependency: RESOLVED INTERNALLY
- Stage 0 source: CORRELATED
- Stage 0 execution: BLOCKED BY GOVERNED AZURE MODEL RATE LIMIT
- Author resend request: 0
- Author communication sent: 0

This is no longer the stale missing-source blocker or the prior opaque Azure `400` prompt defect.
