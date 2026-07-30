# 10 Production Staging and Rollback Standard

Generated: 2026-07-30T00:28:45.618Z
Gate: GATE-W2 - Enterprise Web Platform Topology & Cost Approval
Mode: DISCOVERY_AND_DECISION_SUPPORT
Branch: codex/gate-w2-enterprise-web-topology-cost
Authority: Jackie; GATE-W1 certified reference; no implementation authorized.

Enterprise standard from Publishing reference:

- Production app per property/workload.
- Staging slot for Publishing, Financial, and any site with forms/auth/API.
- Lightweight preview acceptable for static redirect-only or low-risk content sites until migration.
- Immutable artifact deployment with release SHA.
- Health endpoint or equivalent synthetic proof.
- Environment-specific secrets; no production secrets in browser-exposed config.
- Slot swap only after staging certification and Jackie release approval.
- Rollback by redeploying prior immutable artifact or reversing slot swap.
- Evidence package required before SWA retirement.
