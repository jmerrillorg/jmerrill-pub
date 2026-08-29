# JMP Author Access and Reply Automation

Last Verified: 2026-08-29T07:51:18Z

## Result

Author access recovery and inbound reply classification were remediated for the live Ashanti Flemister and Sean Crowley cases, and regression coverage was added for the failure class. Sean Crowley's live reply was corrected under Jackie Founder authority from the original non-approval classification to a multi-intent Developmental Editing approval plus access-help request.

## Live Actions

| Author | Result |
| --- | --- |
| Ashanti Flemister | Corrective direct-deposit access response sent through ACS; fresh Stripe-hosted setup link generated; transient link not preserved in evidence. |
| Sean Crowley | Corrective Author Operating Center access response sent through ACS; founder correction applied; Developmental Editing approval persisted once against gate `e996abe7-2f8e-f111-8077-000d3a14673b`; no duplicate access response sent. |

## Code Changes

- `lib/server/author-response-inbound-correlation.ts` now includes access-help intent detection, multi-intent output, conservative author-decision authority classification, founder-correction metadata, quoted-text stripping, and deterministic mailbox-intake event ids.
- `azure-functions/diagnostic-ai-runner/src/orchestration/authorReviewResponseConsumer.js` now preserves message intents, support actions, original/corrected classification, and founder correction metadata in durable execution logs while writing only the governed author decision to the approval gate.
- `scripts/author_access_reply_intake.test.mjs` adds the Ashanti and Sean regressions.
- `azure-functions/diagnostic-ai-runner/test/authorReviewResponseConsumer.test.js` adds Sean's mixed-intent approval plus access-help regression.
- `app/author/page.tsx` and `app/author/_components/AuthorGate.tsx` surface Author Sign In and account-access help without presenting Jackie as the normal credential router.
- `package.json` adds `author-access-reply-intake-guard`.

## Validation

- `npm run author-access-reply-intake-guard`: PASS, 6 / 6.
- `npm run author-response-runtime-remediation-guard`: PASS, 53 / 53.
- `npm run type-check`: PASS.
- Node runtime warning: local Node is v26 while repo declares `>=24 <25`; checks completed successfully after lockfile install.

## Classification

JMP AUTHOR ACCESS: `JMP_AUTHOR_ACCESS_AUTOMATION_FULLY_COMMISSIONED`

JMP REPLY INTAKE: `JMP_AUTHOR_REPLY_AUTOMATION_FULLY_COMMISSIONED`

Production mailbox processing remains on the existing five-minute governed Azure Functions timer for `publishing@jmerrill.one`. Change-notification subscription expansion remains unnecessary unless timer reconciliation no longer meets the operational SLA.
