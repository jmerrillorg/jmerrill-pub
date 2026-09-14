# Code Path Inventory

## Dataverse Runtime Paths Rewired

- `lib/server/dataverse-server.ts`
- `lib/program003/dataverse.ts`
- `lib/publishing/intake/dataverse.ts`
- `lib/server/dataverse-execution-log.ts`
- `lib/server/author-onboarding-dataverse.ts`
- `lib/server/dataverse/catalog.ts`
- `lib/server/publishing/agreement-execution-reconciliation.ts`
- `lib/server/stripe/publishing-first-payment-billing.ts`
- `lib/server/stripe/publishing-payment-event.ts`

## Graph/SharePoint File Runtime Paths Rewired

- `app/api/author/artifacts/[artifactId]/download/route.ts`
- `lib/publishing/intake/manuscriptUpload.ts`
- `lib/server/publishing-intake-manuscript-binding.ts`
- `lib/server/publishing-dispatch-service.ts`

## Explicitly Not Rewired

- `lib/server/form-integrations.ts`

Reason: this is the existing form/mail integration token path. JMP-AUTH-003 explicitly did not prove mail authority and instructed not to add mail authority.

## GitHub OIDC

No `.github/workflows/*` files were modified.

## Interactive Author Sign-In

`lib/server/author-durable-auth.ts` was not modified and does not import the runtime auth selector.
