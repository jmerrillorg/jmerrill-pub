# Route and Configuration Parity

## Route Matrix

| Capability | App Service result | SWA result after retirement | Owner |
| --- | --- | --- | --- |
| `/` | 200 | SWA default host 404 | App Service |
| `www.jmerrill.pub/` | 200 | Not bound to SWA | App Service |
| `/join` | 200 | SWA default host 404 | App Service |
| `/api/health` | 200 ready | SWA default host 404 | App Service |
| `/api/author/context` | 401 unauthenticated | SWA default host 404 | App Service |
| `/api/publisher/operating-center` | 401 unauthenticated | SWA default host 404 | App Service |
| `/api/publishing/intake/config` | 200 | SWA default host 404 | App Service |
| `/api/author/activation/complete` | POST 401 unauthenticated; GET 405 | SWA default host 404 | App Service |
| `/api/author/stripe/connect/start` | POST 401 unauthenticated | SWA default host 404 | App Service |
| `/api/author/stripe/payment/commissioning/start` | POST 401 unauthenticated | SWA default host 404 | App Service |

## Configuration Parity

App Service production and staging hold current runtime configuration. Sensitive values are Key Vault-backed where appropriate. The retired SWA resource held an obsolete app-setting copy and is no longer an authority or recovery source.

## Unique SWA Capability

No unique production capability was identified on SWA. Public DNS, custom domains, API routes, health, intake, protected operating-center routes, and payment-boundary probes all validated through App Service after SWA deletion.

