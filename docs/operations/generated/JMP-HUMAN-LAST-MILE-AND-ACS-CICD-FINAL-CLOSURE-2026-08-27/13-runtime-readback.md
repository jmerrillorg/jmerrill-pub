# Runtime Readback

Last Verified: 2026-08-27T18:43:03Z

## ACS Relay

- Function App: `func-jm1-acs-email-relay`
- Resource group: `rg-jm1-communications`
- Location: East US
- Runtime: `NODE|24`
- Run-from-package artifact: `acs-relay-a860e7b04d64d4496658df0b69b3e0166ade8c4d.zip`
- `JM1_RELEASE_SHA`: `a860e7b04d64d4496658df0b69b3e0166ade8c4d`
- `JM1_PRODUCTION_RELEASE_SHA`: `a860e7b04d64d4496658df0b69b3e0166ade8c4d`

Function routes previously read back from the ACS relay include:

- `send-agreement-package`
- `send-approved-author-response`
- `send-author-acknowledgment`
- `send-enterprise-governed-email`
- `send-internal-author-draft-review-notification`
- `send-join-internal-notification`
- `send-publishing-joined-family-internal-notification`
- `send-publishing-payment-internal-notification`

## Diagnostic Runner

- Function App: `func-jm1-diagnostic-ai-runner`
- Deployed package: `diagnostic-ai-runner-a860e7b04d64d4496658df0b69b3e0166ade8c4d.zip`
- Package SHA256: `124d4ceec0ae0623829b4d83f9b80f8f60da3d8a285e426799b962a99dd7ce49`
- Health readback: release `a860e7b04d64d4496658df0b69b3e0166ade8c4d`, Node `v22.23.2`
- Publishing mail read enabled: true

The management-plane function list did not immediately surface the new diagnostic attachment route, but direct HTTP invocation succeeded and returned attachment metadata and bytes for the governed Publishing mailbox message.

