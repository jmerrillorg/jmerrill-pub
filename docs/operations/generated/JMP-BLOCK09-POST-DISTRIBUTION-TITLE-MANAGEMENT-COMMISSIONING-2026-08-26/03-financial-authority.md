# Financial Authority

Last Verified: 2026-08-26

## Authority Model

- Dataverse: Publishing operational and lifecycle data plane
- Dynamics 365 Sales Enterprise: customer, opportunity, and commercial relationship authority where applicable
- Royalty Engine: royalty calculation authority
- Royalty Ledger: royalty liability and adjustment authority
- Stripe Connect: author/payee onboarding and delivery rail readiness where governed
- Payment execution: separately authorized future runtime
- Business Central: accounting, cash, and financial posting authority

## One Calculation Authority

DISTRIBUTOR SOURCE DATA -> NORMALIZED SALES LEDGER -> ROYALTY ENGINE -> ROYALTY LEDGER -> AUTHOR STATEMENT -> ROYALTY PAYABLE -> PAYMENT EXECUTION.

Statements and payment workflows consume governed facts. They do not independently recalculate royalties.

## Boundary

Dataverse is not a general ledger. Stripe is not royalty calculation authority. Business Central does not independently recalculate Publishing royalties.
