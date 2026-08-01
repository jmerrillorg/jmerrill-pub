# Production Validation

## Public Site Probes

| URL | Result | Observed response |
|---|---|---|
| `https://jmerrill.pub/` | 200 | J Merrill Publishing production site |
| `https://www.jmerrill.pub/` | 200 | J Merrill Publishing production site |
| `https://app-jm1-pub-prod.azurewebsites.net/` | 200 | J Merrill Publishing production site |
| `https://jmerrill.one/` | 200 | J Merrill One SWA public site |
| `https://www.jmerrill.one/` | 200 | J Merrill One SWA public site |
| `https://app-jm1-one-prod.azurewebsites.net/` | 200 | Minimal App Service runtime; `traffic_migrated=false` |
| `https://jmerrill.financial/` | 200 | J Merrill Financial SWA public site |
| `https://www.jmerrill.financial/` | 200 | J Merrill Financial SWA public site |
| `https://app-jm1-fin-prod.azurewebsites.net/` | 200 | Minimal App Service runtime; `traffic_migrated=false` |
| `https://jmerrill.foundation/` | 200 | J Merrill Foundation SWA public site |
| `https://www.jmerrill.foundation/` | 200 | J Merrill Foundation SWA public site |
| `https://app-jm1-foundation-prod.azurewebsites.net/` | 200 | Minimal App Service runtime; `traffic_migrated=false` |
| `https://jmerrill.org/` | 200 | Foundation content served through org path |
| `https://www.jmerrill.org/` | 200 | Foundation content served through org path |
| `https://jmerrill.productions/` | 200 | J Merrill Productions SWA public site |
| `https://www.jmerrill.productions/` | TLS failure | Certificate hostname mismatch |
| `https://app-jm1-productions-prod.azurewebsites.net/` | 503 | Known GATE-W3 Productions exception |
| `https://app-jm1-productions-prod-staging.azurewebsites.net/` | 200 | Minimal App Service staging runtime; `traffic_migrated=false` |

## Validation Conclusion

Only Publishing is production-certified on App Service. One, Financial, and Foundation App Service endpoints are healthy infrastructure references but not public-site replacements. Productions production App Service remains blocked by the known GATE-W3 exception.

