# Payment Options Renderer

Last verified: 2026-08-20

## Renderer Boundary

The renderer is format-only.

Input:

`Author Offer Engine → computed offer object`

Output:

`author-facing response preview`

Forbidden:

`email template → package price math`

## Presented Payment Options

- Full Pay;
- 2-Pay;
- 4-Pay;
- 8-Pay.

Full Pay has no 4% multi-pay fee.

2-Pay, 4-Pay, and 8-Pay use the per-installment fee schedule returned by the engine.

## Tax

Tax remains external.

The preview may say:

`plus applicable tax`

It does not guess or calculate tax.

## Microsoft-First Path

Mailbox authority:

`publishing@jmerrill.one`

Gmail is not used as a fallback.

## Live Send Boundary

`liveAutoSendEnabled = false`
