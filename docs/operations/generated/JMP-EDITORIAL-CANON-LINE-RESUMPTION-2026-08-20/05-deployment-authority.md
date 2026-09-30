# Deployment Authority

Last verified: 2026-08-20T13:22:13Z

## Web App

- App Service: `app-jm1-pub-prod-v2`
- Resource group: `rg-jm1-web-prod-premium`
- Health endpoint: `https://jmerrill.pub/api/health`
- Health release readback: `c7fab9b64a2b1a5ae61d1763900c208e9e66e883`
- GitHub Actions workflow: `azure-app-service-premium.yml`
- Deployment run: `https://github.com/jmerrillorg/jmerrill-pub/actions/runs/32373355321`
- Run head SHA: `c7fab9b64a2b1a5ae61d1763900c208e9e66e883`
- Run conclusion: SUCCESS

## Function Runtime

- Function App: `func-jm1-diagnostic-ai-runner`
- Resource group: `rg-jm1-ai`
- Runtime route confirmed: `run-editorial-execution-runtime-admin-replay`
- Runtime route confirmed: `run-approval-event-consumer-admin-replay`
- Runtime route confirmed: `run-author-review-response-consumer-admin-replay`
- App setting readback: `JM1_RELEASE_SHA=c7fab9b64a2b1a5ae61d1763900c208e9e66e883`
- App setting readback: `JM1_AI_EXECUTION_ENABLED=true`
- App setting readback: `JM1_PROMPT_MODEL_DEPLOYMENT_ALIAS=jm1-editorial-devline-primary`
- App setting readback: `AZURE_FOUNDRY_CLAUDE_DEPLOYMENT_NAME=jm1-editorial-devline-primary`

## Boundary

Production source authority matches origin/main SHA `c7fab9b64a2b1a5ae61d1763900c208e9e66e883`.

