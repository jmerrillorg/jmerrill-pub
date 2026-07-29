# GATE-W1 Reference Certification Summary

Gate ID: GATE-W1  
Program: JM1 Implementation  
Workstream: Digital Experience Modernization  
Subject: jmerrill.pub App Service Reference Completion  
Execution timestamp: 2026-07-29T02:20:00Z
Repository branch: codex/jm1-infra-006-phase2-staging-certification  
Repository HEAD: 91152240cc23c2967d32af0e1393d353f1cae6ee
Production deployment package SHA-256: 4f5ef6159127cbedf2ce8cdb57507de1efc68a651e15a192b9d1df30ab1bfe16
Staging deployment package SHA-256: ce38298cdc9d901ffd1a064400606c6fd34cabb9b2bf321eb3a6b6f05372a72e

## Scope

This package covers only jmerrill.pub, app-jm1-pub-prod, and Publishing-specific Azure resources. No other JM1 web property, shared scheduling system, Dataverse schema, repository consolidation, redirect architecture, or OR-2026-002 work was modified.

## Completed

- Production App Service was restored and verified healthy.
- Publishing-only DNS was cut over to App Service.
- Managed certificates were created and bound for jmerrill.pub and www.jmerrill.pub.
- Production and staging route smoke tests were completed.
- Managed identity, Key Vault references, HTTPS-only, TLS, health checks, and runtime settings were verified.
- Production App Service diagnostics were restored to the governed Log Analytics workspace.
- Metric alerts for HTTP 5xx and response time were present and enabled.
- Staging auto-swap was corrected to disabled after readback showed `autoSwapSlotName: production`.
- Current PR head `91152240cc23c2967d32af0e1393d353f1cae6ee` was built as a standalone App Service package and deployed to the staging slot only.
- Staging briefly recovered to `/api/health` 200 after Key Vault-backed author settings were restored, then final 20-second and 60-second health probes timed out. Staging runtime stability remains blocking.

## Remaining Certification Blockers

Four items prevent a clean CERTIFIED_REFERENCE decision:

1. Positive /join submission proof was not completed because the production Turnstile widget did not issue a token in automated browser validation. The page, config endpoint, and invalid-token denial path passed.
2. App Service staging /api/author/gate still rejected temporary certification-only synthetic access settings with 401 after the registry parser compatibility fix was deployed to staging, so native staging session issuance remains unproven through that route.
3. Slot-swap rollback proof remains incomplete. Staging auto-swap is now disabled, but no governed swap/rollback exercise was completed.
4. App Service CI/CD is not yet the active GitHub Actions release path. The repository workflow still targets Azure Static Web Apps; App Service deployment was performed manually with `az webapp deploy`.
5. Staging runtime health is unstable after restore; final probes timed out after 20 seconds and 60 seconds.

## Decision

NOT_CERTIFIED

jmerrill.pub is now operating on App Service and materially advanced, but it is not yet the canonical reference implementation until the positive /join proof and native staging Author Operating Center session-issuance proof pass without exception.
