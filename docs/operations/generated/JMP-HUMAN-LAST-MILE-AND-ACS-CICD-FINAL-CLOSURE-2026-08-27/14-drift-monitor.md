# Drift Monitor

Last Verified: 2026-08-27T18:43:03Z

## Controls to Monitor

| Control | Expected State | Drift Signal |
| --- | --- | --- |
| ACS package pointer | `WEBSITE_RUN_FROM_PACKAGE` references current protected main deployment package. | Package URL references an older or unknown SHA. |
| ACS release metadata | `JM1_RELEASE_SHA` and `JM1_PRODUCTION_RELEASE_SHA` equal deployed package SHA. | Metadata SHA differs from package SHA. |
| ACS runtime | Node 24. | Runtime reports anything other than `NODE|24`. |
| ACS workflow | OIDC deployment from protected `production` environment. | Manual ACS deployment used as normal path. |
| Publishing mailbox readback | Attachment route can fetch exact bytes from `publishing@jmerrill.one`. | Connector can list messages but cannot materialize attachments. |
| Human last-mile exact proof | Recipient attachment SHA equals certified artifact SHA. | Any checksum mismatch or missing recipient attachment. |

## Current Drift Items

1. Establishing Glory delivered attachment checksum does not match the certified artifact checksum.
2. Diagnostic runner GitHub deploy run remained queued for production-environment approval; manual diagnostic deployment was used for evidence collection.
3. Azure management-plane function count/readback for newly deployed diagnostic routes may lag direct route availability.

## Non-Blocking ACS Note

The ACS Function App is Linux Consumption. Azure emitted a future platform advisory that Linux Consumption reaches end-of-life on September 30, 2028. This is an observability/planning item, not an immediate ACS CI/CD commissioning blocker.

