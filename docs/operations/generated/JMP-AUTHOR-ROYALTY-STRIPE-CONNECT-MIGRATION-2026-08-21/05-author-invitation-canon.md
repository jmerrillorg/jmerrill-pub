# Author Invitation Canon

Last Verified: 2026-08-22T00:09:38Z

## Sender

Canonical Publishing enrollment messages must use:

```text
From: J Merrill Publishing <publishing@email.jmerrill.one>
Reply-To: publishing@jmerrill.one
```

## Required Human-First Semantics

The author-facing message must explain:

- J Merrill Publishing is updating how author royalties are paid;
- Stripe Connect is the secure payout setup path;
- Stripe collects and verifies payout and tax information directly;
- JMP is not asking the author to email banking or tax information;
- completing onboarding now helps prevent delay in the next royalty cycle.

## Link Isolation

Every invitation must satisfy:

```text
recipientAuthorId
= connectAccountOwner
= onboardingLinkAccount
```

No shared generic onboarding link is permitted.

Account Link URLs may appear only in the intended author-facing delivery at send time. Durable evidence, logs, archive records, and internal docs must redact them as:

```text
[TRANSIENT ACCOUNT LINK REDACTED]
```

## Current Pass

No invitations were sent in this pass because broad identity reconciliation is not ready.

