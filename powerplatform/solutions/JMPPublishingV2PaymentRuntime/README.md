# JMP Publishing V2 Payment Runtime

This portable managed solution extends the existing canonical Publishing V2 financial tables. It does not create a parallel financial model.

- Agreement and balance projection: `jmpv2_agreementrecord`
- Installment obligations: `jmpv2_paymentrequirement`
- Immutable payment, collection-attempt, refund, and reconciliation evidence: `jmpv2_paymentevidence`
- Concurrency: native Dataverse row version with `If-Match` inside an atomic Web API changeset
- Runtime role: `JMP Publishing Payment Runtime`, without delete, assign, share, schema-administration, or security-administration privileges
- Mutation gate: `jmpv2_PaymentRuntimeEnabled`, managed default `false`
- Timer mode: `jmpv2_PaymentTimerMode`, managed default `DISABLED`

JM1-Test is the authoring and recertification environment because it contains the managed `JMP_PublishingV2` dependency. Registration requires an explicit organization-ID guard. The managed package is the only artifact eligible for production import.

Production import and dry-run commissioning do not seed agreement, obligation, payment, refund, or collection-attempt rows. Enabling collections remains a separate founder-authorized gate.
