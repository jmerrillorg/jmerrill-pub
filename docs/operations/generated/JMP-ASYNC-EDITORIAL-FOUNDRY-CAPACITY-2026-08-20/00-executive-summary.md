# JMP Async Editorial + Foundry Capacity Evidence

Last Verified: 2026-08-20

## Classification

RUNTIME READY / LONG-FORM EXECUTION COMMISSIONING

The current Line Editing runtime is functionally commissioned, but long-form production execution is not yet ready for The General's Will retry because the async worker has been implemented and validated in repository tests only. No production deployment or real-title replay was performed in this pass.

## Findings

- Root capacity blocker: `MICROSOFT_FOUNDRY_HTTP_429_RATE_LIMIT_OF_5000_PER_60S_EXCEEDED_FOR_USERBYMODELBYMINUTEOUTPUTTOKENS`.
- Existing runtime shape before this change: in-memory bounded chunk execution; a provider 429 failed the whole Line execution attempt.
- New worker behavior: durable job/chunk contract, ordered chunk plan, rate-governed dispatch, provider-capacity wait/resume, idempotent replay, ordered aggregation, QA-before-certification, and no author review gate before final artifact certification.
- Foundry account verified: `ais-jm1-foundry`, `rg-jm1-ai`, `eastus2`, project `jm1-editorial-foundry`.
- Deployment verified: `jm1-editorial-devline-primary`, model `claude-sonnet-5` version `2`, SKU `GlobalStandard`, current capacity `25`.
- Deployment rate limits verified: `25` requests / 60 seconds and `25,000` tokens / 60 seconds.
- Observed narrower throttle remains: `5,000` output tokens / 60 seconds for user by model by minute.

## Validation

- `npm ci`: PASS with Node 26 engine warning because package declares `>=22 <25`.
- `npm run lint`: PASS.
- Focused tests: `22 / 22 PASS`.

## Production Readiness

NOT_READY.

The worker and evidence are ready for PR review. General's Will must not be retried until the worker is merged, deployed, smoke-tested in production, and confirmed to persist durable checkpoints using the production store.

