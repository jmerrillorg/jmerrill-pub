# Workflow Register

GitHub workflow and secret inspection was performed using metadata-only calls. Secret values were not retrieved.

| Repository | Active SWA workflow | SWA secret names observed | Disposition |
|---|---|---|---|
| `jmerrillorg/jmerrill-pub` | No active Publishing SWA deployment authority observed after INFRA-012 | None required for Publishing | App Service authority |
| `jmerrillorg/jmerrill-one` | `.github/workflows/azure-static-web-apps.yml` | `AZURE_STATIC_WEB_APPS_API_TOKEN`, `AZURE_STATIC_WEB_APPS_API_TOKEN_LIVELY_FLOWER_04D9C640F` | Retain until migration completes |
| `jmerrillorg/jmerrill-financial` | `.github/workflows/azure-static-web-apps.yml` | `AZURE_STATIC_WEB_APPS_API_TOKEN`, `AZURE_STATIC_WEB_APPS_API_TOKEN_POLITE_GLACIER_0334B1D0F` | Retain until migration completes |
| `jmerrillorg/jmerrillfoundation` | `.github/workflows/azure-static-web-apps.yml` | `AZURE_STATIC_WEB_APPS_API_TOKEN`, `AZURE_STATIC_WEB_APPS_API_TOKEN_MANGO_BEACH_09911520F` | Retain until migration completes |
| `jmerrillorg/jmerrill-productions` | `.github/workflows/azure-static-web-apps.yml` | `AZURE_STATIC_WEB_APPS_API_TOKEN_LEMON_STONE_014FED310`, `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTIONS` | Retain until Productions exception resolves |
| `jmerrillorg/jm1-book-redirector` | `.github/workflows/azure-static-web-apps-delightful-sand-0b94b130f.yml` | `AZURE_STATIC_WEB_APPS_API_TOKEN_DELIGHTFUL_SAND_0B94B130F`, `AZURE_STATIC_WEB_APPS_API_TOKEN_ICY_SAND_03E94600F` | Retain until redirector replacement |
| `jmerrillorg/org-to-foundation-redirect` | `.github/workflows/azure-static-web-apps-lively-plant-03a66a30f.yml` | `AZURE_STATIC_WEB_APPS_API_TOKEN_LIVELY_PLANT_03A66A30F` | Retain until redirector replacement |
| `jmerrillorg/jm-www-redirect` | `.github/workflows/azure-static-web-apps-kind-field-08690ab10.yml` | `AZURE_STATIC_WEB_APPS_API_TOKEN_KIND_FIELD_08690AB10` | Separate redirect inventory |
| `jmerrillorg/jm-redirect-foundation` | `.github/workflows/azure-static-web-apps-kind-ground-0c9c7f810.yml` | `AZURE_STATIC_WEB_APPS_API_TOKEN_KIND_GROUND_0C9C7F810` | Separate redirect inventory |
| `jmerrillorg/jm-productions-redirect` | `.github/workflows/azure-static-web-apps-victorious-stone-0672d8210.yml` | `AZURE_STATIC_WEB_APPS_API_TOKEN_VICTORIOUS_STONE_0672D8210` | Productions redirect inventory |

