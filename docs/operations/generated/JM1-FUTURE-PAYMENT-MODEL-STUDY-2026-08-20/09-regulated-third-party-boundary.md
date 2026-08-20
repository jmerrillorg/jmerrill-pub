# Regulated Third-Party Boundary

Date: 2026-08-20
Classification: STUDY / CONTROL BOUNDARY

## Principle

JM1 may study payment models for fees it owns and controls. JM1 must not impose Publishing-style payment rules on regulated third-party products, carrier-controlled schedules, or arrangements governed by another entity's rules.

## Boundary Categories

| Category | Boundary |
|---|---|
| Publishing package fees | JM1-owned Publishing fees may be governed by Publishing agreements, subject to counsel/accounting review |
| JMF-owned service fees | Potentially eligible for separate JMF study |
| Insurance premiums | Not automatically eligible; governed by carrier/regulatory rules |
| Pre-need carrier payments | Not automatically eligible; carrier and regulatory authority may control |
| FDLIC arrangements | Not automatically eligible; requires separate authority review |
| Precoa arrangements | Not automatically eligible; requires separate authority review |
| Carrier-controlled payment schedules | Not eligible for Publishing-style alteration unless carrier authority permits |
| Third-party regulated products | Not eligible for internal JM1 payment redesign without legal authority |

## Implementation Rule

Any future implementation should require a source-of-authority check before applying payment-plan logic:

1. Is this a JM1-owned fee?
2. Which division owns it?
3. Does JM1 control price and payment schedule?
4. Does another regulated entity control billing, cancellation, payoff, or disclosure?
5. Has counsel/accounting approved the model for this category?

If the answer is unclear, fail closed.
