# Validation

Last Verified: 2026-08-25T10:50:30Z

## Commands

```text
npm ci
npm run lint
npm test -- --test-reporter=spec test/providerSupport.test.js test/microsoftFoundryClaudeProvider.test.js test/editorialExecutionRuntime.test.js
```

## Results

| Check | Result |
| --- | --- |
| Dependency install | PASS |
| Runtime syntax validation | PASS |
| Focused provider/editorial tests | 49 / 49 PASS |

## Node Version Caveat

The local validation environment used Node v26.0.0. The package declares `>=22 <25`, so validation passed with an engine warning. No dependency or runtime package version was changed.

