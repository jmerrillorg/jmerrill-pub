# INT-PUB-005 — Publishing Mailbox Reply Reader (Milestone 6 Continuation)

**Date:** 2026-06-21
**Status:** Built, tested, not yet run live (pending Graph permission grant + Application Access Policy)

## Purpose

Completes the author-response loop for Milestone 6 continuation:

```
author receives payment-options email
  → author replies to publishing@jmerrill.one
  → pipeline reads the controlled reply (this capability)
  → pipeline classifies the response
  → pipeline records the classification as safe evidence
  → next gated step (human/business decision)
```

Manual inbox checking is not acceptable long-term pipeline behavior — this module exists so the check is governed, gated, and auditable rather than ad hoc.

## Modules

| Module | Purpose |
|---|---|
| `src/mail/publishingMailboxReader.js` | Read-only Microsoft Graph reader. Hardcoded to `publishing@jmerrill.one`, Inbox only, GET only. |
| `src/mail/publishingReplyClassifier.js` | Pure function. Classifies reply text into a closed enum. No I/O. |
| `src/mail/publishingMailboxReplyCheck.js` | Orchestrator. Calls the reader, classifies the result, writes one safe execution-log record. |
| `src/functions/runPublishingMailboxReplyCheck.js` | Thin HTTP wrapper. Runner key + exact-record match + explicit confirm flag. Subject filter and after-timestamp are fixed, not caller-supplied. |

## Gate

`JM1_PUBLISHING_MAIL_READ_ENABLED` — default false/absent. Checked fresh on every call inside `publishingMailboxReader.js`. No mailbox read occurs unless this is exactly `"true"`.

## Scope Guarantees (Structural, Not Just Configured)

- The mailbox address (`publishing@jmerrill.one`) is hardcoded as a module constant — there is no parameter or code path that accepts a different mailbox.
- Only the Inbox folder (`/mailFolders/inbox/messages`) is queried.
- Only `GET` is used. No `PATCH`, `POST`, or `DELETE` exists anywhere in `publishingMailboxReader.js` — mail cannot be sent, deleted, moved, or marked read/unread from this module, because that code simply does not exist, not because it is merely disabled.
- Attachments are never requested or expanded in the Graph query.
- The raw Graph response, headers, and access token are never returned from `readPublishingMailboxReply()` — only four extracted fields: `found`, `senderAddress`, `receivedDateTime`, `bodyText`.
- The raw reply body (`bodyText`) is used only in-memory for classification by the orchestrator. It is never persisted, logged, or returned from `checkPublishingMailboxReply()` — only the classification result and (when applicable) the governed payment-option detail (installments, per-installment amount, fee-applies boolean) are recorded.

## Required Graph Permission (Not Yet Granted)

**Recommended: application `Mail.Read`, constrained via an Exchange Online Application Access Policy.**

Granting tenant-wide application `Mail.Read` would let the managed identity read every mailbox in the tenant — far broader than this module's actual query. To narrow it to exactly `publishing@jmerrill.one`:

1. Grant the managed identity (`func-jm1-diagnostic-ai-runner`) application permission `Mail.Read` in Microsoft Graph (admin consent required).
2. In Exchange Online PowerShell, create a mail-enabled security group containing **only** `publishing@jmerrill.one`.
3. Run:
   ```powershell
   New-ApplicationAccessPolicy -AccessRight RestrictAccess `
     -AppId <managed-identity-app-id> `
     -PolicyScopeGroupId <security-group-id> `
     -Description "Restrict func-jm1-diagnostic-ai-runner Mail.Read to publishing@jmerrill.one only"
   ```
4. Verify with `Test-ApplicationAccessPolicy -Identity publishing@jmerrill.one -AppId <managed-identity-app-id>` (expect `AccessCheckResult: Granted`) and `Test-ApplicationAccessPolicy -Identity <any other mailbox> -AppId <managed-identity-app-id>` (expect `AccessCheckResult: Denied`).

This is an Exchange Online / Entra administrative configuration — it cannot be performed from this codebase or by this agent. The module's own query is hardcoded to one mailbox regardless, but the *platform-level* restriction (so the underlying Graph token literally cannot reach other mailboxes even if the code were compromised or modified) requires this Exchange Online policy.

## Classification

| Classification | Meaning |
|---|---|
| `SINGLE` | Single payment selected — $4,500.00, no processing fee |
| `TWO_PAYMENTS` | 2 payments selected — $2,340.00 each, fee applies |
| `FOUR_PAYMENTS` | 4 payments selected — $1,170.00 each, fee applies |
| `EIGHT_PAYMENTS` | 8 payments selected — $585.00 each, fee applies |
| `TWELVE_PAYMENTS` | 12 payments selected — $390.00 each, fee applies |
| `CALL_REQUESTED` | Author asked to talk/schedule/discuss |
| `QUESTION` | Author asked a question without a clear selection |
| `HOLD` | Author asked to pause/wait/hold/decline |
| `UNCLASSIFIED` | No recognizable signal |

Payment-option selection patterns take precedence over incidental call/question/hold language in the same message (e.g. "Can I do 8 payments?" classifies as `EIGHT_PAYMENTS`, not `QUESTION`).

## Known Schema Gap — Reported, Not Worked Around

**No Dataverse field exists for storing the selected payment option, installment count, per-payment amount, or selection source as structured data on the Opportunity (or any entity).** Confirmed by direct `EntityDefinitions` inspection of the `opportunity` entity — only the nine existing Milestone 6 status fields exist (`jm1_m6packageselectionstatus`, `jm1_m6paymentoptionpreparationstatus`, etc.), none of which can hold a specific selected option's detail.

`checkPublishingMailboxReply()` therefore records the classification and payment-option detail **only** in the existing, schema-confirmed `jm1_executionlogs` evidence entity (the same pattern used throughout Milestone 6) — it does not attempt to write to the Opportunity. The result includes a `schemaGap` field stating this explicitly.

**Adding dedicated Opportunity fields (e.g. `jm1_m6selectedpaymentoption`, `jm1_m6selectedinstallments`, `jm1_m6selectedperpaymentamount`) is a schema decision for the Dataverse owner, not a code change.** If persistent, queryable, structured capture is desired beyond the execution-log evidence trail, those fields need to be added to the `opportunity` entity first.

## Live Execution Status

Not yet run. Requires, in order:
1. The Graph `Mail.Read` permission + Application Access Policy above.
2. `JM1_PUBLISHING_MAIL_READ_ENABLED=true` opened for exactly one controlled check.
3. Gate closed immediately after.

## Controlled Record (Current Activation)

| Field | Value |
|---|---|
| Diagnostic ID | `64e387e0-7e6a-f111-a826-00224820105b` |
| Intake reference | `JMP-INT-202606-UFYG60` |
| Opportunity ID | `2653fca9-eacd-4c44-b3ed-1764dd5d35aa` |
| Controlled subject filter | "Next steps for Establishing Glory: The Library" |
| After timestamp | `2026-06-21T01:20:45Z` (the author-facing send's `jm1_startedon`, evidence record `661a176d-0f6d-f111-ab0d-7c1e525b15c2`) |
