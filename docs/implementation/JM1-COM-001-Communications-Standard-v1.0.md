# JM1-COM-001: Communications Standard

Version: 1.0
Status: CANON-CANDIDATE
Owner: J Merrill One
Prepared: 2026-07-27

## Purpose

JM1-COM-001 governs outbound communications across JM1 entities so author, financial, foundation, and enterprise messages have explicit sender identity, reply routing, archival visibility, and evidence boundaries.

## Enterprise Reply-To Canon

Every outbound JM1 entity message must declare an explicit Reply-To that routes to the monitored operational mailbox for that entity. Reply-To must be set by the sending component or approved transport mechanism before delivery.

Reply-To must not rely on:

- mailbox forwarding;
- Exchange aliases;
- user mailbox rules;
- recipient knowledge;
- manual operator intervention.

## Entity Rules

| Entity | Canonical outbound sender | Mandatory Reply-To | Mandatory archival copy |
| --- | --- | --- | --- |
| Publishing | `publishing@email.jmerrill.one` | `publishing@jmerrill.one` | `publishing@jmerrill.one` |
| Financial | To be ratified by finance mailbox authority | Required | Required |
| Foundation | To be ratified by foundation mailbox authority | Required | Required |

For publishing, every outbound email originating from `publishing@email.jmerrill.one` must have:

```text
From: publishing@email.jmerrill.one
Reply-To: publishing@jmerrill.one
```

The Reply-To header is mandatory. `publishing@jmerrill.one` must also receive a governed archival copy through application-level BCC, approved transport-level journaling, or another governed non-author-visible copy path that is proven before production use. Duplicate archival delivery must be suppressed when `publishing@jmerrill.one` is already the primary recipient.

## Account Link and Sensitive-Data Boundary

Transient Account Links may be included only in the intended author-facing message when the author-facing workflow is authorized. Account Links must not be written to Dataverse, execution logs, durable evidence files, internal documents, support notes, or archival copies.

Retrospective archive copies and durable evidence must replace live transient links with:

```text
[TRANSIENT ACCOUNT LINK REDACTED]
```

Secrets, tokens, banking data, tax identifiers, identity documents, raw cookies, and access codes must not be included in outbound archive evidence.

## Regression Requirement

Outbound communication tests must fail if:

- From is not canonical for the entity;
- Reply-To is missing;
- Reply-To is not the monitored operational mailbox;
- the archival copy is missing;
- the archive recipient is visible to the external recipient;
- more than one author-facing recipient receives a single invitation;
- a transient Account Link enters durable evidence or logs.
