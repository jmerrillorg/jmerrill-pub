# ACS HTML Preservation Proof

Last Verified: 2026-08-11

Result:

ACS relay preserves canonical HTML when a validated payload is supplied.

Evidence:

- `buildApprovedAuthorResponseEmail` writes `payload.htmlBody` to `content.html`.
- Regression test `relay preserves canonical HTML in ACS message content` passed.
- Existing relay validation suite passed 32 / 32.

Conclusion:

The defect was not HTML loss during relay. The defect was insufficient template enforcement before relay message construction.

Evidence Source:

- `azure-functions/acs-email-relay/src/functions/sendAuthorAcknowledgment.js`
- `azure-functions/acs-email-relay/test/validation.test.js`
- `scripts/author_facing_html_render_enforcement.test.mjs`

