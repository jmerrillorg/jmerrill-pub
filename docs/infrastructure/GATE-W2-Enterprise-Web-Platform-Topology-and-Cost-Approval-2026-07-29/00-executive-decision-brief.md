# 00 Executive Decision Brief

Generated: 2026-07-30T00:28:45.618Z
Gate: GATE-W2 - Enterprise Web Platform Topology & Cost Approval
Mode: DISCOVERY_AND_DECISION_SUPPORT
Branch: codex/gate-w2-enterprise-web-topology-cost
Authority: Jackie; GATE-W1 certified reference; no implementation authorized.

## Direct Recommendation

RECOMMENDED, not approved or implemented: **Option B - Balanced Isolation**.

- App Service Plan count: 2 initial production plans.
- Plans: keep Publishing isolated on existing asp-jm1-pub-prod-linux S1 in Central US; add one shared enterprise S1 Linux plan for Financial and corporate/personal sites when GATE-W3 authorizes implementation.
- Financial ruling recommendation: **SHARED_PLAN_WITH_ISOLATED_APP** now, with explicit trigger to move to **ISOLATED_PLAN** when customer transaction, regulated portal, Business Central posting, payment execution, or higher continuity requirements become active.
- Expected recurring cost: 158.7-183.7/month, 1904.4-2204.4/year, forecast not invoice.
- Next gate: GATE-W3 property/wave implementation authorization.

## Why

Option B preserves the certified Publishing reference boundary while avoiding three always-on plans before traffic, scheduling, and transaction evidence justify them. It gives Financial separate app identity, app settings, deployment slot, monitoring, Key Vault references, and release boundary without prematurely paying for isolated compute.

## Explicit Boundary

No migration, DNS change, resource creation, Static Web Apps retirement, repository consolidation, production deployment, or GATE-W3 implementation occurred.
