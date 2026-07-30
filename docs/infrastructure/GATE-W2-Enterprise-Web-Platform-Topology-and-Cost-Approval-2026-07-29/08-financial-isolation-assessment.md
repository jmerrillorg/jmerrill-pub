# 08 Financial Isolation Assessment

Generated: 2026-07-30T00:28:45.618Z
Gate: GATE-W2 - Enterprise Web Platform Topology & Cost Approval
Mode: DISCOVERY_AND_DECISION_SUPPORT
Branch: codex/gate-w2-enterprise-web-topology-cost
Authority: Jackie; GATE-W1 certified reference; no implementation authorized.

Recommended ruling: **SHARED_PLAN_WITH_ISOLATED_APP** for initial migration.

Evidence-supported reasons:

- Current Financial site is Static Web Apps Standard public web presence, not a proven transaction portal.
- Financial scheduling/Dataverse dependencies exist or are expected, but no production payment execution, Business Central posting, or customer transaction path is authorized in this gate.
- App-level isolation can provide separate app registration/managed identity, settings, Key Vault references, deployment slot, release, monitoring, and rollback boundary inside a shared enterprise plan.
- Separate compute plan becomes justified when regulated portal, customer-facing transaction workflows, Business Central posting, payment execution, stronger RTO/RPO, or performance isolation evidence emerges.

Do not assume isolation solely because the property is Financial. The operational trigger is sensitive transaction and continuity workload, not brand label alone.
