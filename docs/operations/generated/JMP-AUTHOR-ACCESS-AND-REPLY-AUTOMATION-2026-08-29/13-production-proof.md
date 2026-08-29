# Production Proof

Last Verified: 2026-08-29T07:51:18Z

## ACS Relay

- Function app `func-jm1-acs-email-relay` is running.
- Route used: `send-enterprise-governed-email`.
- Ashanti response accepted: YES.
- Sean response accepted: YES.

## Mailbox Readback

Readback from `publishing@jmerrill.one` Inbox confirmed:

- `Re: Set Up Direct Deposit with J Merrill Publishing`, received 2026-08-29T07:12:21Z, from `publishing@email.jmerrill.one`, to Ashanti, CC Publishing.
- `Re: Developmental Editing Materials - Before You Were Born`, received 2026-08-29T07:12:13Z, from `publishing@email.jmerrill.one`, to Sean, CC Publishing.

## Sean Approval Readback

- Inbound author reply: Microsoft 365 Publishing mailbox, received 2026-08-28T09:29:27Z from `scrowley50@gmail.com`.
- Gate decision: `jm1pub_authordecision = 196650000`.
- Decision timestamp: `2026-08-28T09:29:27Z`.
- Decision source: inbound `publishing@jmerrill.one` message.
- Idempotent replay: PASS, second observation returned `IDEMPOTENT` with no duplicate gate patch.

## Production Boundary

- Dataverse author-decision persistence was performed only for Sean's current Developmental Editing gate.
- No Dataverse lifecycle advancement or next-stage worker execution was performed.
- No canonical author email was changed.
- No author identity was rebound.
- No author package was resent.
