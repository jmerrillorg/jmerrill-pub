# Repair

Last Verified: 2026-08-28T01:36:47Z

## Code Repair

| Area | File | Repair |
| --- | --- | --- |
| Package notification engine | `lib/server/author-package-notification-engine.ts` | Computes SHA256 from decoded attachment bytes and fails closed when declared attachment checksum does not match. |
| ACS email relay | `azure-functions/acs-email-relay/src/functions/sendAuthorAcknowledgment.js` | Validates optional attachment SHA256 and rejects mismatch before constructing ACS email attachments. |
| Diagnostic runner provider bridge | `azure-functions/diagnostic-ai-runner/src/author/authorResponseSendProviderConfig.js` | Preserves author-review attachments into the ACS relay payload and validates checksum before provider handoff. |

## New Fail-Closed Codes

| Code | Scope |
| --- | --- |
| `ATTACHMENT_CHECKSUM_INVALID:<role>` | Package notification engine |
| `ATTACHMENT_CHECKSUM_MISMATCH:<role>` | Package notification engine |
| `AUTHOR_REVIEW_ATTACHMENT_CHECKSUM_INVALID` | ACS relay |
| `AUTHOR_REVIEW_ATTACHMENT_CHECKSUM_MISMATCH` | ACS relay |
| `AUTHOR_RESPONSE_ATTACHMENT_CHECKSUM_INVALID` | Diagnostic runner bridge |
| `AUTHOR_RESPONSE_ATTACHMENT_CHECKSUM_MISMATCH` | Diagnostic runner bridge |
| `AUTHOR_REVIEW_ATTACHMENTS_MISSING` | Diagnostic runner bridge author-review templates |

## Production Mutation

No author communication was sent during this repair pass. No manuscript binary was committed. Runtime source was changed and validated; deployment is tracked separately after merge.

