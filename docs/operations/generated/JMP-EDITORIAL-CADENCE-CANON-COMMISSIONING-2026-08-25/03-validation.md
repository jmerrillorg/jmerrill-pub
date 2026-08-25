# Validation

## Commands

```text
npm ci
npm ci --prefix azure-functions/diagnostic-ai-runner
node --test scripts/editorial_cadence_engine.test.mjs
node --test azure-functions/diagnostic-ai-runner/test/authorReviewResponseConsumer.test.js
npm run editorial-cadence-guard
npm run author-response-runtime-remediation-guard
npm run type-check
npm run lint
```

## Results

| Validation | Result |
|---|---|
| `node --test scripts/editorial_cadence_engine.test.mjs` | 16 / 16 PASS |
| `node --test azure-functions/diagnostic-ai-runner/test/authorReviewResponseConsumer.test.js` | 52 / 52 PASS |
| `npm run editorial-cadence-guard` | 16 / 16 PASS |
| `npm run author-response-runtime-remediation-guard` | 52 / 52 PASS |
| `npm run type-check` | PASS |
| `npm run lint` | PASS |

## Lint Note

Lint reports one existing Next.js warning in `app/layout.tsx` about custom fonts. The cadence implementation did not modify that file.

## Node Note

The validation shell used Node v26.0.0. The repository declares Node `>=24 <25`, and the Azure Functions package declares Node `>=22 <25`. npm emitted engine warnings during dependency installation.
