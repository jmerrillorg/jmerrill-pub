# Validation

Last Verified: 2026-08-26

## Focused Validation

Command:

```text
node --test azure-functions/diagnostic-ai-runner/test/productionPipelineV2Doctrine.test.js
```

Result:

```text
tests 64
pass 64
fail 0
```

## Package Validation

Commands:

```text
npm ci
npm run lint
npm test
```

Result:

```text
lint: PASS
tests 2154
pass 2154
fail 0
```

Environment note:

```text
npm ci reported the existing Node engine warning because local Node is v26.0.0 while the package declares >=22 <25. Install and validation completed from the package lockfile.
```

## Probe Readback

Local probe readback:

```json
{
  "classification": "DISTRIBUTION_FULLY_COMMISSIONED",
  "domains": { "totalDomains": 41, "commissioned": 41 },
  "bypass": { "count": 36, "passed": 36, "failures": 0 },
  "synthetic": { "count": 40, "passed": 40, "failures": 0 },
  "negative": { "count": 31, "passed": 31, "failures": [] },
  "finalEvent": "TITLE_LIVE_AND_VERIFIED",
  "block08Handoff": "PRIMARY_RELEASE_LIVE",
  "block09Handoff": "BLOCK09_DISTRIBUTION_RECORD_HANDOFF_READY"
}
```
