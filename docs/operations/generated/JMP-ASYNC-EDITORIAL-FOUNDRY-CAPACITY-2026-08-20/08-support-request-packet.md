# Support Request Packet

Last Verified: 2026-08-20

If a Microsoft support/capacity request is needed, use:

- Subscription: `9ee13245-2303-4010-8b6d-35f7cbcfdc0e`
- Tenant: `352d075e-8e17-4169-9f8e-22e6946ce66d`
- Resource group: `rg-jm1-ai`
- Resource: `ais-jm1-foundry`
- Region: `eastus2`
- Project: `jm1-editorial-foundry`
- Deployment: `jm1-editorial-devline-primary`
- Model: `claude-sonnet-5`
- Version: `2`
- SKU: `GlobalStandard`
- Current deployment capacity: `25`
- Current deployment limits: `25` requests/minute, `25,000` tokens/minute
- Observed blocker: `5,000` output tokens per 60 seconds for user/model/minute
- Business workload: governed long-form Publishing editorial execution for real manuscripts, requiring ordered full-manuscript Line Editing chunks and no partial author-facing delivery.

Requested outcome: confirm or raise the user/model output-token throttle or provide Microsoft-approved configuration guidance for governed long-form Claude execution in Foundry.

