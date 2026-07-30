# topology option b balanced isolation

Generated: 2026-07-30T00:28:45.618Z
Gate: GATE-W2 - Enterprise Web Platform Topology & Cost Approval
Mode: DISCOVERY_AND_DECISION_SUPPORT
Branch: codex/gate-w2-enterprise-web-topology-cost
Authority: Jackie; GATE-W1 certified reference; no implementation authorized.

- App Service Plans: 2
- Monthly recurring forecast: 158.7-183.7
- Annual recurring forecast: 1904.4-2204.4
- Posture: Publishing S1 isolated; shared enterprise S1 plan with isolated apps/slots for Financial and corporate.
- One-time migration effort: 6-9 engineering days
- Primary risk/cost driver: Best cost/risk balance; Financial compute shared until trigger.
- Scaling trigger: CPU > 60 percent sustained 30 minutes, memory > 70 percent sustained, p95 latency > 1.5s, or campaign/event traffic exceeding baseline by 3x.

Status: RECOMMENDED=YES; APPROVED=NO; IMPLEMENTED=NO.
