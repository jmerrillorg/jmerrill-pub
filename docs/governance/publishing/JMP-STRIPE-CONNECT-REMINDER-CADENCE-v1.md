# JMP Stripe Connect Reminder Cadence v1

Policy ID: `JMP-STRIPE-CONNECT-REMINDER-CADENCE-v1`

Status: `CANON`

Effective date: 2026-08-27

Authority: Jackie Smith, Jr. — Governance Authority

## Purpose

This policy governs automated J Merrill Publishing Stripe Connect direct-deposit setup reminders.

The objective is to help authors complete secure direct-deposit setup without nagging indefinitely, confusing setup with royalty payment authority, or talking over active human support.

## Cadence

| Cadence point | Event | Rule |
| --- | --- | --- |
| Day 0 | `INITIAL_INVITATION` | Initial valid delivered setup invitation. |
| Day 3 | `REMINDER_1` | First automated reminder if current Stripe state still requires author action. |
| Day 7 | `REMINDER_2` | Second automated reminder if current Stripe state still requires author action. |
| Day 14 | `FINAL_REMINDER` | Final automated reminder if current Stripe state still requires author action. |
| After Day 14 | `AUTOMATED_REMINDERS_STOP` | No further automated reminders. Status remains visible for operator follow-up/support. |

`CONNECT_INITIAL_INVITATION_VALID_DELIVERY_AT` is Day 0. Cadence must not be calculated from account creation, Dataverse row creation, link generation, failed email attempt, or operator memory.

## State-Aware Evaluation

A scheduled time does not authorize a send by itself.

Every reminder evaluation must:

1. read current Stripe state;
2. read reminder history;
3. read support/suppression state;
4. calculate cadence eligibility;
5. generate a fresh Account Link only when required;
6. send at most one governed reminder stage;
7. record reminder evidence without storing raw setup URLs.

## Reminder-Eligible States

Automated reminders may be considered only for:

- `NOT_STARTED`
- `SETUP_LINK_READY`
- `SETUP_IN_PROGRESS`
- `MORE_INFORMATION_NEEDED`

The message must reflect the current state. Do not tell an author they have not started if Stripe shows setup is already in progress.

## Stop / Pause States

Do not send automated setup reminders for:

- `SETUP_COMPLETE`
- `UNDER_REVIEW`
- `SUPPORT_REQUIRED` with active support conversation
- `IDENTITY_REVIEW`
- `DUPLICATE_REVIEW`
- `EXTERNAL_BLOCK` where author action is not the current need
- any author with a governed reminder suppression request

`SETUP_COMPLETE` is terminal for setup reminders.

## Active Support Override

If an author has an active Stripe Connect setup-support conversation, automated reminders hold. Human support owns the next action until support closes.

## Account Link Rule

When a reminder needs a setup link:

`REMINDER -> FRESH LINK IF NEEDED -> SAME CANONICAL STRIPE CONNECT ACCOUNT`

Never create a new Stripe Connect account for a reminder.

## Communication Authority

Stripe Connect setup reminders are Publishing service communications.

| Field | Value |
| --- | --- |
| From | `publishing@email.jmerrill.one` |
| Reply-To | `publishing@jmerrill.one` |
| CC/archive | `publishing@jmerrill.one` |
| Format | HTML required |
| Communication type | Service / operational |

Marketing consent must not block this service reminder, but the reminder must not include promotional content.

## Royalty / Payment Boundary

Setup reminders may discuss direct-deposit setup, support, current setup state, and the secure Stripe setup link.

They must not include:

- royalty amount;
- royalty calculation;
- royalty payment date;
- payment timing;
- payment schedule;
- promise of payment;
- payout;
- transfer;
- charge;
- invoice;
- PaymentIntent;
- Business Central payment posting.

## Event Model

Persist reminder events with:

- authorId;
- contactId;
- stripeAccountId;
- eventType;
- eligibleAt;
- generatedAt;
- sentAt;
- deliveryStatus;
- communicationId;
- accountLinkGenerated;
- currentStripeStateAtSend;
- policyVersion.

No raw secret setup URL may be stored in durable logs or evidence.

## Idempotency

`AUTHOR + CONNECT ACCOUNT + REMINDER STAGE = ONE VALID SEND`

Retries may recover failed delivery but must not create duplicate valid deliveries.

Only one reminder may be sent to an author in a single execution cycle.

