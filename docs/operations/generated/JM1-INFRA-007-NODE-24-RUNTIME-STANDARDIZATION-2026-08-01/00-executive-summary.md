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
- Static Web Apps workflow now explicitly uses Node 24 instead of runner default.
- Publishing App Service Bicep moved to `NODE|24-lts` and `WEBSITE_NODE_DEFAULT_VERSION=~24`.
- Azure Function package runtime boundaries added for the diagnostic runner and ACS email relay.
- Function lockfiles regenerated under Node 24/npm 11.
- Forward-looking hosting and relay documentation updated.

## Current Completion Classification

NODE 24 STANDARDIZATION READY FOR STAGING CERTIFICATION

Production promotion remains gated by PR review and post-staging approval. No production slot swap, DNS change, author communication, or business-record advancement is authorized by this package.

## Official Platform Basis

- Microsoft App Service documentation documents `WEBSITE_NODE_DEFAULT_VERSION="~24"` and `linux-fx-version "NODE|24-lts"` for Linux Node apps.
- Azure CLI readback on 2026-08-01 listed `NODE|24-lts` as an available Linux Web App runtime.
- Microsoft Azure Functions runtime documentation lists Node.js 24 as GA for Azure Functions v4.

