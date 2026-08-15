# 01 - Foundry Claude Deployment Evidence

Last verified: 2026-08-14T01:20:30Z

## Microsoft Foundry Resource

| Field | Value |
| --- | --- |
| Subscription | `9ee13245-2303-4010-8b6d-35f7cbcfdc0e` |
| Resource group | `rg-jm1-ai` |
| Account | `ais-jm1-foundry` |
| Kind | `AIServices` |
| Region | `eastus2` |
| Project | `jm1-editorial-foundry` |
| Endpoint used by runtime | `https://ais-jm1-foundry.services.ai.azure.com` |

## Claude Deployment

| Field | Value |
| --- | --- |
| Deployment | `jm1-editorial-devline-primary` |
| Model format | `Anthropic` |
| Model | `claude-sonnet-5` |
| Version | `2` |
| SKU | `GlobalStandard` |
| Capacity | `25` |
| Provisioning state | `Succeeded` |
| Request rate limit | `25` requests/minute |
| Token rate limit | `25,000` tokens/minute |

Evidence source:

```text
az cognitiveservices account deployment show \
  -g rg-jm1-ai \
  -n ais-jm1-foundry \
  --deployment-name jm1-editorial-devline-primary
```

Observed readback:

```json
{
  "name": "jm1-editorial-devline-primary",
  "properties": {
    "currentCapacity": 25,
    "model": {
      "format": "Anthropic",
      "name": "claude-sonnet-5",
      "version": "2"
    },
    "provisioningState": "Succeeded",
    "rateLimits": [
      { "key": "request", "count": 25.0, "renewalPeriod": 60.0 },
      { "key": "token", "count": 25000.0, "renewalPeriod": 60.0 }
    ]
  },
  "sku": {
    "capacity": 25,
    "name": "GlobalStandard"
  }
}
```

## RBAC

Function App managed identity:

```text
e8c51a80-bdb0-46fa-b398-9109719d6427
```

Assignments confirmed at Foundry account scope:

| Role | Scope |
| --- | --- |
| Cognitive Services OpenAI User | `ais-jm1-foundry` |
| Cognitive Services User | `ais-jm1-foundry` |
| Foundry User | `ais-jm1-foundry` |

## Microsoft Source References

Microsoft Learn states that Claude Sonnet 5 is available as a Hosted on Azure GA model in Microsoft Foundry and that the Anthropic Messages REST endpoint follows:

```text
https://<resource-name>.services.ai.azure.com/anthropic/v1/messages
```

Source: https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/claude-models

Microsoft Learn also documents deploying and using Claude models in Microsoft Foundry:

Source: https://learn.microsoft.com/en-us/azure/foundry/foundry-models/how-to/use-foundry-models-claude

## Cost Boundary

Observed deployment uses existing Azure Foundry `GlobalStandard` deployment capacity. No evidence of a new reserved/minimum commitment was encountered during deployment. Normal model usage billing remains in force.

