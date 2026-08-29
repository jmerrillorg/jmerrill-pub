# JMP Author Access and Reply Automation

Last Verified: 2026-08-29T07:12:31Z

## Result

Author access recovery and inbound reply classification were remediated for the live Ashanti Flemister and Sean Crowley cases, and regression coverage was added for the failure class.

## Live Actions

| Author | Result |
| --- | --- |
| Ashanti Flemister | Corrective direct-deposit access response sent through ACS; fresh Stripe-hosted setup link generated; transient link not preserved in evidence. |
| Sean Crowley | Corrective Author Operating Center access response sent through ACS; message classification preserved as acknowledgment/review-start, not approval. |

## Code Changes

- `lib/server/author-response-inbound-correlation.ts` now includes access-help intent detection, conservative author-decision authority classification, quoted-text stripping, and deterministic mailbox-intake event ids.
- `scripts/author_access_reply_intake.test.mjs` adds the Ashanti and Sean regressions.
- `app/author/page.tsx` and `app/author/_components/AuthorGate.tsx` surface Author Sign In and account-access help without presenting Jackie as the normal credential router.
- `package.json` adds `author-access-reply-intake-guard`.

## Validation

- `npm run author-access-reply-intake-guard`: PASS, 6 / 6.
- `npm run type-check`: PASS.
- Node runtime warning: local Node is v26 while repo declares `>=24 <25`; checks completed successfully after lockfile install.

## Classification

JMP AUTHOR ACCESS: `JMP_AUTHOR_ACCESS_AUTOMATION_CONTROLLED_COMMISSIONING`

JMP REPLY INTAKE: `JMP_AUTHOR_REPLY_AUTOMATION_CONTROLLED_COMMISSIONING`

Full commissioning remains reserved for a deployed mailbox watcher with durable Dataverse persistence, timer/change-notification trigger, and production idempotency readback.
