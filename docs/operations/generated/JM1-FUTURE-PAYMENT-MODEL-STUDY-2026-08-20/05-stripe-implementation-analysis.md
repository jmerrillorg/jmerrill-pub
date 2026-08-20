# Stripe Implementation Analysis

Date: 2026-08-20
Classification: STUDY / NO STRIPE MUTATION

## Scope

This analysis compares Stripe implementation paths for the current Publishing model and possible future payment models. No Stripe object was created, updated, cancelled, resent, or otherwise mutated for this study.

## Stripe Pattern Comparison

| Stripe pattern | Fixed number of payments | Varying final installment | Early payoff | Stop future charges | Principal/charge separation | Dynamics reconciliation | Notes |
|---|---|---|---|---|---|---|---|
| Finite Subscription Schedules | Strong | Strong when phases/items are generated precisely | Moderate; requires cancel/release logic | Strong if remaining schedule is cancelled correctly | Moderate; requires metadata/line separation | Strong if schedule/subscription/invoice IDs are stored | Best current fit for governed fixed multi-pay plans |
| Invoices | Strong for manual/custom schedule | Strong | Strong, if future invoices are not issued or are voided correctly | Strong, with governed invoice lifecycle | Strong with line items | Strong, but more operational orchestration | Good for custom installment schedules with heavier back-office control |
| Subscriptions without schedule | Moderate | Weaker | Moderate | Moderate | Moderate | Moderate | Better for ongoing services than finite publishing packages |
| Payment Links | Weak for governed installments | Weak | Weak | Weak | Weak to moderate | Weak unless wrapped with custom tracking | Useful for simple one-time or predefined checkout, not best as authoritative plan engine |
| Checkout | Moderate for initial session | Weak as complete plan record | Weak without surrounding workflow | Weak without surrounding workflow | Moderate at session/invoice level | Moderate | Useful front door, not sufficient alone for governed plan lifecycle |
| Custom installment schedule | Strong | Strong | Strong | Strong | Strong | Strong | Highest build/maintenance burden; should be avoided unless Stripe-native options cannot meet requirements |

## Current Model Best Fit

Finite Subscription Schedules remain the best fit for the current approved fixed-payment Publishing model because they support:

- fixed payment count;
- scheduled collection attempts;
- preserved Stripe schedule/subscription/invoice IDs;
- idempotent reconciliation;
- variable final installment when cents do not divide evenly;
- cancellation of future scheduled charges if governed payoff or exception handling requires it.

## Future Model Requirements

A future finance/plan-charge model would need Stripe support for:

- cash price line;
- principal allocation;
- finance/plan charge line;
- transaction fee if separately retained;
- tax line where applicable;
- payment count and due dates;
- current amount paid;
- remaining principal;
- earned/accrued charge;
- unearned future charge;
- early payoff amount;
- cancellation or closure of future scheduled charges after payoff;
- immutable version preservation for executed agreements.

## Recommended Stripe Architecture

Near term:

- Continue using the existing governed Stripe path for existing contracts.
- Do not alter active payment schedules retroactively.

Future contracts:

- Prefer finite Subscription Schedules for fixed installment billing, plus a governed payoff/cancellation routine.
- Use metadata or internal projection fields to keep cash price, principal, charge, tax, and agreement version reconcilable.
- Avoid making Payment Links or Checkout the system of record for installment obligations.

## Explicit No-Mutation Statement

Stripe writes: 0

This study did not inspect or change live author payment schedules.
