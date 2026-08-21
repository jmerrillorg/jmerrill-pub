# PR #543 Founder Review

Last verified: 2026-08-21

## PR

PR: https://github.com/jmerrillorg/jmerrill-pub/pull/543  
Title: `JMP: Wire package acceptance to canonical payment options`  
Branch: `codex/package-acceptance-payment-options-20260820`  
Reviewed head: `bd817d1fa9f6236180e2ba3f202a473c446ecfe2`

## Scope Review

PR #543 wires package acceptance to canonical payment-option preview and pricing-lock behavior.

Confirmed in diff:

- `authorOfferEngine.js` is the monetary authority for loyalty, referral cap, adjusted principal, installment allocation, and multi-pay fee math.
- `packageAcceptancePaymentOptions.js` handles package-acceptance classification, offer preview, no-send response preview, opportunity projection, and pricing lock.
- `authorReviewResponseConsumer.js` consumes Microsoft-first package-selection replies and records package-selected / offer-preview evidence without sending author-facing mail.
- Payment adapter additions consume the canonical offer output for adjusted Stripe amount preparation.

## Founder Criteria

| Criterion | Result |
|---|---|
| Returning-author benefit automatic: 0 / 10 / 15 / 20 | PASS |
| Referral credits bankable/selectable/not auto-consumed | PASS |
| Returning + referral capped at 50 percent | PASS |
| Payment math produced by Author Offer Engine | PASS |
| Renderer formats only | PASS |
| PACKAGE_ACCEPTED does not immediately lock pricing | PASS |
| PRICING_LOCKED requires payment-option selection | PASS |
| Current v1 multi-pay rule: 4 percent fee per transaction | PASS |
| Whole-cent allocation sums exactly to adjusted principal | PASS |
| Cap case stops referral choices at max allowed | PASS |
| Ambiguous package acceptance fails closed | PASS |
| Microsoft-first mailbox authority | PASS, `publishing@jmerrill.one` |
| Preview-only / no automatic author send | PASS |
| Atta unaffected | PASS |

## Validation

Commands run from `azure-functions/diagnostic-ai-runner`:

- `npm ci`: PASS, with Node version warning because local Node is `v26.0.0` and package declares `>=22 <25`.
- `npm run lint`: PASS.
- Focused tests: `node --test test/packageAcceptancePaymentOptions.test.js test/authorOfferEngine.test.js test/agreementPaymentLinkMapping.test.js test/authorReviewResponseConsumer.test.js`: PASS, 101 / 101.
- Full suite: `npm test`: 1980 / 1983 PASS.

Known full-suite failures:

- `test/agreementGeneratedPackageMirror.test.js`: 3 failures.
- PR #543 does not modify `azure-functions/diagnostic-ai-runner/test/agreementGeneratedPackageMirror.test.js`.
- PR #543 does not modify `azure-functions/diagnostic-ai-runner/src/agreement/agreementGeneratedPackageMirror.js`.

## Boundary

No unrestricted author-send activation, Atta mutation, Gmail routing, Stripe mutation, Joined-the-Family trigger, referral-credit earning, onboarding activation, or automatic agreement regeneration is authorized by this PR.
