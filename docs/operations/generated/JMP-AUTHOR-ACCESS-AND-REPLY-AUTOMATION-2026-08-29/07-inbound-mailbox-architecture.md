# Inbound Mailbox Architecture

Last Verified: 2026-08-29T07:12:31Z

## Governed Source

- Mailbox: `publishing@jmerrill.one`
- Evidence authority: Microsoft 365 / Outlook / Exchange.
- Gmail was not searched.

## Runtime Path

Incoming message -> Graph mailbox intake -> message dedupe -> author/title/gate correlation -> intent classification -> deterministic action policy -> safe response or human attention.

## Implemented in This Pass

- Existing inbound correlation module now includes deterministic intake event id construction.
- Required intent vocabulary is represented in code.
- Access-support and author-decision handling are separated.

## Remaining Runtime Step

The durable mailbox watcher/change-notification or scheduled-poll deployment is not fully commissioned by this PR-stage package.
