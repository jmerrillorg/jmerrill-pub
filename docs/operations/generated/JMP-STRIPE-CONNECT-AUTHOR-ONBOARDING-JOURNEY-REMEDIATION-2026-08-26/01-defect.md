# Defect

Last Verified: 2026-08-26T23:34:13Z

## Root Cause

The existing Stripe Account Link contract sent authors to:

| URL type | Prior path | Defect |
| --- | --- | --- |
| return_url | `/author/portal?stripe=returned` | Dropped authors into the generic Author Operating Center gate |
| refresh_url | `/author/financial-setup?contact=<contactId>` | Carried a raw contact id without enrollment-bound proof |

That made direct deposit setup look like it required a J Merrill Publishing activation/recovery code even though the setup journey had not provided one.

## Corrected Journey

`Invitation -> Stripe -> /author/financial-setup?connect=return&token=<signed-context> -> live Stripe readback -> human-readable next step`

Expired or interrupted setup uses:

`/api/author/stripe/connect/refresh?token=<signed-context> -> fresh Stripe Account Link`

The generic Author Operating Center remains private and gated. The Connect return path is narrow and setup-only.
