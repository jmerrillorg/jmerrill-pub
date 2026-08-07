# Test and Certification Plan

| Test area | Required proof | Pass condition | Hold condition |
| --- | --- | --- | --- |
| Commercial lifecycle | Internal validation inquiry moves through lead/opportunity/quote/agreement/payment projection/authorization states | Every state has owner, evidence, and next action | Any state has no authority or blank next action. |
| Dynamics role | D365 Lead, Opportunity, Product/Price/Quote/Order roles are mapped without becoming catalog authority | Mapping is one-way projection where required | D365 duplicates pricing/catalog authority. |
| Agreement reuse | Hybrid and JM Signature template selection remains governed | Correct version reference and artifact manifest | Template changed or wrong version selected. |
| Payment projection | Stripe event scenarios classify idempotently | success/failed/partial/refund/duplicate/stale/manual correction pass | Payment link/session alone authorizes fulfillment. |
| Fulfillment gate | Gate evaluates agreement + payment + package/track + intake evidence | Authorized only when all standard evidence exists | Any missing evidence authorizes work. |
| Daily surface | Eight required questions answer in one surface | Jackie does not need separate dashboard hunting | Surface creates a new monitoring burden. |
| Evidence | Every commercial state change has evidence reference | Readback matches source | Missing/ambiguous evidence. |
| Security | Roles prevent unauthorized approval, override, payment correction, and fulfillment authorization | Unauthorized actor fails closed | Any unauthorized actor can approve or override. |
| Burden reduction | Current 12 actions reduce to target 5 | Net removed 7; new burden 0 | Burden neutral/increase without Jackie approval. |
| Boundary | No production mutation occurs during planning | Dataverse/Dynamics/BC/Stripe/workflow/website/author communication mutation count remains 0 | Any unauthorized mutation. |
