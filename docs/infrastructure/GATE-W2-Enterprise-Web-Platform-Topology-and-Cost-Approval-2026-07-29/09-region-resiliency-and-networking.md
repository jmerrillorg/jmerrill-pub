# 09 Region Resiliency and Networking

Generated: 2026-07-30T00:28:45.618Z
Gate: GATE-W2 - Enterprise Web Platform Topology & Cost Approval
Mode: DISCOVERY_AND_DECISION_SUPPORT
Branch: codex/gate-w2-enterprise-web-topology-cost
Authority: Jackie; GATE-W1 certified reference; no implementation authorized.

Recommended primary region: Central US, matching the certified Publishing App Service reference.

- Single-region posture is recommended initially.
- Zone redundancy: deferred.
- Cross-region recovery: deferred pending BIA.
- Front Door/Traffic Manager: deferred until multi-region or centralized edge governance is approved.
- Shared Log Analytics is acceptable for enterprise monitoring with app-specific dimensions/alerts.
- Private endpoints: deferred unless future Financial/portal workloads introduce private ingress/egress requirements.
