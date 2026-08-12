# Global Communication Audit

Last verified: 2026-08-11T22:20:00Z

Evidence sources:

- `lib/server/publishing-email-canon.ts`
- `lib/publishing/intake/authorAcknowledgment.ts`
- `lib/server/author-package-notification-engine.ts`
- `lib/server/author-review-package-engine.ts`
- `lib/server/publishing-dispatch-service.ts`
- `lib/server/publishing-orchestrator.ts`
- `azure-functions/acs-email-relay/src/functions/sendAuthorAcknowledgment.js`
- `azure-functions/acs-email-relay/src/functions/sendAgreementPackage.js`

Production-capable author send paths found:

| Path | Communication class | Pre-remediation state | Post-remediation state |
|---|---|---|---|
| Join author acknowledgement | Stage 0 author email | Payload had no CC; relay sent no Publishing CC | Payload and relay inject Publishing CC |
| Approved author response relay | Editorial/review author email | Relay required hidden internal BCC and rejected visible CC | Relay injects Publishing CC and rejects unapproved CC |
| Agreement package relay | Agreement author email | Relay required hidden internal BCC and rejected visible CC | Relay injects Publishing CC and rejects unapproved CC |
| Author package notification engine | Cover/interior/proof/editorial review email | Header guard required Publishing BCC | Header guard requires Publishing CC and rejects Publishing BCC |
| Author review package release | Author review package handoff | Recipient policy used Publishing BCC | Recipient policy uses Publishing CC |
| Publishing dispatch service | Governed author package dispatch | Relay payload used Publishing BCC | Relay payload uses Publishing CC |
| Publishing orchestrator proofreading path | Proofreading author notification | Recipient policy and evidence text used hidden archive copy | Recipient policy and evidence text use Publishing CC |

Compliant paths before remediation:

- Internal-only notifications correctly routed to `publishing@jmerrill.one` as primary recipient and were not author-facing.

Noncompliant paths before remediation:

- Every inspected production-capable author-facing email path relied on no copy or hidden BCC rather than the visible Publishing CC required by the new canon.

Central enforcement point:

- `lib/server/publishing-email-canon.ts` for application/runtime envelope construction.
- ACS relay validation/builders for transport-boundary enforcement where callers may still omit the CC.

Remediation:

- Added `PUBLISHING_EMAIL_CANON.requiredAuthorCc`.
- Added `ensurePublishingAuthorEmailCc`.
- Converted author-facing runtime policies from Publishing BCC to Publishing CC.
- Updated ACS relay validation/builders to inject one effective Publishing CC.
- Preserved internal notification routing separately.

