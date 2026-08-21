# Payment Policy Engine

Last verified: 2026-08-21T00:00:00Z

## Runtime Source

`azure-functions/diagnostic-ai-runner/src/author/paymentPolicyEngine.js`

## Exports

- `LEGACY_PAYMENT_POLICY_VERSION`
- `NEW_FINANCING_POLICY_VERSION`
- `DEFAULT_PAYMENT_POLICY_VERSION`
- `buildPaymentPlans`
- `calculateEarlyPayoff`
- `resolvePaymentPolicyVersion`

## Integration Points

- `src/author/authorOfferEngine.js`
- `src/author/packageAcceptancePaymentOptions.js`
- `src/author/packageAcceptanceCommunicationBuilder.js`
- `src/agreement/agreementFieldComputer.js`
- `src/payment/agreementPaymentLinkMapping.js`

## Guardrail

Default behavior remains legacy unless a caller provides `JMP_FINANCING_EARLY_PAYOFF_v1.0`. This protects grandfathered records and prevents accidental migration.

