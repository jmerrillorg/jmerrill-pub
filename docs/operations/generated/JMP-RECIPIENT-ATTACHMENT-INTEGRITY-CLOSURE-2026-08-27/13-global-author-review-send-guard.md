# Global Author Review Send Guard

Last Verified: 2026-08-28T01:36:47Z

## Guard

`AUTHOR_REVIEW_ATTACHMENT_LAST_MILE_V1`

## Enforced Controls

| Control | Enforcement |
| --- | --- |
| Required author-review attachments present | Diagnostic runner bridge and ACS relay |
| Declared SHA256 format valid | Package engine, diagnostic runner bridge, ACS relay |
| Declared SHA256 equals decoded payload bytes | Package engine, diagnostic runner bridge, ACS relay |
| Internal wrapper text blocked from manuscript attachments | Existing package notification engine guard |
| Tiny/placeholder manuscript artifacts blocked | Existing package notification engine profile guard |
| Attachments preserved into relay payload | Diagnostic runner bridge |

## Code References

| File | Guard |
| --- | --- |
| `lib/server/author-package-notification-engine.ts` | `validateGovernedPackageAttachmentBinary` |
| `azure-functions/acs-email-relay/src/functions/sendAuthorAcknowledgment.js` | `normalizeAuthorReviewAttachments` |
| `azure-functions/diagnostic-ai-runner/src/author/authorResponseSendProviderConfig.js` | `normalizeAuthorResponseAttachments` and relay payload preservation |

