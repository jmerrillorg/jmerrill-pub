# Existing Platform Capability Check

- `EXISTING_STRIPE_CAPABILITY = SUFFICIENT`: live webhook signatures, invoices, PaymentIntents, Checkout, Connect, metadata, and provider idempotency already exist.
- `EXISTING_DATAVERSE_CAPABILITY = SUFFICIENT`: Opportunity operational fields and `jm1_executionlogs` represent state, audit, and durable bindings.
- `EXISTING_PUBLISHING_RUNTIME_CAPABILITY = EXTENDABLE`: classifier, consumer, recovery route, and managed-identity Dataverse access already exist.
- `CONFIGURATION_SUFFICIENT = YES`: production health reports Stripe enrollment, Dataverse managed identity, and relay dependencies ready; commissioning payment creation is intentionally disabled.
- `EXTENSION_SUFFICIENT = YES`: one pure correlation module and bounded handler changes close the defect.
- `DATAVERSE_SCHEMA_CHANGE_REQUIRED = NO`.
- `NEW_CUSTOM_SUBSYSTEM_REQUIRED = NO`.
