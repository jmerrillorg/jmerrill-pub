# GATE-W1 Reference Certification Summary

Gate ID: GATE-W1
Program: JM1 Implementation
Workstream: Digital Experience Modernization
Subject: jmerrill.pub App Service Reference Completion
Execution timestamp: 2026-07-29T16:45:00Z
Repository branch: codex/jm1-infra-006-phase2-staging-certification
Certified application runtime release: cb32158e4c52750b41d2eda4351af0f8f356fb00
Production deployment package SHA-256: 4f5ef6159127cbedf2ce8cdb57507de1efc68a651e15a192b9d1df30ab1bfe16
Staging release: cb32158e4c52750b41d2eda4351af0f8f356fb00
Continuation evidence timestamp: 2026-07-29T16:45:00Z

## Scope

This package covers only jmerrill.pub, app-jm1-pub-prod, and Publishing-specific Azure resources. No other JM1 web property, shared scheduling system, Dataverse schema, repository consolidation, redirect architecture, Financial migration, Bookings retirement, or OR-2026-002 work was modified.

## Completed

- Production App Service is live and healthy for jmerrill.pub.
- Publishing-only DNS and managed certificates are active for jmerrill.pub and www.jmerrill.pub.
- Production and staging route smoke tests passed.
- Managed identity, Key Vault references, HTTPS-only behavior, TLS, health checks, deployment slots, and runtime settings were verified.
- Production App Service diagnostics stream HTTP, console, app, audit, platform, authentication logs, and metrics to the governed Log Analytics workspace.
- Alerts are enabled for HTTP 5xx, response time, production health, staging health, deployment events, restart/startup events, Turnstile/intake failures, Author Gate failures, orchestration failures, and rollback/swap events.
- Staging auto-swap was corrected to disabled and remains `autoSwapSlotName: null`.
- Application runtime release `cb32158e4c52750b41d2eda4351af0f8f356fb00` was built by the Publishing App Service CI/CD workflow and deployed to the staging slot only; production promotion remained skipped.
- Explicit staging restart on `cb32158e4c52750b41d2eda4351af0f8f356fb00` produced 10 consecutive `/api/health` responses, all HTTP 200 ready, all reporting the expected release and disabled payment gate.
- Staging `/join` rendered the restricted Cloudflare Turnstile widget for `app-jm1-pub-prod-staging.azurewebsites.net` and issued browser tokens.
- Invalid Turnstile failed safely.
- Current-release token-bearing synthetic multipart DOCX intake returned 201 with reference `JMP-INT-202607-3R2ETT`.
- Dataverse readback for `JMP-INT-202607-3R2ETT` showed exactly one intake row, one synthetic Contact, one Lead routing record, manuscript received, SharePoint workspace URL/folder present, author acknowledgement sent, title/asset/stage initialized, Stage 0 diagnostic created, recommendation `Starter`, orchestration dispatched, and execution evidence written.
- Duplicate retry for the same idempotency key returned 409 duplicate.
- Author Operating Center staging gate for `JMP-INT-202607-YEUSKK` returned 200, issued `jm1_author_portal_session`, context returned 200, exactly one artifact was projected, own artifact download returned 200 with filename `jm1-gate-w1-author-artifact.txt`, MIME `text/plain; charset=utf-8`, and SHA-256 `cff8c57e8a7592bbb71ad2ecd94897933bf58e8fc0f4cb7e855dd1c33c3ad3ab`.
- Cross/missing artifact returned non-disclosing 404, no-cookie artifact returned 401, forged former-fallback session returned 401, logout returned 200, and post-logout context returned 401.
- Staging immutable-artifact rollback/roll-forward evidence remains valid; production slot swap was not performed because production promotion of PR #349 is not authorized under this gate.

## Nonblocking Observations

- The active intake router creates a Lead routing record for `/join`; no Dataverse Appointment was created or required by the current implementation.
- Earlier synthetic link/PDF and short-DOCX attempts correctly reached governed diagnostic exception states before the long-DOCX fixture proved the positive recommendation path.
- Static Web Apps retirement, additional web-property migration, GATE-W2/GATE-W3, Stripe payouts, Business Central posting, and broad author rollout remain unauthorized.

## Decision

CERTIFIED_REFERENCE

jmerrill.pub is operating on App Service and satisfies the GATE-W1 reference requirements for Publishing. The next authorized recommendation is GATE-W2, Enterprise Web Platform Topology & Cost Approval.
