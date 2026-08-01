# JM1-INFRA-007 Node.js 24 Runtime Standardization - Executive Summary

Generated: 2026-08-01
Branch: `codex/node-24-runtime-upgrade`
Base SHA: `582b4aa0be928d905bb89b1b3d357a094e1f75a5`

## Objective

Standardize active JM1 Publishing runtime authority on Node.js 24 while preserving historical Node.js 20 evidence as past-state truth.

## Implementation Summary

- Root application runtime boundary added: Node `>=24 <25`, npm `>=11`.
- Root `@types/node` moved from Node 20 to Node 24.
- `.nvmrc` added as the single local runtime pin.
- App Service GitHub workflow moved from `NODE_VERSION=20` to `NODE_VERSION=24`.
- Static Web Apps workflow now explicitly uses Node 22 instead of Node 20 or runner default because the SWA deploy action rejected Node 24 and listed only 18, 20, and 22 as supported.
- Publishing App Service Bicep moved to `NODE|24-lts` and `WEBSITE_NODE_DEFAULT_VERSION=~24`.
- Azure Function package compatibility boundaries updated for the diagnostic runner and ACS email relay.
- Function lockfiles regenerated under Node 24/npm 11.
- Forward-looking hosting and relay documentation updated.
- Publishing App Service staging was deployed and certified on Node 24; final PR-head deployment evidence is recorded in the PR return package.
- The two live Function Apps were tested on `Node|24`, returned platform 503 on protected probes, and were rolled back to `Node|22` with 401 fail-closed recovery confirmed.

## Current Completion Classification

NODE 24 STANDARDIZATION NOT COMPLETE

The root application, App Service CI, App Service infrastructure, and Publishing App Service staging are Node 24-certified. Static Web Apps preview remains on Node 22 due Microsoft SWA deploy support limits, and the active Azure Function host runtime cannot be promoted in this wave because the live Function Apps did not pass safe runtime smoke checks on `Node|24`; they were returned to the last known-good `Node|22` state. No production slot swap, DNS change, author communication, or business-record advancement is authorized by this package.

## Official Platform Basis

- Microsoft App Service documentation documents `WEBSITE_NODE_DEFAULT_VERSION="~24"` and `linux-fx-version "NODE|24-lts"` for Linux Node apps.
- Azure CLI readback on 2026-08-01 listed `NODE|24-lts` as an available Linux Web App runtime.
- Microsoft Azure Functions runtime documentation lists Node.js 24 as GA for Azure Functions v4.
- Azure CLI readback on 2026-08-01 listed `Node|24` as an available Linux Azure Functions runtime; JM1 production Function host smoke failed on that stack and recovered after rollback to `Node|22`.
- Static Web Apps PR deploy logs on 2026-08-01 rejected Node 24.13.0 with supported versions limited to 18, 20, and 22.
