# JMP Package-Acceptance Payment Amount Hotfix Evidence

Last verified: 2026-08-21

## Scope

Correct the author-facing package-acceptance payment-options HTML renderer so the message shows the actual scheduled payment amounts for each payment option.

## Defect

The canonical plain-text fallback included installment-level payment details, but the HTML body only showed package principal, payment-plan charge, and total scheduled amount. Author-facing HTML therefore omitted the actual per-payment amounts.

## Correction

- HTML payment-options table now includes a `Scheduled payments` block for multi-payment plans.
- HTML table header now uses `Payment-plan charge` instead of generic `Fee`.
- Renderer supports a short author-facing correction notice.
- Validator now fails closed if HTML or text omits any scheduled installment amount from the canonical offer engine output.

## Quanishia Corrected Preview

Subject:
`Corrected: Your Publishing Payment Options for Indomitable`

Required installment amounts verified in HTML and text:

- 2-Pay: `$2,261.25`, `$2,261.25`
- 4-Pay: `$1,141.88`, `$1,141.88`, `$1,141.88`, `$1,141.86`
- 8-Pay: `$582.19`, `$582.19`, `$582.19`, `$582.19`, `$582.19`, `$582.19`, `$582.19`, `$582.17`

State remains:

- `PAYMENT_OPTION_SELECTION_PENDING`
- `pricingLocked=false`
- `stripeCreated=false`
- `joinedTheFamily=false`

## Validation

- Focused payment/renderer/agreement/Stripe tests: `85 / 85 PASS`
- Diagnostic runner full suite: `1998 / 1998 PASS`
- Diagnostic runner syntax/lint: `PASS`
- ACS relay syntax/lint: `PASS`

## Negative Proof

- manual finance math: `0`
- fractional-cent installment: `0`
- installment sum mismatch: `0`
- legacy 4% language in corrected new-policy email: `0`
- CTA before payment options: `0`
- pricing locked before selection: `0`
- Stripe created before selection: `0`
- author asked to repeat package acceptance: `0`
