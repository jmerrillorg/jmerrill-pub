# Commercial States and Native Sales Boundary

Last verified: 2026-08-08T12:35:23.583Z

## Native Dynamics Objects

- `lead`
- `contact`
- `account`
- `opportunity`
- `product`
- `pricelevel`
- `productpricelevel`
- `quote`
- `quotedetail`
- `salesorder`
- `salesorderdetail`
- `task`

## Commercial States

- `INQUIRY_RECEIVED`
- `LEAD_QUALIFIED`
- `OPPORTUNITY_OPEN`
- `PACKAGE_SELECTED`
- `QUOTE_READY`
- `QUOTE_APPROVED`
- `AGREEMENT_GENERATED`
- `AGREEMENT_READY_FOR_SIGNATURE`
- `AGREEMENT_EXECUTED`
- `PAYMENT_PENDING`
- `PAYMENT_CONFIRMED`
- `FULFILLMENT_AUTHORIZED`
- `EXCEPTION_REVIEW_REQUIRED`
- `ON_HOLD`

## Result

Inquiry -> Lead and Lead -> Opportunity are verified through the Tranche 1 validation harness using the native `lead` and `opportunity` object names. No custom lead, opportunity, quote, order, product, or task substitute is introduced.
