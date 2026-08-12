# Remediation Details

Last verified: 2026-08-11T22:20:00Z

Code changes:

| File | Change |
|---|---|
| `lib/server/publishing-email-canon.ts` | Added required author CC canon, injection, normalization, duplicate suppression, and fail-closed validation. |
| `lib/publishing/intake/authorAcknowledgment.ts` | Added Publishing CC and canonical reply-to to the acknowledgement payload. |
| `lib/server/author-package-notification-engine.ts` | Replaced Publishing BCC requirement with Publishing CC requirement for author notifications. |
| `lib/server/author-review-package-engine.ts` | Updated package handoff recipient policy to use Publishing CC. |
| `lib/server/publishing-dispatch-service.ts` | Updated dispatch validation and relay payloads to use Publishing CC. |
| `lib/server/publishing-orchestrator.ts` | Updated proofreading notification policy and evidence text to use Publishing CC. |
| `azure-functions/acs-email-relay/src/functions/sendAuthorAcknowledgment.js` | Added author-facing CC injection/validation for acknowledgement and approved author response relay paths. |
| `azure-functions/acs-email-relay/src/functions/sendAgreementPackage.js` | Added author-facing CC injection/validation for agreement package sends. |
| `scripts/author_facing_email_cc_canon.test.mjs` | Added 14-case regression coverage for the new canon. |

Guard behavior:

- Author email without declared CC: dispatcher/relay injects `publishing@jmerrill.one`.
- Existing Publishing CC: preserved without duplicate.
- Case variants: normalized to one effective CC.
- Retry/replay: preserves one effective CC.
- Manual recovery and agent-triggered author sends: covered through governed canon builder.
- Stage 0 acknowledgement: relay injects Publishing CC.
- Editorial and review-package author paths: relay/builders inject Publishing CC.
- Distribution, launch, royalty, and payment author communications: covered through governed canon builder.
- Internal-only notification: author-facing CC rule does not apply.
- Unsafe/unapproved CC: fails closed.

Future commissioning:

`'Til Death Do Us Part` full-journey commissioning will exercise this guard automatically through the central Publishing email canon and ACS relay boundaries. Every future author-facing email generated through these paths must include one effective `publishing@jmerrill.one` CC without Jackie or Cody specifying it manually at send time.

