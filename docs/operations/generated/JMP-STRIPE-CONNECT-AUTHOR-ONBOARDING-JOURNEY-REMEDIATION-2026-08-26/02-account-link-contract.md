# Account Link Contract

Last Verified: 2026-08-26T23:34:13Z

## Current Canonical Builder

Code source: `lib/server/stripe/author-workspace-stripe.ts`

Account Links are created with:

| Field | Value |
| --- | --- |
| account | Verified canonical `acct_*` for the author/payee |
| type | `account_onboarding` |
| collection fields | `eventually_due` |
| return_url | `https://jmerrill.pub/author/financial-setup?connect=return&token=<signed-context>` |
| refresh_url | `https://jmerrill.pub/api/author/stripe/connect/refresh?token=<signed-context>` |

The transient Stripe URL is returned only to the intended author flow or email. It is not persisted in evidence or logs.

## Reuse Rule

Refresh never creates a new Connect account. It validates the signed context, reuses the canonical account, creates a fresh Account Link, and redirects to Stripe.
