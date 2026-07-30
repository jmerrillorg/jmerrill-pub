# 18 Recommended Ruling

Generated: 2026-07-30T00:28:45.618Z
Gate: GATE-W2 - Enterprise Web Platform Topology & Cost Approval
Mode: DISCOVERY_AND_DECISION_SUPPORT
Branch: codex/gate-w2-enterprise-web-topology-cost
Authority: Jackie; GATE-W1 certified reference; no implementation authorized.

RECOMMENDED: Option B - Balanced Isolation.

- Preferred topology: Publishing isolated plan + shared enterprise plan with isolated apps.
- Number of App Service Plans: 2 initial production plans.
- Apps assigned: Publishing on existing app-jm1-pub-prod/asp-jm1-pub-prod-linux; Financial, jmerrill.one, Foundation, Productions, jackiesmithjr, and redirect apps on future shared enterprise plan as separately authorized.
- Region: Central US.
- Initial SKU: S1 Linux for both plans; reassess P0v3/P1v3 after traffic evidence.
- Expected recurring cost: 158.7-183.7/month; 1904.4-2204.4/year.
- Financial isolation decision: SHARED_PLAN_WITH_ISOLATED_APP initially.
- Repository direction: keep Publishing isolated; keep Financial release boundary; evaluate shared jm1-web-platform for corporate/personal/redirect sites.
- Migration sequence: low-risk corporate/redirect proof, Foundation/.org disposition, Financial, personal site, Productions, then SWA retirement.
- Redirect strategy: centralize later through governed redirect mechanism.
- Retirement prerequisites: defined in file 12.
- Known limitations: current invoice unavailable due Cost Management 429; some app runtime/framework details require per-repo validation in GATE-W3.
- Exact next gate: GATE-W3 - first property/wave implementation authorization.

APPROVED: No. Only Jackie can approve.
IMPLEMENTED: No.
