# Canonical Correlation Contract

## Authority order

1. Accept only a signature-verified, terminal successful Stripe event.
2. Extract only allow-listed governed GUID metadata.
3. Resolve the direct `jm1_opportunity_id`, or resolve exactly one Opportunity through an existing SHA-256-derived provider-object binding.
4. If direct and durable authorities conflict, deny the event.
5. Re-read the authoritative Opportunity and validate the selected payment amount.
6. Persist missing hashed provider-object bindings in existing execution logs.
7. Apply the semantic `INITIAL` payment obligation once per Opportunity.
8. Independently re-read agreement authority and calculate only the currently governed next gate.

## Prohibited identity inputs

Customer name, email, amount, description text, title text, and temporal proximity cannot establish identity. Stripe customer ID is retained for audit/notification but is not sufficient to choose a Publishing title.

## Durable replay

Provider identifiers are hashed into deterministic execution-log names. The log source record is the governed Opportunity. This makes a confirmed manual correction reusable without retaining the raw provider identifier in audit descriptions. Commercial idempotency uses `INITIAL-PAYMENT-CONFIRMED-{opportunityId}-INITIAL`, so invoice, PaymentIntent, charge, retry, and reordered events converge on the same business effect.

## Failure behavior

Invalid metadata, no candidate, multiple candidates, or direct/durable conflict produces zero lifecycle effect and a safe `PUBLISHING_PAYMENT_CORRELATION_BLOCKED` audit record. No candidate is guessed.
