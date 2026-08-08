# Internal Validation - 20 Scenarios

Last verified: 2026-08-08T12:35:23.583Z

Result: 20 / 20 PASS

| Scenario | Name | Result |
| --- | --- | --- |
| T1-01 | Hybrid inquiry creates native Lead and Opportunity | PASS |
| T1-02 | Traditional inquiry selects JM Signature agreement | PASS |
| T1-03 | Hybrid inquiry selects JMP agreement v1.3.1 | PASS |
| T1-04 | Canonical catalog projects one Product per SKU | PASS |
| T1-05 | Canonical catalog projects package and price-list rows | PASS |
| T1-06 | Starter quote and order path uses D365 Quote and Order | PASS |
| T1-07 | Professional quote amount follows canonical package price | PASS |
| T1-08 | Premier quote amount follows canonical package price | PASS |
| T1-09 | Quote requiring approval holds Order path fail-closed | PASS |
| T1-10 | Stripe session-created projects without money movement | PASS |
| T1-11 | Stripe partial payment remains not authorized | PASS |
| T1-12 | Stripe paid authorizes only after executed agreement and ready order | PASS |
| T1-13 | Missing executed agreement fails closed | PASS |
| T1-14 | Open exception routes to exception review | PASS |
| T1-15 | Governed hold routes to hold queue | PASS |
| T1-16 | Traditional track may bypass payment only when payment is not required | PASS |
| T1-17 | Single operator surface hides internal IDs | PASS |
| T1-18 | Exception queue creates task records for non-authorized items | PASS |
| T1-19 | Commercial event vocabulary includes fulfillment authorization | PASS |
| T1-20 | Native Dynamics object boundary contains no custom substitutes | PASS |

Live authors used: 0

Live titles used: 0

PR #431 titles used: 0
