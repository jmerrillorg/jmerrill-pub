# Capacity Readback

Last Verified: 2026-08-25T10:50:30Z

## Azure / Foundry Authority

| Field | Value |
| --- | --- |
| Azure subscription | `9ee13245-2303-4010-8b6d-35f7cbcfdc0e` |
| Resource group | `rg-jm1-ai` |
| Foundry resource | `ais-jm1-foundry` |
| Foundry project | `jm1-editorial-foundry` |
| Region | `eastus2` |
| Deployment | `jm1-editorial-devline-primary` |
| Deployment type | `GlobalStandard` |
| Model | `claude-sonnet-5` |
| Model version | `2` |

## Quota Headroom

| Metric | Value |
| --- | ---: |
| Available quota family | `AIServices.GlobalStandard.claude-sonnet-5.Azure` |
| Quota limit | 2,000k TPM |
| Current post-change assignment | 100k TPM |
| Remaining assignable headroom | 1,900k TPM |
| Quota increase required | NO |

## Deployment Mutation

| Metric | Before | After |
| --- | ---: | ---: |
| SKU capacity | 25 | 100 |
| Token rate limit | 25,000 / minute | 100,000 / minute |
| Request rate limit | 25 / minute | 100 / minute |
| Deployment state | Running | Running |
| Provisioning state | Succeeded | Succeeded |

Command path: Azure Cognitive Services deployment create/update against the existing deployment name.

