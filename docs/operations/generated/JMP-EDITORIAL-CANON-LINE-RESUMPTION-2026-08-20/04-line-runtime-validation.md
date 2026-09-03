# Line Runtime Validation

Last verified: 2026-08-20T13:22:13Z

## Environment

- Root Node: `v26.0.0`
- npm: `11.12.1`
- Repository declared Node range: `>=24 <25`
- Functions declared Node range: `>=22 <25`
- Node 26 produced engine warnings only; required checks below completed.

## Root Validation

- `npm ci`: PASS
- `npm run lint`: PASS
  - Existing warning: `app/layout.tsx` custom-font warning.
- `npm run type-check`: PASS
- Root `scripts.test`: not defined.

## Focused Functions Validation

Command:

```text
npm run lint &&
node --test \
  test/editorialExecutionRuntime.test.js \
  test/editorialModelRoutingRegistry.test.js \
  test/editorialAuthorGatePolicy.test.js \
  test/editorialPackageHandoffConsumer.test.js \
  test/editorialPromptAssembly.test.js \
  test/providerAbstraction.test.js \
  test/providerSupport.test.js \
  test/microsoftFoundryClaudeProvider.test.js \
  test/governedRouteRegistry.test.js
```

Result:

- Test suites: 15 / 15 PASS
- Tests: 120 / 120 PASS

## Full Functions Validation

Command:

```text
npm test
```

Result:

- Tests: 1902 / 1905 PASS
- Known isolated failures: 3 in `test/agreementGeneratedPackageMirror.test.js`
- No Line runtime, provider routing, author gate, or package handoff failure occurred.

