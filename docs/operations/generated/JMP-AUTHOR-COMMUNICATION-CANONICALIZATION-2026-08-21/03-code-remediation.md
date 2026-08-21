# Code Remediation

Last Verified: 2026-08-21T08:18:00Z

## Files Changed

| File | Change |
|---|---|
| `azure-functions/acs-email-relay/src/functions/sendAuthorAcknowledgment.js` | Canonical sender, human-first acknowledgment subject, branded HTML body, plain-text fallback, Reply-To, body reference, prospect-stage workspace-link block |
| `azure-functions/acs-email-relay/test/validation.test.js` | Updated expectations and added regression coverage for subject/body/HTML/reference/CTA |
| `azure-functions/acs-email-relay/local.settings.example.json` | Updated local sender example |
| `scripts/author_facing_email_cc_canon.test.mjs` | Updated relay sender fixture |
| `scripts/author_facing_html_render_enforcement.test.mjs` | Updated relay sender fixture |
| Current operations/testing docs | Replaced active DoNotReply instructions with canonical sender/reply route |

## Canonical Rules Enforced

- From: `publishing@email.jmerrill.one`
- Reply-To: `publishing@jmerrill.one`
- Subject: book/project plus understandable reason
- Body: reference number appears in body, not subject
- HTML: branded JMP shell required
- Prospect-stage CTA: secure continuation only, no Author Workspace link

