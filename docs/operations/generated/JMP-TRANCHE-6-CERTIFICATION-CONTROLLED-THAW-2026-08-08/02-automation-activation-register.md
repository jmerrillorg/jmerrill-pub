# Automation Activation Register

Last verified: 2026-08-09T02:12:12.985Z

| Capability | Parent | Current | Target | Risk | Approval | Kill switch | Certification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Commercial lead routing | Commercial Operations | CONTROLLED_LIVE | CONTROLLED_LIVE | TIER_1 | NO | disable-commercial-routing | PASS |
| Opportunity qualification | Commercial Operations | CONTROLLED_LIVE | CONTROLLED_LIVE | TIER_1 | NO | disable-opportunity-qualification | PASS |
| Quote and package projection | Commercial Operations | CONTROLLED_LIVE | CONTROLLED_LIVE | TIER_2 | YES | disable-quote-projection | PASS |
| Agreement selection | Commercial Operations | CONTROLLED_LIVE | CONTROLLED_LIVE | TIER_2 | NO | disable-agreement-generation | PASS |
| Exception queue | Commercial Operations | CONTROLLED_LIVE | CONTROLLED_LIVE | TIER_1 | NO | disable-exception-router | PASS |
| Stripe payment projection | Financial Operations | CONTROLLED_LIVE | CONTROLLED_LIVE | TIER_3 | YES | disable-stripe-projection | PASS |
| Business Central invoice projection | Financial Operations | SHADOW_MODE | ASSISTED | TIER_3 | YES | disable-bc-invoice-path | PASS |
| Fulfillment authorization | Financial Operations | CONTROLLED_LIVE | CONTROLLED_LIVE | TIER_3 | YES | disable-fulfillment-authorization | PASS |
| Royalty calculation preparation | Financial Operations | INTERNAL_ONLY | INTERNAL_ONLY | TIER_1 | NO | disable-royalty-prep | PASS |
| Royalty payment approval | Financial Operations | FROZEN | FROZEN | TIER_3 | YES | disable-royalty-payment | PASS |
| Title initialization | Title/PF Runtime | SHADOW_MODE | SHADOW_MODE | TIER_1 | NO | disable-title-runtime | PASS |
| Edition creation | Title/PF Runtime | SHADOW_MODE | SHADOW_MODE | TIER_1 | NO | disable-edition-creation | PASS |
| FTL gate evaluation | Title/PF Runtime | INTERNAL_ONLY | SHADOW_MODE | TIER_2 | YES | disable-ftl-evaluation | PASS |
| Distribution submission | Title/PF Runtime | FROZEN | ASSISTED | TIER_3 | YES | disable-distribution-submission | PASS |
| Distribution readback | Title/PF Runtime | INTERNAL_ONLY | CONTROLLED_LIVE | TIER_1 | NO | disable-distribution-readback | PASS |
| Author decision package preparation | Author Experience | ASSISTED | ASSISTED | TIER_3 | YES | disable-author-decision-prep | PASS |
| Author communication preparation | Author Experience | ASSISTED | ASSISTED | TIER_3 | YES | disable-author-comm-prep | PASS |
| Author communication send | Author Experience | FROZEN | ASSISTED | TIER_3 | YES | disable-author-send | PASS |
| Author status projection | Author Experience | INTERNAL_ONLY | CONTROLLED_LIVE | TIER_1 | NO | disable-author-status-projection | PASS |
| Marketing opportunity creation | Strategic Marketing | INTERNAL_ONLY | INTERNAL_ONLY | TIER_1 | NO | disable-marketing-opportunity | PASS |
| Marketing content preparation | Strategic Marketing | ASSISTED | ASSISTED | TIER_2 | YES | disable-marketing-prep | PASS |
| Marketing journey activation | Strategic Marketing | FROZEN | ASSISTED | TIER_3 | YES | disable-marketing-journey | PASS |
| Royalty statement preparation | Post-Publication Operations | INTERNAL_ONLY | INTERNAL_ONLY | TIER_1 | NO | disable-statement-prep | PASS |
| Author-copy entitlement tracking | Post-Publication Operations | INTERNAL_ONLY | CONTROLLED_LIVE | TIER_1 | NO | disable-copy-entitlement | PASS |
| Author-copy order preparation | Post-Publication Operations | ASSISTED | ASSISTED | TIER_3 | YES | disable-copy-order | PASS |
| Annual distribution fee evaluation | Post-Publication Operations | INTERNAL_ONLY | ASSISTED | TIER_3 | YES | disable-annual-fee | PASS |
| Correction authorization | Post-Publication Operations | FROZEN | FROZEN | TIER_4 | YES | disable-correction-authorization | PASS |
| Retirement review | Post-Publication Operations | FROZEN | FROZEN | TIER_4 | YES | disable-retirement | PASS |
| Rights reversion review | Post-Publication Operations | FROZEN | FROZEN | TIER_4 | YES | disable-reversion | PASS |
| Execution logging | Enterprise Support | INTERNAL_ONLY | CONTROLLED_LIVE | TIER_0 | NO | disable-execution-log | PASS |
| Internal reporting | Enterprise Support | INTERNAL_ONLY | CONTROLLED_LIVE | TIER_0 | NO | disable-reporting | PASS |
| Observability and alerts | Enterprise Support | INTERNAL_ONLY | CONTROLLED_LIVE | TIER_1 | NO | disable-observability | PASS |
