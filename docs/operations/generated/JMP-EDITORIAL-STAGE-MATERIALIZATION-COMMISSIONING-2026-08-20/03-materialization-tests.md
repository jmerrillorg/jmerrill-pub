# Materialization and Runtime Tests

## PR #527 Validation

Command:

```text
npm run lint
node --test test/editorialNextStageMaterialization.test.js test/approvalEventConsumer.test.js test/editorialAuthorGatePolicy.test.js test/editorialExecutionRuntime.test.js test/targetedEditorialExecution.test.js
```

Result: PASS, 56 / 56.

## PR #528 Validation

Command:

```text
npm run lint
node --test test/editorialExecutionRuntime.test.js test/targetedEditorialExecution.test.js test/editorialNextStageMaterialization.test.js
```

Result: PASS, 37 / 37.

## PR #529 Validation

Command:

```text
npm run lint
node --test test/editorialExecutionRuntime.test.js test/targetedEditorialExecution.test.js test/editorialNextStageMaterialization.test.js
```

Result: PASS, 38 / 38.

## Added Regression Coverage

- Drive/item Graph source identity remains preferred when present.
- SharePoint web URL resolves through Graph shares/driveItem when drive/item identity is absent.
- Stale `SOURCE_GRAPH_IDENTITY_MISSING` blockers are retriable after source repair.
- Substantive exact blockers remain preserved.

## Environment Note

`npm ci` completed from the repository lockfile. Node emitted the existing engine warning because local Node was `v26.0.0` while the package declares `>=22 <25`.

