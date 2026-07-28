# GATE-W1 Reference Certification Summary

Gate ID: GATE-W1  
Program: JM1 Implementation  
Workstream: Digital Experience Modernization  
Subject: jmerrill.pub App Service Reference Completion  
Execution timestamp: 2026-07-28T15:41:14Z  
Repository branch: codex/jm1-infra-006-phase2-staging-certification  
Repository HEAD: 16903023640d955c1dc44db18ce8f161e2c9e915  
Production deployment package SHA-256: 4f5ef6159127cbedf2ce8cdb57507de1efc68a651e15a192b9d1df30ab1bfe16

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

## Remaining Certification Blockers

Two items prevent a clean CERTIFIED_REFERENCE decision:

1. Positive /join submission proof was not completed because the production Turnstile widget did not issue a token in automated browser validation. The page, config endpoint, and invalid-token denial path passed.
2. App Service staging /api/author/gate did not accept temporary synthetic preview access settings, so native staging session issuance remains unproven through that route. The slot was restored to Key Vault-backed settings and health recovered.

## Decision

NOT_CERTIFIED

jmerrill.pub is now operating on App Service and materially advanced, but it is not yet the canonical reference implementation until the positive /join proof and native staging Author Operating Center session-issuance proof pass without exception.
