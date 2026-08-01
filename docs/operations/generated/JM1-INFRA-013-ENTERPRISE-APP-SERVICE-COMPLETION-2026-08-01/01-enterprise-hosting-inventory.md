# Enterprise Hosting Inventory

## Commercial Properties

| Property | Current public host | Current live platform | App Service target | Runtime | Classification | Status |
|---|---|---|---|---|---|---|
| `jmerrill.pub` | `jmerrill.pub`, `www.jmerrill.pub` | Azure App Service | `app-jm1-pub-prod` | `NODE|24-lts` | A - already App Service | Certified production App Service |
| `jmerrill.one` | `jmerrill.one`, `www.jmerrill.one` | Azure Static Web Apps | `app-jm1-one-prod` | `NODE|22-lts` | B - partially migrated | App Service minimal runtime only; DNS still SWA |
| `jmerrill.financial` | `jmerrill.financial`, `www.jmerrill.financial` | Azure Static Web Apps | `app-jm1-fin-prod` | `NODE|22-lts` | B - partially migrated | App Service minimal runtime only; DNS still SWA |
| `jmerrill.foundation` | `jmerrill.foundation`, `www.jmerrill.foundation` | Azure Static Web Apps | `app-jm1-foundation-prod` | `NODE|22-lts` | B - partially migrated | App Service minimal runtime only; DNS still SWA |
| `jmerrill.org` | `jmerrill.org`, `www.jmerrill.org` | Azure Static Web Apps redirector | No dedicated certified replacement identified | N/A | C - still SWA | Redirector remains active |
| `jmerrill.productions` | `jmerrill.productions` | Azure Static Web Apps | `app-jm1-productions-prod` | `NODE|22-lts` | B - partially migrated / blocked | Production App Service returns 503 |
| `www.jmerrill.productions` | `www.jmerrill.productions` | SWA/redirector reference | `app-jm1-productions-prod` intended | `NODE|22-lts` | C - still SWA | TLS hostname mismatch observed |
| `book.jmerrill.financial` | `book.jmerrill.financial` | Azure Static Web Apps redirector | No dedicated certified replacement identified | N/A | C - still SWA | Redirector remains active |

## Separate Review Properties

| Property | Current platform | Classification | Disposition |
|---|---|---|---|
| `agapeic.org` | Azure App Service / separate AIC resources | D - separate enterprise | Not migrated under JM1 commercial gate |
| `jackiesmithjr.com` | Separate personal-brand lane | D - separate enterprise | Not migrated under this gate |
| `marcusmcintosh.org` | Separate review lane | D - separate enterprise | Not migrated under this gate |
| Non-JM1 client properties | Unknown / out of scope | D - separate enterprise | Not migrated under this gate |

## Active SWA Resources Observed

| SWA resource | Resource group | Default hostname | Repository | SKU | Disposition |
|---|---|---|---|---|---|
| `jmerrill-one` | `jmerrill-one` | `lively-flower-04d9c640f.6.azurestaticapps.net` | `jmerrillorg/jmerrill-one` | Standard | Retain until App Service replacement is real-site certified |
| `jmerrill-financial` | `jmerrill-financial_group` | `polite-glacier-0334b1d0f.6.azurestaticapps.net` | `jmerrillorg/jmerrill-financial` | Standard | Retain until App Service replacement is real-site certified |
| `foundation-main` | `jm1-core-services` | `mango-beach-09911520f.1.azurestaticapps.net` | `jmerrillorg/jmerrillfoundation` | Free | Retain until App Service replacement is real-site certified |
| `jmerrill-productions` | `jmerrill-productions-rg` | `lemon-stone-014fed310.7.azurestaticapps.net` | `jmerrillorg/jmerrill-productions` | Free | Retain until GATE-W3 Productions exception is resolved |
| `org-to-foundation-redirect` | `jm1-core-services` | `lively-plant-03a66a30f.2.azurestaticapps.net` | `jmerrillorg/org-to-foundation-redirect` | Free | Replace with governed redirect path before retirement |
| `jm1-book-redirector` | `jm1-core-services` | `delightful-sand-0b94b130f.7.azurestaticapps.net` | `jmerrillorg/jm1-book-redirector` | Free | Replace with governed redirect path before retirement |
| `aic-public` | `agape-international-cathedral-rg` | `purple-ocean-086ebc20f.2.azurestaticapps.net` | SwaCli | Free | Separate enterprise |
| `jackiesmithjr` | `jm1-core-services` | `victorious-sea-06433150f.7.azurestaticapps.net` | `jmerrillorg/jackiesmithjr` | Free | Separate personal-brand lane |

