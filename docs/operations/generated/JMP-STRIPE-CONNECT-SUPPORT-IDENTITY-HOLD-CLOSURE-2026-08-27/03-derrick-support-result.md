# Derrick Support Result

Last Verified: 2026-08-28T01:12:00Z

Evidence Source: Microsoft 365 shared mailbox `publishing@jmerrill.one`

| Received | Subject | Classification |
| --- | --- | --- |
| 2026-08-21T17:56:41Z | New text message from J Derrick Johnson | Support request including direct-deposit link request and royalty-payment question |
| 2026-08-25T19:09:59Z | New text message from J Derrick Johnson | Royalty-payment status question |
| 2026-08-25T20:12:54Z | New text message from J Derrick Johnson | Royalty-timing follow-up |

Support classification: CONNECT_SUPPORT_ACTIVE

Canonical support-response boundary:
- Explain that no J Merrill Publishing activation code is required.
- Provide a fresh Stripe-hosted setup path only after the canonical ACS sender is healthy.
- Avoid royalty amount, royalty timing, royalty schedule, payment promise, payout, transfer, invoice, charge, or PaymentIntent language.

Delivery result in this pass:

| Item | Result |
| --- | --- |
| Fresh setup path generated | NOT STORED / NOT DELIVERED |
| Support response sent | NO |
| Reason not sent | ACS relay endpoint returned HTTP 503 |
| Generic corrective Day 0 sent | NO |
| Reminder sent | NO |

Prepared support substance, for execution only after relay recovery:

```text
Good day, Derrick,

You do not need a J Merrill Publishing activation code for direct deposit setup.
The earlier setup path was taking you to the wrong screen, so we corrected the setup route.

Please use the secure Stripe setup link below to complete the remaining direct deposit information inside Stripe.

[Secure Stripe setup link]

If Stripe asks you to verify your email address or phone number, that verification comes directly from Stripe.

The Publishing Team
J Merrill Publishing
```
