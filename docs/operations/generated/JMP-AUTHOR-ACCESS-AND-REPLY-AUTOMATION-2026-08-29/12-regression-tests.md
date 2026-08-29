# Regression Tests

Last Verified: 2026-08-29T07:51:18Z

## Command

`npm run author-access-reply-intake-guard`

## Result

PASS: 6 / 6.

## Covered Cases

- Sean founder-corrected reply is approval plus access help.
- `please approve them` is never treated as author approval.
- Ashanti authentication-app issue is access help with direct-deposit context.
- Explicit first-person approval remains approval candidate path.
- Quoted approval text is ignored when current reply is only acknowledgment.
- Mailbox-intake event id is deterministic.

## Additional Check

`npm run author-response-runtime-remediation-guard`: PASS, 53 / 53.

`node --test scripts/author_review_package_engine.test.mjs`: PASS, 33 / 33.

`npm run jmp-lifecycle-authority-guard`: PASS, 22 / 22.

`npm run type-check`: PASS.
