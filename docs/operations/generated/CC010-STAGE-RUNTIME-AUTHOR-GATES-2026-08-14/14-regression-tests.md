# Regression Tests

Last verified: 2026-08-14

## Focused Suite

Command:

```bash
node --test azure-functions/diagnostic-ai-runner/test/editorialAuthorGatePolicy.test.js azure-functions/diagnostic-ai-runner/test/editorialExecutionRuntime.test.js azure-functions/diagnostic-ai-runner/test/editorialPackageHandoffConsumer.test.js azure-functions/diagnostic-ai-runner/test/governedRouteRegistry.test.js azure-functions/diagnostic-ai-runner/test/microsoftFoundryClaudeProvider.test.js azure-functions/diagnostic-ai-runner/test/editorialModelRoutingRegistry.test.js
```

Result:

- 49 / 49 PASS.

## Function App Lint

Command:

```bash
npm run lint
```

Result:

- PASS.

## Full Function App Suite

Command:

```bash
npm test
```

Result:

- 1888 / 1891 PASS.
- 3 failures in `test/agreementGeneratedPackageMirror.test.js`.
- The failing area is outside the CC-010 stage runtime/author-gate files changed by this package.
