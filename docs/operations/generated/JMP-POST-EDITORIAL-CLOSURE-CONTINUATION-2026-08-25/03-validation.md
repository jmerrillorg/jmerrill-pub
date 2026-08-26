# Validation

Last Verified: 2026-08-26T01:22:38Z

## Commands

```text
npm test -- --test-reporter=spec test/editorialCadenceReleaseConsumer.test.js
npm run lint
curl -sS https://func-jm1-diagnostic-ai-runner.azurewebsites.net/api/health
az functionapp function show --resource-group rg-jm1-ai --name func-jm1-diagnostic-ai-runner --function-name run-editorial-cadence-release-consumer
```

## Results

| Check | Result |
| --- | --- |
| Focused cadence tests | PASS, 5 / 5 |
| Diagnostic runner lint | PASS |
| Health | `{"status":"ready","release":"309820ad6c38f5c601cba8638978d4099267ea88","productionRelease":"309820ad6c38f5c601cba8638978d4099267ea88","node":"v22.23.2"}` |
| Live function inventory | `run-editorial-cadence-release-consumer` present |

