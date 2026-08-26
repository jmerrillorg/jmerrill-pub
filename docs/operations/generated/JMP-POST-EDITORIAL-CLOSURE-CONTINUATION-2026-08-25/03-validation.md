# Validation

Last Verified: 2026-08-26T02:38:00Z

## Commands

```text
npm test -- --test-reporter=spec test/editorialCadenceReleaseConsumer.test.js test/publishingMailboxReader.test.js test/authorReviewResponseConsumer.test.js
npm run lint
curl -sS https://func-jm1-diagnostic-ai-runner.azurewebsites.net/api/health
az functionapp function show --resource-group rg-jm1-ai --name func-jm1-diagnostic-ai-runner --function-name run-editorial-cadence-release-consumer
```

## Results

| Check | Result |
| --- | --- |
| Focused cadence/mailbox/response tests | PASS, 93 / 93 |
| Diagnostic runner lint | PASS |
| Health | `{"status":"ready","release":"17bab886d693314a7179edcd6100d2dda7598dfc","productionRelease":"17bab886d693314a7179edcd6100d2dda7598dfc","node":"v22.23.2"}` |
| Live function inventory | `run-editorial-cadence-release-consumer` present |
| Timer schedule | `0 */10 * * * *` |
