# 11 Domain and Redirect Strategy

Generated: 2026-07-30T00:28:45.618Z
Gate: GATE-W2 - Enterprise Web Platform Topology & Cost Approval
Mode: DISCOVERY_AND_DECISION_SUPPORT
Branch: codex/gate-w2-enterprise-web-topology-cost
Authority: Jackie; GATE-W1 certified reference; no implementation authorized.

Primary domains: jmerrill.pub, jmerrill.one, jmerrill.financial, jmerrill.org, jmerrill.foundation, jmerrill.productions, jackiesmithjr.com.

Recommended redirect strategy: centralize redirect-only behavior into a governed redirect mechanism during GATE-W3/W4. Prefer App Service config for apps already on App Service, or Front Door/Cloudflare rules only if enterprise edge governance is approved.

Do not keep one repository and one SWA per redirect indefinitely unless the redirect has independent release/security requirements.

No DNS changes were made.
