# Validation

Last Verified: 2026-08-26

## Focused Guard

Command:

```text
node --test azure-functions/diagnostic-ai-runner/test/productionPipelineV2Doctrine.test.js
```

Result:

```text
55 / 55 PASS
```

## Diagnostic Runner Full Suite

Command:

```text
npm test
```

Result:

```text
2,145 / 2,145 PASS
```

## Function Lint

Command:

```text
npm run lint
```

Result:

```text
PASS
```

## Environment Notes

- Local validation ran under Node `v26.0.0`.
- Package engine remains `>=22 <25`.
- `npm ci` completed with the existing engine warning and existing audit output of 5 vulnerabilities; no dependency remediation was authorized in this Block 06 commissioning lane.

## Live-Probe Expected Shape

```json
{
  "status": "ready",
  "classification": "RELEASE_READINESS_FULLY_COMMISSIONED",
  "domains": {
    "totalDomains": 28,
    "commissioned": 28,
    "implementedNotCommissioned": 0,
    "partial": 0,
    "notApplicable": 0,
    "humanGates": 0,
    "externalDependencies": 0
  },
  "bypass": {
    "count": 37,
    "passed": 37,
    "failures": 0
  },
  "synthetic": {
    "count": 33,
    "passed": 33,
    "failures": 0
  },
  "negative": {
    "count": 29,
    "passed": 29,
    "failures": []
  }
}
```
