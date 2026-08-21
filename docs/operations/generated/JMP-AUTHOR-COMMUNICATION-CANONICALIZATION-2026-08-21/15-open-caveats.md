# Open Caveats

Last Verified: 2026-08-21T08:30:00Z

## Reply-To Header Visibility

Relay construction and tests prove `replyTo: publishing@jmerrill.one`. Outlook shared mailbox fetch did not expose the Reply-To field. A direct Microsoft Graph lookup for the same message was attempted with an in-memory token and returned `ErrorAccessDenied`.

Disposition: Not a runtime blocker for controlled commissioning; preserve as evidence limitation.

## ACS DMARC

ACS domain readback reports DMARC `NotStarted`.

Disposition: Documented DNS/email-authentication caveat; sender domain remains provisioned and verified for ACS sending.

## Linux Consumption Package Mode

Deleting `WEBSITE_RUN_FROM_PACKAGE` caused the authenticated acknowledgment path to fall back to old extracted content and fail with `ACS_SENDER_INVALID`. Re-deploying restored the corrected runtime, and Azure reintroduced package mode with a 2036 expiry.

Disposition: Controlled commissioning remains valid; long-term removal of package-mode dependency would require an infrastructure/runtime hosting change outside this P0 communication remediation.

## Node Version

Root lockfile install ran under Node `v26.0.0` while the repo declares Node `>=24 <25`.

Disposition: Documented environment caveat; validation passed.
