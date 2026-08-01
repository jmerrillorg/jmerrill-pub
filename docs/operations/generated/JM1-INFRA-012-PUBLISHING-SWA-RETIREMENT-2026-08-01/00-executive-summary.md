# JM1-INFRA-012 Publishing Static Web Apps Retirement - Executive Summary

Generated: 2026-08-01
Branch: `codex/publishing-swa-retirement`
Repository: `jmerrillorg/jmerrill-pub`

## Result

PUBLISHING SWA RETIRED

The Publishing site `jmerrill.pub` was already serving production traffic from Azure App Service at the start of this work item. Static Web Apps still retained deployment, preview, custom-domain metadata, and obsolete configuration authority. JM1-INFRA-012 removed that active authority.

## Completed

- Disabled the GitHub `Azure Static Web Apps CI/CD` workflow.
- Removed `.github/workflows/azure-static-web-apps.yml` from source.
- Deleted obsolete Publishing SWA preview environments `341`, `349`, and `355`.
- Deleted repository Actions secrets `AZURE_STATIC_WEB_APPS_API_TOKEN` and `AZURE_STATIC_WEB_APPS_API_TOKEN_CALM_PLANT_0F4F58410`.
- Deleted Azure Static Web App resource `jmerrill-pub` in resource group `jmerrill-pub`.
- Confirmed App Service production and staging remain healthy after deletion.
- Replaced SWA rollback authority with App Service slot swap-back plus last-known-good immutable artifact.
- Updated current-state Publishing documentation and INFRA-007 exception status.

## Final Classification

PUBLISHING SWA RETIRED

## Material Note

During app-setting inventory, `az staticwebapp appsettings list` returned raw obsolete SWA app-setting values to the private Cody terminal session. The values were not copied into evidence, source, PR text, or retained files. The obsolete SWA resource was deleted, removing that stale SWA-hosted configuration copy. This is classified as `CONTAINED_OPERATOR_SESSION_OUTPUT`, with credential rotation left as a separate security-administration decision because many values are shared production credentials governed by Key Vault-backed App Service references.

