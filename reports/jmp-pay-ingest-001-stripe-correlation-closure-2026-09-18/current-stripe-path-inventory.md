# Current Stripe Path Inventory

| Path | Endpoint / handler | Current role | Correlation authority |
|---|---|---|---|
| Publishing payment webhook | `/api/author/stripe/webhook` | Signature verification, payment and Connect classification | Governed metadata, durable hashed object binding |
| Payment recovery | `/api/author/stripe/payment/recover` | Live PaymentIntent readback and bounded correction | Provider-read identifiers; explicit confirmed Opportunity correction only |
| First-payment invoice | `/api/author/billing/indomitable-first-payment` | Existing customer/invoice/finalization flow | `jm1_opportunity_id` metadata and Stripe idempotency keys |
| Commissioning checkout | `/api/author/stripe/payment/commissioning/start` | Commissioning-only checkout, currently gate-disabled in production health | Commissioning reference and package metadata |
| Connect start | `/api/author/stripe/connect/start` | Author payout account enrollment | Canonical royalty-payee/contact identity |
| Connect refresh | `/api/author/stripe/connect/refresh` | Refresh existing enrollment link | Signed enrollment context and connected account ID |
| Connect pilot | `/api/author/stripe/connect/pilot` | OIDC-governed pilot operation | GitHub OIDC plus governed cohort identity |
| Connect account webhook | shared webhook, `account.updated` | Dataverse readiness synchronization | Connected account ID with exact contact binding |

Payment-election and agreement orchestration remain upstream business gates. This packet does not redesign them. The active payment-success consumer writes only Publishing operational state and execution audit; it does not post QBO or Business Central entries.
