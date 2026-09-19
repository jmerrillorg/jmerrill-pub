# JMP-PAY-INGEST-001 Executive Summary

The Publishing Stripe webhook already verified Stripe signatures and recognized successful payment events, but it discarded governed metadata before correlation. The consumer then searched free-text execution logs and selected the first matching Opportunity. That behavior was nondeterministic when more than one candidate existed and could not preserve a manual correction because Stripe identifiers are intentionally redacted from audit descriptions.

This packet establishes a bounded correlation contract without a new subsystem or Dataverse table:

1. Reuse allow-listed GUID metadata already carried by governed Stripe billing objects.
2. Resolve exactly one Opportunity from direct metadata or an existing durable binding.
3. Deny missing, invalid, conflicting, or ambiguous identity before any business-state mutation.
4. Persist SHA-256-derived provider-object binding names in `jm1_executionlogs`; raw Stripe identifiers are not written into the binding description.
5. Apply one semantic initial-payment effect per Opportunity, independent of Stripe event order or object type.
6. Preserve amount as validation only, never identity.
7. Keep agreement, onboarding, accounting, and author-communication gates separate.

The historical Whole payment was the one confirmed valid event that required founder/manual correlation. It was already reconciled before this packet; this work made no production business-state remediation and created no financial effect.

Application PR #771 merged at `8e3e501c548ab313c5946a3231443cbc21a59364`. GitHub Actions run `35411996671` deployed that exact SHA to the Publishing Premium App Service and passed its health probe. Three independent post-deployment health reads returned `ready` at the same release SHA; the webhook route remained available and correctly rejected GET with HTTP 405.

Accounting boundaries remain unchanged: Stripe is payment processing authority, Dataverse is Publishing operational authority, QBO is current accounting authority during Movement 4, and Business Central remains the target accounting authority.
