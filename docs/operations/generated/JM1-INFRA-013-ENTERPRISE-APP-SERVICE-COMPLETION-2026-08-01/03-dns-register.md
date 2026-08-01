# DNS Register

Live DNS was inspected using public DNS resolution. No DNS changes were made.

| Host | Observed resolution | Current interpretation |
|---|---|---|
| `jmerrill.one` | A record observed: `52.252.23.178` | SWA apex path remains active |
| `www.jmerrill.one` | CNAME to `lively-flower-04d9c640f.6.azurestaticapps.net` | SWA |
| `jmerrill.pub` | A record observed: `40.122.114.229` | Publishing App Service cutover complete |
| `www.jmerrill.pub` | CNAME to `app-jm1-pub-prod.azurewebsites.net` | Publishing App Service |
| `jmerrill.financial` | A record observed: `52.252.74.253` | SWA apex path remains active |
| `www.jmerrill.financial` | CNAME to `polite-glacier-0334b1d0f.6.azurestaticapps.net` | SWA |
| `jmerrill.foundation` | A record observed: `20.106.29.135` | SWA apex path remains active |
| `www.jmerrill.foundation` | CNAME to `mango-beach-09911520f.1.azurestaticapps.net` | SWA |
| `jmerrill.org` | A record observed: `20.36.155.201` | SWA redirector path remains active |
| `www.jmerrill.org` | CNAME to `lively-plant-03a66a30f.2.azurestaticapps.net` | SWA redirector |
| `jmerrill.productions` | A record observed: `9.163.40.246` | Active production path requires follow-up before App Service migration |
| `www.jmerrill.productions` | CNAME to `victorious-stone-0672d8210.6.azurestaticapps.net` | SWA/redirector reference; TLS mismatch observed |
| `agapeic.org` | A record observed: `20.119.8.5` | Separate AIC lane |
| `www.agapeic.org` | CNAME to `aic-app-service-prod.azurewebsites.net` | Separate AIC lane |
| `jackiesmithjr.com` | A record observed: `132.220.38.112` | Separate personal-brand lane |

