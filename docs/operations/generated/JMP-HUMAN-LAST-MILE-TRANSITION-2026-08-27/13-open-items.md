# Open Items

Last Verified: 2026-08-27T11:06:33Z

## Attachment Retrieval

The exact delivered Establishing Glory attachment bytes were not materialized from the shared Publishing mailbox. Full last-mile commissioning requires a reliable way to inspect or archive the actual recipient-facing attachment payload and checksum.

## Future Send Proof

The Long Watch scheduled release must pass the new last-mile gate at send time before any author-facing release occurs.

## ACS Protected Deployment RBAC

The ACS relay source is manually deployed and running. The GitHub OIDC deployment path still requires Azure RBAC correction because the workflow principal cannot read/deploy `func-jm1-acs-email-relay` in `rg-jm1-communications`.

## Diagnostic Runner Protected Deployment Approval

The Diagnostic Runner source is manually deployed and `/api/health` reports the current main release. The GitHub production deployment job for the earlier main run remained waiting on the protected environment gate during this pass.
