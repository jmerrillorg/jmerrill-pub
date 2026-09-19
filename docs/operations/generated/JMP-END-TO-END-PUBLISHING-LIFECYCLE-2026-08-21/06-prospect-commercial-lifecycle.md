# 06 - Prospect / Commercial Lifecycle

## Current Sources

| Source | Evidence |
|---|---|
| Intake table | `jm1_publishingintakes` |
| Publishing Sales solution | review status, contract status, stage-at-submission option sets |
| Opportunity/BPF | `jm1pub_reviewstatus`, `jm1pub_contractstatus` |
| Commercial catalog | `jm1pub_commercialcatalogitem`, Slice 2 service |
| Payment event work | PR #553 active |

## Current State

Prospect intake and Editorial Review recovery are materially improved. The live intake readback includes Quanisha/Indomitable, Atta, The General's Will, Before You Were Born, The Intentional Leader, The Long Watch, and Establishing Glory records. Some records are synthetic or duplicate validation records and must remain labeled.

## Gap

Package acceptance, agreement execution, and initial payment do not yet project one canonical relationship event named `JOINED_THE_FAMILY`.

## Proposed Resolution

Wave D should define event-derived commercial states:

- `PACKAGE_ACCEPTED`
- `AGREEMENT_SENT`
- `AGREEMENT_EXECUTED`
- `INITIAL_PAYMENT_RECEIVED`
- `JOINED_THE_FAMILY`
- `PAYMENT_PLAN_ACTIVE`
- `FINAL_DELIVERY_PAYMENT_HOLD`

Stripe remains payment authority. Dataverse/JMP remains workflow authority.
