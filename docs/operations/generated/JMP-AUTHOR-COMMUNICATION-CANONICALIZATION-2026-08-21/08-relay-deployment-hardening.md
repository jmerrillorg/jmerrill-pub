# Relay Deployment Hardening

Last Verified: 2026-08-21T08:24:00Z

## Release Artifact

| Field | Value |
|---|---|
| Artifact | `/tmp/jm1-acs-relay-release-20260821082121/acs-email-relay.zip` |
| SHA-256 | `43f2fa8703634bcc963fbfb1afea76bb5e79435fca02f6570c9114f602bca8bd` |
| Size | 10M |

## Deployment Actions

- Deployed zip to `func-jm1-acs-email-relay`.
- Updated `ACS_EMAIL_SENDER` to `publishing@email.jmerrill.one`.
- Confirmed `ACS_AUTHOR_RESPONSE_EMAIL_SENDER` remains `publishing@email.jmerrill.one`.
- Deleted `WEBSITE_RUN_FROM_PACKAGE` and restarted to test extracted-runtime viability.
- Extracted-runtime mode served the old code path on this Linux Consumption Function App and failed the authenticated canonical sender check with `ACS_SENDER_INVALID`.
- Re-deployed the corrected package. Azure reintroduced `WEBSITE_RUN_FROM_PACKAGE` as a package URL expiring in 2036.
- Final authenticated send `JMP-INT-202608-CANON04` was accepted after the re-deploy.

## Health

Unauthorized route probe returned `401` with `UNAUTHORIZED`, proving the handler is reachable and still protected by relay key authentication.

## Expiry Mitigation Truth

The prior one-year SAS package reference was removed. Because the relay runs on Azure Functions Linux Consumption, zip deployment reintroduced package mode. The current package URL is long-dated to 2036 and explicitly recorded here rather than silently ignored.
