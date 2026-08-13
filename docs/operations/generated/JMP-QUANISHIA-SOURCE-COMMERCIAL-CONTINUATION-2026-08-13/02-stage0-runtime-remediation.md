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

Pending merge and production deployment of this head.
