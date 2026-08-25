# JM1 Canon Enforcement & Runtime Policy Layer v1

Last verified: 2026-08-25

## Result

JM1 canon enforcement is now implemented as an executable runtime policy layer for the first Publishing consuming paths.

This package is not documentation-only. The implementation adds pre-mutation and pre-send policy resolution to:

- governed payment-link creation;
- payment-option commercial continuation;
- ACS author-facing agreement-package send;
- ACS author-facing acknowledgment send;
- targeted and controller-driven editorial execution;
- Full Wrap production authority.

## Policy Registry

Machine-readable registry:

- `docs/governance/publishing/JMP-Runtime-Canon-Policy-Registry-v1.0.json`

Runtime implementation:

- `azure-functions/diagnostic-ai-runner/src/policy/canonPolicyLayer.js`
- `azure-functions/acs-email-relay/src/policy/canonPolicyLayer.js`

Resolvers implemented:

- `resolvePaymentAuthority`
- `resolveCommunicationAuthority`
- `resolveIdentityAuthority`
- `resolveArtifactAuthority`
- `resolveEditorialStageAuthority`
- `resolvePublicationIntentAuthority`
- `resolveProductionAuthority`
- `resolveDistributionAuthority`
- `resolveCadenceAuthority`
- `resolveWaitingOnAuthority`
- `resolveLegacySystemAuthority`

## Canonical Runtime Effects

- New Publishing payment-link work resolves to Stripe and denies MoonClerk fallback.
- MoonClerk remains legacy/grandfathered reconciliation evidence only.
- Publishing author-facing email requires `publishing@email.jmerrill.one`, `publishing@jmerrill.one` Reply-To, `publishing@jmerrill.one` CC, and HTML.
- The agreement-package ACS relay now renders HTML in addition to plain text.
- Indomitable cannot render or mutate under an Atta Darko fallback.
- Superseded artifacts are denied as current production authority.
- Downstream editorial execution is guarded by prior author approval and cadence eligibility.
- Full Wrap production authority fails closed on missing trim, page count, imprint, back-cover copy, source assets, or release metadata when commercial release requires it.
- Waiting-On classification denies false `WAITING_ON_AUTHOR` and ungrounded `WAITING_ON_SYSTEM`.

## Boundaries

No Business Central posting was added.

No Dataverse schema mutation was added.

No broad client-title automation thaw was performed.

No payment was created, refunded, recharged, migrated, or repriced.

No author communication was sent by this package.

Production deployment remains a separate release step after PR review/merge.

