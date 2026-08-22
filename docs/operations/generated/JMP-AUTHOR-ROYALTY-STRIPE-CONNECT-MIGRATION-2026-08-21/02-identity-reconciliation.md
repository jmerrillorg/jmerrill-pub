# Identity Reconciliation

Last Verified: 2026-08-22T00:09:38Z

## Method

Read-only Dataverse reconciliation used Azure CLI delegated token access for `https://jm1hq.crm.dynamics.com` and queried the live `contact` table with non-sensitive identity and Stripe readiness fields.

Primary matching rule for this pass:

```text
Bill.com exact-author Primary Email
→ Dataverse Contact emailaddress1 / emailaddress2 / emailaddress3
```

No Dataverse writes were performed.

## Result

| Classification | Count | Meaning |
| --- | ---: | --- |
| READY_FOR_STRIPE_CONNECT | 1 | One exact-author row matched one Contact and had no existing Connect account ID |
| EXISTING_STRIPE_CONNECT_ACCOUNT | 3 | Three exact-author rows matched Contacts with existing Connect account IDs |
| MISSING_EMAIL | 0 | No in-scope Bill.com exact-author rows lacked Primary Email |
| AMBIGUOUS_AUTHOR_MATCH | 0 | No source email matched multiple Dataverse Contacts in this pass |
| DUPLICATE_EMAIL_REVIEW | 2 | Two exact-author rows share one Bill.com Primary Email and require operator review |
| OTHER_DATA_QUALITY_HOLD | 64 | Bill.com Primary Email did not match a live Contact email field |

## Finding

Broad automated migration is blocked. The Bill.com source population is real, but most rows cannot yet be safely bound to a governed Dataverse author Contact by email. The migration must not create Stripe Connect accounts from Bill.com names alone.

## Read-Only Boundary

- Contact records scanned: 5000
- Dataverse writes: 0
- Stripe mutations: 0
- Author communications: 0

