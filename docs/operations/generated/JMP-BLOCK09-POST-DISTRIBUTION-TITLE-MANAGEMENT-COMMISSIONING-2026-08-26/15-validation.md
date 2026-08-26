# Validation

Last Verified: 2026-08-26

## Focused Validation

Command:

```text
node --test test/productionPipelineV2Doctrine.test.js --test-reporter=tap
```

Result:

```text
tests 88
pass 88
fail 0
```

## Dependency-Bound Validation

Commands:

```text
npm ci
npm run lint
npm test -- --test-reporter=tap
```

Result:

```text
npm ci: PASS
npm run lint: PASS
tests 2178
pass 2178
fail 0
```

Note:

```text
Local validation ran under Node v26.0.0. The package declares >=22 <25, so npm
reported an engine warning during dependency installation. The governed CI
workflow uses Node 22.
```

## Probe Readback

Local probe readback:

```json
{
  "classification": "TITLE_MANAGEMENT_FULLY_COMMISSIONED",
  "domains": { "totalDomains": 61, "commissioned": 61 },
  "bypass": { "count": 40, "passed": 40, "failures": 0 },
  "synthetic": { "count": 56, "passed": 56, "failures": 0 },
  "negative": { "count": 47, "passed": 47, "failures": [] },
  "finalEvent": "TITLE_MANAGEMENT_ACTIVE",
  "archiveEvent": "TITLE_MANAGEMENT_ARCHIVED"
}
```
