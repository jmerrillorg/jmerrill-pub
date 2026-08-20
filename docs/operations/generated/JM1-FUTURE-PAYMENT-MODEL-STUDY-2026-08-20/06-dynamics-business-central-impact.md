# Dynamics and Business Central Impact

Date: 2026-08-20
Classification: STUDY / NO DATAVERSE OR BUSINESS CENTRAL MUTATION

## Principle

Dynamics should carry the commercial operating truth and Publishing projection. Stripe should carry payment processing truth. Business Central should receive accounting handoff only through approved posting logic. The future model should reuse existing structures wherever possible and must not create a duplicate commerce system.

## Required Separate Representations

| Element | Why it matters | Likely system role |
|---|---|---|
| Cash price | Author-facing package principal | Dynamics commercial record and agreement reference |
| Principal | Amount owed for package/services before fees, tax, or charges | Dynamics projection; Business Central accounting basis |
| Finance charge / plan charge | Future model charge, if adopted | Dynamics projection; Business Central revenue/liability treatment after accounting review |
| Transaction fee | Current 4 percent fee or separate processing-related charge | Stripe payment evidence; Dynamics projection; Business Central treatment by accounting policy |
| Tax | Separate from principal and fees/charges | Stripe/tax source and Business Central tax treatment |
| Amount paid | Determines payment state and release readiness | Stripe source, Dynamics projection |
| Balance remaining | Determines active plan and payoff | Dynamics projection from Stripe/payment evidence |
| Early payoff amount | Needed for author payoff quote | Dynamics calculated/projection field; Stripe execution path |
| Accrued/earned charge | Determines charge retained at payoff | Dynamics projection; Business Central accounting treatment |
| Unearned future charge | Determines charge waived/stopped at payoff | Dynamics projection; Stripe schedule cancellation logic |
| Paid-in-full state | Gates final delivery/release | Dynamics/Publishing operating state |
| Final-delivery release gate | Prevents premature release | Publishing operating projection |

## Dynamics Impact

Current model:

- can continue projecting selected plan, installment count, Stripe IDs, amount paid, balance, and payment arrangement state;
- does not require a future finance-charge model for existing contracts.

Future model:

- must distinguish cash price from finance/plan charge;
- must preserve agreement version and plan terms from execution date;
- must compute early payoff from remaining principal plus earned/accrued charge;
- must store enough evidence to show why a final delivery/release gate is open or closed;
- should expose a simple Jackie-facing state: active plan, current, overdue/exception, paid in full, release blocked, release cleared.

## Business Central Impact

Business Central treatment requires accounting review before implementation. The model may need distinct posting treatment for:

- package/service principal;
- transaction fees;
- finance or plan charges;
- taxes;
- failed payment reversals;
- refunds;
- early payoff;
- waived unearned charge.

No Business Central posting is authorized by this study.

## Reuse Boundary

Reuse existing commercial catalog, Dynamics opportunity/order/payment projections, Stripe identifiers, fulfillment authorization, and execution evidence patterns. Do not create a parallel payment ledger unless an accounting review proves Business Central cannot support the needed posting and reporting.

## Explicit No-Mutation Statement

Dataverse writes: 0

Business Central writes: 0
