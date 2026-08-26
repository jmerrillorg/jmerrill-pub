# Validation

Commands:

```text
npm run lint
node --test azure-functions/diagnostic-ai-runner/test/productionPipelineV2Doctrine.test.js scripts/jm1_runtime_policy_layer.test.mjs
npm test
```

Results:

- Function lint: PASS
- Focused Block 05 / canon guard: 52 / 52 PASS
- Full diagnostic runner suite: 2,131 / 2,131 PASS
- Bypass fixtures: 36 / 36 PASS
- Synthetic commissioning matrix: 14 / 14 PASS

Named guard:

```text
npm run block05-production-commissioning-guard
```

Boundary validation:

- Runtime contract changes: Block 05 production hard gates only
- Payment mutation: 0
- Royalty mutation: 0
- Business Central mutation: 0
- Distribution submission: 0
- Retailer publication: 0
- Publication launch: 0
- Author communication: 0

Environment note:

- `npm ci` completed from the diagnostic-runner lockfile.
- Node warning preserved: local shell used Node v26.0.0 while the diagnostic runner declares `>=22 <25`.
