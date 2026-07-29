# GATE-W1 Reference Certification Summary

Gate ID: GATE-W1  
Program: JM1 Implementation  
Workstream: Digital Experience Modernization  
Subject: jmerrill.pub App Service Reference Completion  
Execution timestamp: 2026-07-29T07:50:00Z
Repository branch: codex/jm1-infra-006-phase2-staging-certification  
Repository HEAD: a9304f2d85af4d6b53fe6d36b957c28f2cdddb40
Production deployment package SHA-256: 4f5ef6159127cbedf2ce8cdb57507de1efc68a651e15a192b9d1df30ab1bfe16
Staging deployment package SHA-256: f8afb6ca890891bddcb049f3422cb1e06b5fc8cefdf6952b228b2618b8a6ee88

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
- Current PR head `a9304f2d85af4d6b53fe6d36b957c28f2cdddb40` was built as a standalone App Service package and deployed to the staging slot only.
- `/api/health` was hardened to return non-secret author-access diagnostics, process start time, uptime, and route duration without calling external dependencies.
- The App Service startup command was hardened to expand Kudu-created `node_modules.tar.gz` before launching `server.js`, matching the manual production recovery pattern.
- A Publishing App Service GitHub Actions workflow was added for immutable artifact build, staging deployment, health certification, and production promotion behind a GitHub Environment approval. It is not yet proven by a live workflow run.
- Staging `/api/author/gate` master-code issuance isolated the runtime behavior: the gate returned 200, issued `jm1_author_portal_session`, `/api/author/context` returned 200, logout returned 200, and post-logout context returned 401.
- Health diagnostics showed the deployed runtime sees `env_registry`, one active grant, configured pepper, and configured session secret. The current registry does not contain a governed synthetic fixture marker, so the prior synthetic-code 401 is no longer classified as a parser defect.
- Staging route smoke passed after warmup: `/api/health`, `/`, `/join`, `/books`, `/authors`, `/robots.txt`, `/sitemap.xml`, and `/api/publishing/intake/config` returned 200.

## Remaining Certification Blockers

Five items prevent a clean CERTIFIED_REFERENCE decision:

1. Positive `/join` submission proof remains blocked because the production Turnstile widget still reports Cloudflare client error `110200` on `app-jm1-pub-prod-staging.azurewebsites.net`. The page and config endpoint passed, but no valid token-bearing submission can be completed until the hostname is authorized in the widget.
2. Slot-swap rollback proof remains incomplete. Staging auto-swap is now disabled, but no governed swap/rollback exercise was completed.
3. App Service CI/CD has been added in source but has not yet executed successfully as the active governed release path.
4. Staging runtime health is intermittently unstable after deployment or restart. The latest restart reproduced multiple 30-second timeouts before recovering with the new handler.
5. Fresh governed synthetic Author Operating Center fixture proof remains incomplete because the active registry does not contain a certification-only synthetic grant and the prior fixture was retired.

## Decision

NOT_CERTIFIED

jmerrill.pub is now operating on App Service and materially advanced, but it is not yet the canonical reference implementation until the positive `/join` proof, rollback proof, App Service CI/CD path, staging runtime stability, and fresh synthetic Author Operating Center artifact proof pass without exception.
