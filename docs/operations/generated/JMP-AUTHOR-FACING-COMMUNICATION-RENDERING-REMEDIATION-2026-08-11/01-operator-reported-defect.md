# Operator-Reported Defect

Last Verified: 2026-08-11

Reported observation:

Live Action 005 delivered the correct cover-review package, but the author-facing email rendered as a mostly plain transactional email rather than a branded publishing-grade message.

Classification:

- Defect type: RENDERING / TEMPLATE ENFORCEMENT GAP
- Scope: reusable author-facing communication path
- Severity: MINOR / REUSABLE
- Live Action 005 content correctness: NOT REOPENED
- Author resend: NOT AUTHORIZED / NOT PERFORMED

Evidence Source:

- User observation in current Codex thread
- Source inspection of `lib/server/author-communication-brand.ts`
- Source inspection of `azure-functions/acs-email-relay/src/functions/sendAuthorAcknowledgment.js`

