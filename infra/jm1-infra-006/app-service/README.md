# JM1-INFRA-006 App Service IaC

Status: Foundation-ready template. Do not deploy until Jackie authorizes Azure resource creation.

This Bicep package prepares the App Service migration target for `jmerrill.pub`:

- Linux App Service Plan
- Linux Web App
- staging slot
- system-assigned managed identities
- Application Insights
- `/api/health` health check
- Key Vault reference app settings
- diagnostic settings to Log Analytics

Validation:

```bash
az bicep build --file infra/jm1-infra-006/app-service/main.bicep
node --test scripts/infra006_health_contract.test.mjs
```

Deployment is intentionally omitted from this repository wave.
