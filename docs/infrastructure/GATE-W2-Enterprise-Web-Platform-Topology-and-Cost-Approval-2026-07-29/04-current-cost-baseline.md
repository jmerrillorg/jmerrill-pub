# 04 Current Cost Baseline

Generated: 2026-07-30T00:28:45.618Z
Gate: GATE-W2 - Enterprise Web Platform Topology & Cost Approval
Mode: DISCOVERY_AND_DECISION_SUPPORT
Branch: codex/gate-w2-enterprise-web-topology-cost
Authority: Jackie; GATE-W1 certified reference; no implementation authorized.

Azure Cost Management direct query returned 429 Too Many Requests; local az costmanagement command was unavailable. This baseline is a calculated estimate from observed SKUs and Azure Retail Prices, not an invoice.

- Publishing App Service S1 Linux Central US: 0.095/hour * 730 hours = 69.35/month.
- Static Web Apps Standard observed for jmerrill.one and jmerrill.financial: 9/app/month each, per Azure Static Web Apps pricing page.
- Static Web Apps Free observed for Foundation, .org redirect, Productions, jackiesmithjr, and book redirect: calculated 0 base hosting.
- Monitoring, Key Vault operations, storage, and bandwidth: forecast overhead range 20-45/month pending Cost Management export.

Calculated current total: 107.35-132.35/month, 1288.20-1588.20/year.
