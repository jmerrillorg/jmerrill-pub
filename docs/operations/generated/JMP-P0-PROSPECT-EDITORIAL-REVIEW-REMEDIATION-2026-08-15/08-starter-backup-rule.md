# Starter Backup Rule

Last verified: 2026-08-15

Evidence source:

- `lib/server/prospect-editorial-review-policy.ts`
- `scripts/p0_prospect_editorial_review_lifecycle_guard.test.mjs`

Rule:

If the primary recommendation is Starter, backup recommendation is `NONE`.

If a backup exists, it must not match the primary package.
