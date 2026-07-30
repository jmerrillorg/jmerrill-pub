# 16 Risk Register

Generated: 2026-07-30T00:28:45.618Z
Gate: GATE-W2 - Enterprise Web Platform Topology & Cost Approval
Mode: DISCOVERY_AND_DECISION_SUPPORT
Branch: codex/gate-w2-enterprise-web-topology-cost
Authority: Jackie; GATE-W1 certified reference; no implementation authorized.

| Risk | Impact | Mitigation | Blocking |
| --- | --- | --- | --- |
| Cost Management observed invoice unavailable | Estimates are calculated not invoices | Export Azure Cost Management after 429 clears | No |
| Financial future portal may need isolated compute | Shared plan could become insufficient | Define split trigger and migration path | No |
| Repository consolidation could create release coupling | Rollback/release independence reduced | Keep Publishing and Financial repo boundaries unless later approved | No |
| Redirect sprawl | Many SWA/repo resources for simple redirects | Centralized redirect mechanism in later gate | No |
| Static Web Apps retirement premature | Traffic or cert rollback issue | Per-property retirement checklist | No |
