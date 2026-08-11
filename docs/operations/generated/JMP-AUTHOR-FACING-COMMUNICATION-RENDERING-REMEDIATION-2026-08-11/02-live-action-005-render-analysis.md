# Live Action 005 Render Analysis

Last Verified: 2026-08-11

Finding:

The ACS approved-author-response relay accepted `AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1` when a payload supplied any `htmlBody` plus attachments. Before this remediation, the relay did not prove that the HTML body came from the canonical JMP author communication renderer.

Live Action 005 original render path:

- Communication type: `AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1`
- Transport: ACS approved-author-response relay
- Render body class: simplified/manual HTML payload
- Canonical renderer used: NO
- HTML generated before relay: YES
- HTML lost during relay: NO
- Wrong render class selected: YES

Evidence Source:

- `azure-functions/acs-email-relay/src/functions/sendAuthorAcknowledgment.js`
- `scripts/author_facing_html_render_enforcement.test.mjs`

