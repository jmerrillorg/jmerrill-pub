# Deployment Readback

Last Verified: 2026-08-27T01:50:00Z

## ACS Email Relay

Function app:

- func-jm1-acs-email-relay

Deployment result:

- Remote build completed successfully.
- Function indexing recovered after package deployment.

Indexed functions:

- send-agreement-package
- send-approved-author-response
- send-author-acknowledgment
- send-enterprise-governed-email
- send-internal-author-draft-review-notification
- send-join-internal-notification
- send-publishing-joined-family-internal-notification
- send-publishing-payment-internal-notification

## Diagnostic AI Runner

Function app:

- func-jm1-diagnostic-ai-runner

Deployment result:

- Self-contained zip deployment completed.
- Health endpoint restored.
- Function indexing restored.

Health readback:

- URL: https://func-jm1-diagnostic-ai-runner.azurewebsites.net/api/health
- HTTP: 200
- status: ready
- release: 073de67b772be59def6b446a7640084c26b8a0e5
- productionRelease: 073de67b772be59def6b446a7640084c26b8a0e5
- node: v22.23.2

Selected indexed functions:

- health
- run-editorial-cadence-release-consumer
- run-editorial-execution-runtime
- run-editorial-package-handoff-consumer
- run-targeted-editorial-execution

## App Settings Boundary

Diagnostic Runner build settings were restored after deployment:

- SCM_DO_BUILD_DURING_DEPLOYMENT=false
- ENABLE_ORYX_BUILD=false
- JM1_PUBLISHING_MAIL_READ_ENABLED=true

No secret values are recorded in this evidence package.
