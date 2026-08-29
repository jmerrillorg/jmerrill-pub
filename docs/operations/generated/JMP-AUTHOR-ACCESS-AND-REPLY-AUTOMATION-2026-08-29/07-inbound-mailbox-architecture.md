# Inbound Mailbox Architecture

Last Verified: 2026-08-29T07:51:18Z

## Governed Source

- Mailbox: `publishing@jmerrill.one`
- Evidence authority: Microsoft 365 / Outlook / Exchange.
- Gmail was not searched.

## Runtime Path

Incoming message -> Graph mailbox intake -> message dedupe -> author/title/gate correlation -> multi-intent classification -> authoritative decision resolution -> support-action resolution -> safe response or human attention.

## Implemented in This Pass

- Existing inbound correlation module now includes deterministic intake event id construction.
- Existing Azure Functions timer `run-author-review-response-consumer` remains the production watcher for `publishing@jmerrill.one`.
- Required intent vocabulary is represented in code.
- Access-support and author-decision handling are separated.
- Dataverse execution logs preserve received, correlated, classified, persisted, completed, idempotency, intent, support-action, and founder-correction evidence.

## Change Notification Boundary

Graph change notifications remain optional future optimization. The commissioned scheduled reconciliation path does not rely on unread state and is not affected by humans opening the mailbox.
