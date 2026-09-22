# Regression Root Cause

Last verified: 2026-08-13T23:58:30Z

## Regression Class

Request contract drift + deployment drift.

## Original Symptom

`AZURE_OPENAI_HTTP_400`

## Live Asset That Exposed It

Quanishia Dockery / `JMP-INT-202608-0AOS7L`

## Root Cause

Two superseded conditions collided with the governed runtime:

1. The Azure provider forced `response_format: json_object` by default.
2. The Stage 0 real-manuscript prompt retained obsolete Anthropic tool-call wording.

The deployment was also previously exposed to stale-package risk through `WEBSITE_RUN_FROM_PACKAGE` drift.

## Remediation

PR #501:

- Removed the obsolete Anthropic tool-call instruction from the real-manuscript Stage 0 prompt.
- Stopped forcing Azure `response_format: json_object` by default.
- Preserved optional Azure JSON mode only behind `AZURE_OPENAI_ENABLE_RESPONSE_FORMAT_JSON_OBJECT=true`.
- Added Azure provider regression tests.
- Extended the Quanishia Stage 0 guard.

Production:

- Function App redeployed from canonical merge SHA `603f9cb62da43a52bc4ab16cd37a4a0556bc705c`.
- Production `JM1_RELEASE_SHA` readback matches the intended SHA.
- `WEBSITE_RUN_FROM_PACKAGE` is absent.
- Protected route returns `401` without key.

## Current Status

Former HTTP 400: NOT REPRODUCED.

Current condition: `AZURE_OPENAI_HTTP_429` classified by runtime as `MODEL_CAPACITY_RETRY_SCHEDULED`.

