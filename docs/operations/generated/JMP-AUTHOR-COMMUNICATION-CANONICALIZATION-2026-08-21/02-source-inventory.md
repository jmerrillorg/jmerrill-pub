# Source Inventory

Last Verified: 2026-08-21T08:17:00Z

## Canonical Route

| Path | Role | Disposition |
|---|---|---|
| `azure-functions/acs-email-relay/src/functions/sendAuthorAcknowledgment.js` | ACS relay for `/join`, internal Publishing notification, and approved author response paths | Updated in place |
| `lib/publishing/intake/authorAcknowledgment.ts` | App route caller for `/api/send-author-acknowledgment` | Existing continuation payload already supported |
| `lib/server/jm1-enterprise-communication-renderer.ts` | Existing governed communication renderer | Preserved; no second app framework added |
| `lib/server/publishing-email-canon.ts` | Canonical Publishing sender/reply/copy constants | Preserved |

## Superseded Behavior Found

| Behavior | Source | Disposition |
|---|---|---|
| DoNotReply as active Publishing ACS sender | Relay constant, relay tests, local settings example, current runbooks | Replaced with `publishing@email.jmerrill.one` |
| Intake reference in acknowledgment subject | Relay acknowledgment builder | Moved to body |
| Plain-text-only `/join` acknowledgment | Relay acknowledgment builder | Replaced with HTML plus plain-text fallback |

