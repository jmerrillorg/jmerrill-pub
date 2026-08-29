# Regression Tests

Last Verified: 2026-08-29T07:12:31Z

## Command

`npm run author-access-reply-intake-guard`

## Result

PASS: 6 / 6.

## Covered Cases

- Sean access-code reply remains acknowledgment/review-start, not approval.
- `please approve them` is never treated as author approval.
- Ashanti authentication-app issue is access help with direct-deposit context.
- Explicit first-person approval remains approval candidate path.
- Quoted approval text is ignored when current reply is only acknowledgment.
- Mailbox-intake event id is deterministic.

## Additional Check

`npm run type-check`: PASS.
