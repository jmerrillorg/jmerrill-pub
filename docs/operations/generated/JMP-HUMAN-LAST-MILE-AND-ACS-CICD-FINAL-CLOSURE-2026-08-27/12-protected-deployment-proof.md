# Protected Deployment Proof

Last Verified: 2026-08-27T18:43:03Z

## PR and Merge

- PR: `#673`
- PR URL: `https://github.com/jmerrillorg/jmerrill-pub/pull/673`
- PR head: `bcd3e3ee777a5117406f054302a73200aef7163a`
- Merge/main SHA: `a860e7b04d64d4496658df0b69b3e0166ade8c4d`

## ACS Relay Workflow

- Workflow: `Deploy ACS Email Relay (Node 24)`
- Main run ID: `33103453988`
- Main run URL: `https://github.com/jmerrillorg/jmerrill-pub/actions/runs/33103453988`
- Head SHA: `a860e7b04d64d4496658df0b69b3e0166ade8c4d`
- Result: PASS

Validated steps included:

- checkout
- Node 24 setup
- dependency install
- tests
- lint
- audit
- Azure login using OIDC
- run-from-package upload
- `WEBSITE_RUN_FROM_PACKAGE` package-provenance check
- deployed runtime Node 24 check
- Function App health check

## Diagnostic Runner Workflow Boundary

The diagnostic route workflow for run `33103453967` remained in a production-environment approval queue at the time of closure. The diagnostic route had already been merged to main and was manually deployed for mailbox readback because the route was needed to complete the human last-mile evidence. This manual diagnostic deployment is not the ACS relay deployment path and does not weaken the ACS CI/CD commissioning result.

