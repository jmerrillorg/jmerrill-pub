# Validation

Last Verified: 2026-08-26

## Focused Validation

Command:

```text
node --test azure-functions/diagnostic-ai-runner/test/productionPipelineV2Doctrine.test.js
```

Result:

```text
tests 74
pass 74
fail 0
```

## Dependency-Bound Validation

Commands:

```text
npm ci
npm run lint
node --test --test-reporter=tap
```

Result:

```text
npm ci: PASS
npm run lint: PASS
tests 2164
pass 2164
fail 0
```

Note:

```text
Local validation ran under Node v26.0.0. The package declares >=22 <25, so npm
reported an engine warning during dependency installation. The governed lint and
test commands passed after installation.
```

## Probe Readback

Local probe readback:

```json
{
  "classification": "LAUNCH_MARKETING_FULLY_COMMISSIONED",
  "domains": { "totalDomains": 55, "commissioned": 55 },
  "bypass": { "count": 35, "passed": 35, "failures": 0 },
  "synthetic": { "count": 44, "passed": 44, "failures": 0 },
  "negative": { "count": 34, "passed": 34, "failures": [] },
  "finalEvent": "LAUNCH_CYCLE_COMPLETE",
  "block09Handoff": "BLOCK09_MARKETING_HANDOFF_READY"
}
```
