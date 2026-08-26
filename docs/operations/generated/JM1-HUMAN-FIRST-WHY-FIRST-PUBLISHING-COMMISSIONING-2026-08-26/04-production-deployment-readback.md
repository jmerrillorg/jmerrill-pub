# Production Deployment Readback

Last verified: 2026-08-26T15:35:00Z

## Canonical Merge

- Repository: jmerrillorg/jmerrill-pub
- PR: #648
- Merge SHA: `3b65eada7e5937d5049a53ec2aa3b8885e213398`
- Scope: Publishing proving runtime for JM1-HUMAN-FIRST-WHY-FIRST-v1

## ACS Relay Deployment

Deployment was applied to the live ACS relay function app:

- Azure subscription: JM1 - Nonprofit Core (2025 Grant)
- Resource group: `rg-jm1-communications`
- Function app: `func-jm1-acs-email-relay`
- Host: `func-jm1-acs-email-relay.azurewebsites.net`
- State: `Running`

Observed routes:

- `send-agreement-package`
- `send-approved-author-response`
- `send-author-acknowledgment`
- `send-internal-author-draft-review-notification`
- `send-join-internal-notification`
- `send-publishing-joined-family-internal-notification`
- `send-publishing-payment-internal-notification`

Safe unauthenticated probe:

- Route: `POST /api/send-approved-author-response`
- Result: `401 UNAUTHORIZED`
- Meaning: relay key gate remained enforced.

Duplicate-footer fail-closed probe:

- Route: `POST /api/send-approved-author-response`
- Payload: synthetic author-review message containing two canonical Publishing footer blocks
- Result: `400 ACS_RELAY_VALIDATION_FAILED`
- Reason: `AUTHOR_REVIEW_PACKAGE_DUPLICATE_SIGNATURE_BLOCKED`
- Author-facing send: `0`

## Workflow Target Drift

The GitHub deployment workflow still references `func-jm1-acs-email-relay-flex`, but Azure readback did not find that function app in `rg-jm1-communications`. The live relay app is `func-jm1-acs-email-relay` and was deployed directly for this commissioning pass.

This is recorded as deployment-target drift evidence. It did not block the live ACS relay verification above.
