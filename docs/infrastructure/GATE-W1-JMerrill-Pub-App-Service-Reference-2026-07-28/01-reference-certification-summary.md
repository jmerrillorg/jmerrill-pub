# GATE-W1 Reference Certification Summary

Gate ID: GATE-W1  
Program: JM1 Implementation  
Workstream: Digital Experience Modernization  
Subject: jmerrill.pub App Service Reference Completion  
Execution timestamp: 2026-07-29T03:05:00Z
Repository branch: codex/jm1-infra-006-phase2-staging-certification  
Repository HEAD: 91152240cc23c2967d32af0e1393d353f1cae6ee
Production deployment package SHA-256: 4f5ef6159127cbedf2ce8cdb57507de1efc68a651e15a192b9d1df30ab1bfe16
Staging deployment package SHA-256: 76006c49c96793020359494d9dce32a7dad6a38c619624d8b5c67cbb8e824b4e

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
- Native App Service staging `/api/author/gate` synthetic session issuance passed after an explicit staging restart; the gate returned 200, issued `jm1_author_portal_session`, and `/api/author/context` resolved the trusted relationship-scoped session.
- Author Operating Center denial controls passed after the same proof: no-cookie context returned 401, forged former fallback session returned 401, logout returned 200, and post-logout context returned 401.
- Temporary synthetic author settings were restored to Key Vault references after testing.
- Staging route smoke passed after warmup: `/api/health`, `/`, `/join`, `/books`, `/authors`, `/robots.txt`, `/sitemap.xml`, and `/api/publishing/intake/config` returned 200.

## Remaining Certification Blockers

Four items prevent a clean CERTIFIED_REFERENCE decision:

1. Positive `/join` submission proof remains blocked because the production Turnstile widget still reports Cloudflare client error `110200` on `app-jm1-pub-prod-staging.azurewebsites.net`. The page and config endpoint passed, but no valid token-bearing submission can be completed until the hostname is authorized in the widget.
2. Slot-swap rollback proof remains incomplete. Staging auto-swap is now disabled, but no governed swap/rollback exercise was completed.
3. App Service CI/CD is not yet the active GitHub Actions release path. The repository workflow still targets Azure Static Web Apps; App Service deployment was performed manually with `az webapp deploy`.
4. Staging runtime health is intermittently unstable after deployment or restart. Several health probes passed after warmup, but restart-adjacent probes timed out before recovery.

## Decision

NOT_CERTIFIED

jmerrill.pub is now operating on App Service and materially advanced, but it is not yet the canonical reference implementation until the positive `/join` proof, rollback proof, App Service CI/CD path, and staging runtime stability pass without exception.
