# Renderer Contract

Last verified: 2026-08-21T08:56:44Z

## Implementation

New renderer:

- `azure-functions/diagnostic-ai-runner/src/author/packageAcceptanceCommunicationBuilder.js`

The renderer consumes canonical Author Offer Engine output and produces a governed author-facing communication payload for the existing approved-author-response relay.

## Contract

Template: `PACKAGE_ACCEPTANCE_PAYMENT_OPTIONS_V1`

Template version: `1.0.0`

Renderer: `JM1 Enterprise Communication Renderer`

Render mode: `CANONICAL_HTML`

Subject pattern:

`Your Publishing Payment Options for {Book Title}`

## Pricing Boundary

The renderer does not calculate:

- base package price;
- loyalty;
- referral credits;
- principal;
- payment schedules;
- transaction fees;
- tax.

The renderer reads those values from the Author Offer Engine preview and blocks if the message content diverges from the engine output.

## Required Author-Facing Content

- Full Pay
- 2-Pay
- 4-Pay
- 8-Pay
- 4% multi-pay transaction fee
- `plus applicable tax`
- referral credit available/selected state
- book title
- author-facing reference in body
- CTA
- plain-text fallback

## Explicitly Blocked

- reference-led subject lines;
- GUID-led subject lines;
- internal workflow language;
- numeric tax guesses;
- referral auto-consumption;
- pricing lock before payment selection;
- Stripe creation before payment selection;
- Joined-the-Family state before agreement execution plus required initial payment.

