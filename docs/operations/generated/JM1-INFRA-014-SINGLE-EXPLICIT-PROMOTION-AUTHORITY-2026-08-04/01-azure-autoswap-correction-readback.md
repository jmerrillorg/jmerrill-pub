# JM1-INFRA-014 Single Explicit Promotion Authority Readback

Date: 2026-08-04

## Classification

Root cause: AZURE_AUTO_SWAP_CONFLICTS_WITH_EXPLICIT_GOVERNED_PROMOTION

Permanent correction: SINGLE_EXPLICIT_PRODUCTION_PROMOTION_AUTHORITY

## Before Correction

Production release: 37f626545597d6d3b46da34d97f9beab0a4d8ff8

Production health: READY

Staging release: 37f626545597d6d3b46da34d97f9beab0a4d8ff8

Staging health: READY

Staging auto-swap target: production

Production auto-swap target: null

Finding: staging deployment could trigger Azure auto-swap to production while the governed workflow also requested an explicit production slot swap.

## Protected Mutation

Command class: Azure App Service slot configuration

Mutation: Disabled staging auto-swap on app-jm1-pub-prod/staging.

Secret values retained: 0

## After Correction

Staging auto-swap target: null

Production auto-swap target: null

Production release: 37f626545597d6d3b46da34d97f9beab0a4d8ff8

Production health: READY

Staging release: 37f626545597d6d3b46da34d97f9beab0a4d8ff8

Staging health: READY

## Guard Added

The App Service deployment workflow now runs `Preflight Single Promotion Authority` after Azure login and before staging deployment. If staging `autoSwapSlotName` is non-empty while the workflow includes explicit `az webapp deployment slot swap --target-slot production`, deployment fails with:

AZURE_AUTO_SWAP_CONFLICTS_WITH_EXPLICIT_GOVERNED_PROMOTION
