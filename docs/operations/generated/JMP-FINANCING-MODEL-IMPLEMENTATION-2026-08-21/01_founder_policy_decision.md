# Founder Policy Decision

Last verified: 2026-08-21T18:49:27Z

## Decision

Jackie founder override authorizes implementation of the new JMP financing and early-payoff model for Quanishia Dockery / *Indomitable*.

Jackie founder approval explicitly approves the economics for `JMP_FINANCING_EARLY_PAYOFF_v1.0` on 2026-08-21:

- annual simple plan charge: 6%;
- prorated by actual financed term;
- no compounding;
- no early-payoff penalty;
- unearned future plan charges are waived/not due after early payoff.

## Superseded Finding

The earlier commissioning readback `NEW_FINANCING_MODEL_STILL_STUDY_ONLY` is superseded for new-contract commissioning by this founder override and the implementation recorded in this package.

## Required Boundary

- Do not send Quanishia the old 4% offer.
- Do not mutate Atta Darko's existing contract, payment terms, Stripe state, or agreement records.
- Preserve Atta under `JMP_MULTIPAY_TRANSACTION_FEE_4_PERCENT_v1.0`.
- Preserve the relationship pricing layer before payment-policy application.

## Evidence Source

- Founder override attachment: `c7d12ad6-47ba-4552-9eff-4b8f6ff6243d/pasted-text.txt`
- Founder approval attachment: `bbeb41a6-3a45-4c7b-90cb-a92e4664200c/pasted-text.txt`
- PR #524 future payment study evidence, fetched to `origin/pr/524`
