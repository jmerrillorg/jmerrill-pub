# Deployment Readback

Last Verified: 2026-08-27T11:06:33Z

## Canonical Main

- Main tip after PR #663 and PR #664: bdd8443569226ffaa28cefb11e67f1b97e2eed4b

## Premium App Service

- Workflow: Deploy J Merrill Publishing to Premium App Service
- Run: 33065026134
- Result: SUCCESS
- Head: 985d2bff0f79452094c52855703900f1668d965b

## Diagnostic Runner

- Function App: func-jm1-diagnostic-ai-runner
- Resource group: rg-jm1-ai
- Deployment method: manual zip deploy using local Azure authority after GitHub production environment job remained waiting.
- Package: /tmp/diagnostic-ai-runner-bdd8443569226ffaa28cefb11e67f1b97e2eed4b-manual.zip
- Package checksum: ddd35f33b9c07fdc0dcdbfcde3c5a827704a06a548fdd80fc2cc492368d9c783
- Health URL: https://func-jm1-diagnostic-ai-runner.azurewebsites.net/api/health
- Health result: ready
- Health release: bdd8443569226ffaa28cefb11e67f1b97e2eed4b
- Health productionRelease: bdd8443569226ffaa28cefb11e67f1b97e2eed4b
- Node reported by health: v22.23.2

## ACS Email Relay

- Function App: func-jm1-acs-email-relay
- Resource group: rg-jm1-communications
- Deployment method: manual zip deploy using local Azure authority after GitHub OIDC deployment failed on Azure RBAC.
- Package: /tmp/acs-relay-bdd8443569226ffaa28cefb11e67f1b97e2eed4b-manual-with-deps.zip
- Package checksum: cf4778cd05e42325614c39d07aa99669b53dbcc533a8feb5f54bf2d18abdb499
- Function App state: Running
- Runtime: Node|24
- Routes listed:
  - send-agreement-package
  - send-approved-author-response
  - send-author-acknowledgment
  - send-enterprise-governed-email
  - send-internal-author-draft-review-notification
  - send-join-internal-notification
  - send-publishing-joined-family-internal-notification
  - send-publishing-payment-internal-notification

## Protected Workflow Caveats

- ACS GitHub workflow target was corrected from `func-jm1-acs-email-relay-flex` to `func-jm1-acs-email-relay`.
- ACS GitHub workflow still failed because the GitHub OIDC principal lacks `Microsoft.Web/sites/read` for the real Function App.
- Diagnostic Runner GitHub production deployment job remained waiting on protected environment approval during this pass.

