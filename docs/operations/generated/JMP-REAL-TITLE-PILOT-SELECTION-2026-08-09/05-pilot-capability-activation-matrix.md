# Pilot Capability Activation Matrix

| Capability | Pilot state | Pilot use | External live action authorized | Kill switch |
|---|---|---|---|---|
| Commercial lead routing | CONTROLLED_LIVE | PREPARE_OR_SHADOW_ONLY | NO | disable-commercial-routing |
| Opportunity qualification | CONTROLLED_LIVE | PREPARE_OR_SHADOW_ONLY | NO | disable-opportunity-qualification |
| Quote and package projection | CONTROLLED_LIVE | PREPARE_OR_SHADOW_ONLY | NO | disable-quote-projection |
| Agreement selection | CONTROLLED_LIVE | PREPARE_OR_SHADOW_ONLY | NO | disable-agreement-generation |
| Exception queue | CONTROLLED_LIVE | PREPARE_OR_SHADOW_ONLY | NO | disable-exception-router |
| Stripe payment projection | CONTROLLED_LIVE | PREPARE_OR_SHADOW_ONLY | NO | disable-stripe-projection |
| Business Central invoice projection | SHADOW_MODE | FROZEN_OR_NOT_USED | NO | disable-bc-invoice-path |
| Fulfillment authorization | CONTROLLED_LIVE | PREPARE_OR_SHADOW_ONLY | NO | disable-fulfillment-authorization |
| Royalty calculation preparation | INTERNAL_ONLY | FROZEN_OR_NOT_USED | NO | disable-royalty-prep |
| Royalty payment approval | FROZEN | FROZEN_OR_NOT_USED | NO | disable-royalty-payment |
| Title initialization | SHADOW_MODE | PREPARE_OR_SHADOW_ONLY | NO | disable-title-runtime |
| Edition creation | SHADOW_MODE | PREPARE_OR_SHADOW_ONLY | NO | disable-edition-creation |
| FTL gate evaluation | SHADOW_MODE | PREPARE_OR_SHADOW_ONLY | NO | disable-ftl-evaluation |
| Distribution submission | FROZEN | FROZEN_OR_NOT_USED | NO | disable-distribution-submission |
| Distribution readback | CONTROLLED_LIVE | PREPARE_OR_SHADOW_ONLY | NO | disable-distribution-readback |
| Author decision package preparation | ASSISTED | PREPARE_OR_SHADOW_ONLY | NO | disable-author-decision-prep |
| Author communication preparation | ASSISTED | PREPARE_OR_SHADOW_ONLY | NO | disable-author-comm-prep |
| Author communication send | FROZEN | FROZEN_OR_NOT_USED | NO | disable-author-send |
| Author status projection | CONTROLLED_LIVE | PREPARE_OR_SHADOW_ONLY | NO | disable-author-status-projection |
| Marketing opportunity creation | INTERNAL_ONLY | PREPARE_OR_SHADOW_ONLY | NO | disable-marketing-opportunity |
| Marketing content preparation | ASSISTED | PREPARE_OR_SHADOW_ONLY | NO | disable-marketing-prep |
| Marketing journey activation | FROZEN | FROZEN_OR_NOT_USED | NO | disable-marketing-journey |
| Royalty statement preparation | INTERNAL_ONLY | FROZEN_OR_NOT_USED | NO | disable-statement-prep |
| Author-copy entitlement tracking | INTERNAL_ONLY | FROZEN_OR_NOT_USED | NO | disable-copy-entitlement |
| Author-copy order preparation | ASSISTED | FROZEN_OR_NOT_USED | NO | disable-copy-order |
| Annual distribution fee evaluation | INTERNAL_ONLY | FROZEN_OR_NOT_USED | NO | disable-annual-fee |
| Correction authorization | FROZEN | FROZEN_OR_NOT_USED | NO | disable-correction-authorization |
| Retirement review | FROZEN | FROZEN_OR_NOT_USED | NO | disable-retirement |
| Rights reversion review | FROZEN | FROZEN_OR_NOT_USED | NO | disable-reversion |
| Execution logging | CONTROLLED_LIVE | PREPARE_OR_SHADOW_ONLY | NO | disable-execution-log |
| Internal reporting | CONTROLLED_LIVE | PREPARE_OR_SHADOW_ONLY | NO | disable-reporting |
| Observability and alerts | CONTROLLED_LIVE | PREPARE_OR_SHADOW_ONLY | NO | disable-observability |
