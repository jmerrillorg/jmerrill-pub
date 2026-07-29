# GATE-W1 Reference Certification Summary

Gate ID: GATE-W1  
Program: JM1 Implementation  
Workstream: Digital Experience Modernization  
Subject: jmerrill.pub App Service Reference Completion  
Execution timestamp: 2026-07-29T11:45:00Z
Repository branch: codex/jm1-infra-006-phase2-staging-certification  
Repository HEAD: a3a006bcf8839326f4270e789c1697c0d1ad68b7
Production deployment package SHA-256: 4f5ef6159127cbedf2ce8cdb57507de1efc68a651e15a192b9d1df30ab1bfe16
Staging deployment package SHA-256: a6016c1e9b515f2af9a0f37ee0bfe9924b5a4db0030eb7353187eae3ab4c3815
Continuation evidence timestamp: 2026-07-29T11:45:00Z

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
- Current PR head `a3a006bcf8839326f4270e789c1697c0d1ad68b7` was built as a standalone App Service package and deployed to the staging slot only.
- `/api/health` was hardened to return non-secret author-access diagnostics, process start time, uptime, and route duration without calling external dependencies.
- The App Service packaging workflow was hardened to assemble a standalone artifact through `scripts/package-app-service-artifact.mjs`, remove the root package manifest from the deployable zip, set `node server.js` as the startup command, and configure `WEBSITE_WARMUP_PATH=/api/health` with `WEBSITE_WARMUP_STATUSES=200`.
- A Publishing App Service GitHub Actions workflow was added for immutable artifact build, staging deployment, health certification, and production promotion behind a GitHub Environment approval. It is not yet proven by a live workflow run.
- Staging `/api/author/gate` master-code issuance isolated the runtime behavior: the gate returned 200, issued `jm1_author_portal_session`, `/api/author/context` returned 200, logout returned 200, and post-logout context returned 401.
- Health diagnostics showed the deployed runtime sees `env_registry`, one active grant, configured pepper, and configured session secret. The current registry does not contain a governed synthetic fixture marker, so the prior synthetic-code 401 is no longer classified as a parser defect.
- Staging deployed `a3a006bcf8839326f4270e789c1697c0d1ad68b7` through OneDeploy deployment `e9dec64d-f2df-4730-999b-424150dfc758` and returned `/api/health` 200 ready on that release. Restart-adjacent probes still produced six 20-second timeout windows before recovery; uptime reset confirmed the platform restarted the container.
- A restricted Cloudflare Turnstile widget named `JM1 Publishing /join` was created in the available Cloudflare account because no existing widget was visible. Hostname management was limited to `jmerrill.pub`, `www.jmerrill.pub`, and `app-jm1-pub-prod-staging.azurewebsites.net`; Managed mode remained selected and pre-clearance remained off.
- `TURNSTILE-SITE-KEY` and `TURNSTILE-SECRET-KEY` were rotated in `jm1-core-vault` without exposing the secret values. The staging slot was restarted, `/api/health` returned 200 ready, and `/api/publishing/intake/config` returned 200 with a valid Turnstile site-key presence signal.
- Staging `/join` rendered the Cloudflare Turnstile widget for the App Service staging hostname and issued browser tokens. A controlled invalid-token POST failed safely. A token-bearing synthetic multipart intake with idempotency key `e06ac49e-4fae-4595-b601-df863e1c43ab` returned 201 with reference `JMP-INT-202607-YEUSKK`; Dataverse showed exactly one intake row, manuscript received, workspace URL present, routing log, Stage 0 diagnostic, recommendation value, orchestration dispatched, and one publishing asset. Duplicate retry for prior idempotency key `501ad52e-8530-40b3-a5d3-dbb512134aef` returned 409 duplicate.
- Author Operating Center gate was tested against synthetic reference `JMP-INT-202607-YEUSKK`: gate returned 200, issued `jm1_author_portal_session`, context returned 200 with the synthetic author/project, no-cookie context returned 401, forged fallback session returned 401, missing/cross artifact request returned non-disclosing 404, logout returned 200, and post-logout context returned 401.

## Remaining Certification Blockers

Four items prevent a clean CERTIFIED_REFERENCE decision:

1. Slot-swap rollback proof remains incomplete. Staging auto-swap is now disabled, but no governed swap/rollback exercise was completed.
2. App Service CI/CD has been added in source but has not yet executed successfully as the active governed release path.
3. Staging runtime health is intermittently unstable after deployment or restart. The latest restart probe produced six 20-second timeout windows before recovery and a process uptime reset.
4. Fresh governed Author Operating Center own-artifact proof remains incomplete because the synthetic project has no delivered author-facing artifact backed by Graph content. Denial and logout controls passed.

## Decision

NOT_CERTIFIED

jmerrill.pub is now operating on App Service and materially advanced. Positive `/join` business-path proof is complete, but the implementation is not yet the canonical reference until rollback proof, App Service CI/CD execution, restart-stable staging health, and fresh synthetic Author Operating Center own-artifact proof pass without exception.
