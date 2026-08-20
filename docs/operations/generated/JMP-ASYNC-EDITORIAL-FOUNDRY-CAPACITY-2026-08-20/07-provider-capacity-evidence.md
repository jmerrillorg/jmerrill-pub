# Provider Capacity Evidence

Last Verified: 2026-08-20

## Azure Account

- Subscription: `JM1 - Nonprofit Core (2025 Grant)`
- Subscription ID: `9ee13245-2303-4010-8b6d-35f7cbcfdc0e`
- Account: `ais-jm1-foundry`
- Resource group: `rg-jm1-ai`
- Region: `eastus2`
- Kind: `AIServices`
- Project: `jm1-editorial-foundry`
- Endpoint family: `https://ais-jm1-foundry.services.ai.azure.com/`

## Deployment

- Deployment: `jm1-editorial-devline-primary`
- Model: `claude-sonnet-5`
- Model version: `2`
- SKU: `GlobalStandard`
- Current capacity: `25`
- Deployment state: `Running`

## Deployment Rate Limits

- Requests: `25` per `60` seconds.
- Tokens: `25,000` per `60` seconds.

## Quota Readback

`az cognitiveservices usage list --location eastus2` reported:

- `AIServices.GlobalStandard.claude-sonnet-5.Azure`
- Current: `25`
- Limit: `2000`
- Scope: `global`
- Unit: `Count`

## Observed Runtime Throttle

The live failure was narrower than the deployment token readback:

`5,000` output tokens / `60` seconds / user by model by minute.

The worker default honors this observed output-token ceiling until Microsoft capacity is explicitly changed or a higher safe operating limit is proven.

