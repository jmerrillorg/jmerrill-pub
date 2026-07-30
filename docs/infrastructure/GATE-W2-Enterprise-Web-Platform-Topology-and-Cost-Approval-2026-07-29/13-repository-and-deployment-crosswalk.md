# 13 Repository and Deployment Crosswalk

Generated: 2026-07-30T00:28:45.618Z
Gate: GATE-W2 - Enterprise Web Platform Topology & Cost Approval
Mode: DISCOVERY_AND_DECISION_SUPPORT
Branch: codex/gate-w2-enterprise-web-topology-cost
Authority: Jackie; GATE-W1 certified reference; no implementation authorized.

| Repo | Direction | Reason |
| --- | --- | --- |
| jmerrill-pub | Remain isolated | Certified reference; Publishing has distinct runtime/security/business workflow boundary |
| jmerrill-financial | Remain isolated until migration decision; app may deploy to shared enterprise plan | Financial release/security boundary remains important even if compute plan is shared |
| jm1-web-platform | Candidate shared monorepo for corporate/foundation/productions/personal/redirect sites | Shared components and lower release overhead; only after GATE-W3 approval |
| jm1-platform | Platform code/config only, not property content by default | Avoid coupling site releases to platform internals |
| jm1-ops | Operations/evidence/automation support | No public web deployment boundary |
| jm1-workstation | Endpoint/workstation config only | Outside web hosting topology |
