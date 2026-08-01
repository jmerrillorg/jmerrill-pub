# Production Validation

## Route Validation

| Probe | Result |
| --- | --- |
| `https://jmerrill.pub/` | 200 |
| `https://www.jmerrill.pub/` | 200 |
| `https://jmerrill.pub/join` | 200 |
| `https://jmerrill.pub/api/health` | 200 |
| `https://app-jm1-pub-prod.azurewebsites.net/api/health` | 200 |
| `https://app-jm1-pub-prod-staging.azurewebsites.net/api/health` | 200 |
| `https://jmerrill.pub/api/author/context` | 401 unauthenticated |
| `https://jmerrill.pub/api/publisher/operating-center` | 401 unauthenticated |
| `https://jmerrill.pub/api/publishing/intake/config` | 200 |
| `POST https://jmerrill.pub/api/author/activation/complete` | 401 unauthenticated |
| `POST https://jmerrill.pub/api/author/stripe/connect/start` | 401 unauthenticated |
| `POST https://jmerrill.pub/api/author/stripe/payment/commissioning/start` | 401 unauthenticated |
| `POST https://jmerrill.pub/api/author/logout` | 200 |

## Health Dependencies

`/api/health` reported ready for configuration, Dataverse, Graph/SharePoint, ACS relay, artifact configuration, author portal session configuration, and Stripe enrollment configuration. Payment gate remained `disabled`.

## Telemetry

Application Insights component `appi-jm1-pub-prod` returned `Succeeded` with a connection string present and 90-day retention.

## Safety

No author communication, package release, title advancement, unexpected Dataverse write, Stripe action, payment action, Business Central posting, DNS outage, or SWA restoration occurred.

