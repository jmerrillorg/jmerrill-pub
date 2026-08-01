# Azure Cleanup Register

## Safe To Treat As Complete

- `jmerrill.pub`: the Publishing SWA resource is absent from the active Azure Static Web Apps inventory. No further SWA deletion was performed in this wave.

## Not Safe To Delete

| Resource | Reason |
|---|---|
| `jmerrill-one` SWA | Serves active `jmerrill.one` and `www.jmerrill.one` public site |
| `jmerrill-financial` SWA | Serves active `jmerrill.financial` and `www.jmerrill.financial` public site |
| `foundation-main` SWA | Serves active `jmerrill.foundation` and `www.jmerrill.foundation` public site |
| `jmerrill-productions` SWA | Serves active Productions path while App Service production remains unhealthy |
| `org-to-foundation-redirect` SWA | Serves active `jmerrill.org` redirect/path |
| `jm1-book-redirector` SWA | Serves active `book.jmerrill.financial` path |
| `aic-public` SWA | Separate AIC enterprise lane |
| `jackiesmithjr` SWA | Separate personal-brand lane |

## Azure Mutation

No Azure resources were deleted, resized, redeployed, or reconfigured during INFRA-013.

