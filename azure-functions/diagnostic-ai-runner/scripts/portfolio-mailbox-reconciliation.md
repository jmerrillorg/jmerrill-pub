# Portfolio Mailbox Evidence Release Contract

Packet: JMP-90-DAY-AUTHOR-TITLE-TRUTH-RECONCILIATION-001

This reader is GET-only against Graph and existing inbound/delivery evidence.
It writes audit files only to `jm1-publishing-portfolio-evidence`. It does not
send, mark mail read, apply decisions, update payments or move lifecycle state.

## Protected Release

1. Review PR #918 and its full Functions validation; merge only under normal
   repository controls. Deploy the resulting canonical artifact through the
   protected `jmerrill-pub-production` environment. Neither older run
   36929482252 nor 36933649885 contains this reader.
2. Verify the live release and deployed function before enabling
   `JM1_PORTFOLIO_MAIL_RECONCILIATION_ENABLED=true` under deployment authority.
   Use the existing Function managed identity (or the explicitly assigned
   `JM1_PORTFOLIO_MAIL_MANAGED_IDENTITY_CLIENT_ID`). No interactive credential
   fallback is supported. Graph Mail.Read authority must cover BOTH Publishing
   and Jackie, including body access for hashing; mailbox access is a live gate.
3. Call the function-key-protected POST
   `/api/run-portfolio-mailbox-reconciliation` with only a generated UUID
   `runId`. Keep the key out of logs. The mailbox list and window cannot be
   supplied or broadened by a request.
4. Retry the SAME runId after an interruption. Immutable completed pages are
   reused, the continuation token resumes unread pages, failure receipts remain,
   and a completed run returns its saved manifest without rescanning. A changed
   reader contract requires a NEW run. An expired Graph continuation requires a
   new run; preserve the incomplete predecessor. Concurrent attempts use the
   first persisted page. Credential tokens are refreshed through managed identity.
5. Download `runs/<runId>/` read-only. Preserve folder pages, message pages,
   evidence snapshot, failures, manifest and event document. Do not mistake an
   incomplete run (no manifest) for a complete extract.
6. Validate/import locally with:

   `node scripts/import-portfolio-mailbox-evidence.cjs <downloaded-run-directory> <new-evidence-directory>`

   The destination must not exist. The importer validates the digest, four
   exhausted queries, window, both folder inventories and durable identity.
   It never overwrites the provisional 342-row evidence. Identity conflicts and
   unassigned titles remain exceptions, not inferred matches.
7. Review full-run counts, mailbox source variants, conflict rows, unmatched
   folder IDs and missing Internet IDs before claiming cross-mailbox completion.
   Publish the new evidence pointer only after review, retaining old lineage.

## Coverage and Identity

The window is July 3 through October 1, 2026 in America/New_York:
`2026-07-03T04:00:00Z <= timestamp < 2026-10-02T04:00:00Z`.
Each primary mailbox is read using BOTH received and sent timestamps, exhausting
Graph `@odata.nextLink`; all primary-mailbox messages are queried, not merely
Inbox/Sent. Hidden folders and recursive children are separately inventoried.
Folder total counts are NOT window counts. Folder mismatches are exceptions.

Every request uses `Prefer: IdType="ImmutableId"`. Records retain exact IDs,
participants including each source's BCC, timestamps, subject, body preview,
body hash and attachment indicator; full bodies are not exported. Graph IDs
remain mailbox-scoped. Internet Message IDs are exact case-sensitive values.
Conversation, subject and body similarity do not authorize title attribution.
Conflicting delivery/inbound tuples are held without authoritative bindings.

Graph primary-mailbox reads do not establish online archive, purged items or
additional shared/delegated mailbox coverage. Those remain explicit external
coverage questions. A completed reader run is sequential observations, not a
transactionally consistent mailbox snapshot or a reconciled portfolio.

Graph transient 429/502/503/504 failures use bounded backoff. Long Retry-After,
access failures and expired continuation tokens produce a durable failure record
and a non-success response. No failure is converted to an empty success page.

## Separate Reminder Proof

Run 36929482252 (`ba00e47d...`) is an ancestor superseded by 36933649885
(`fc756762...`). Do not approve the older candidate for the reminder repair.
36933649885 requires protected approval and live SHA validation, followed by
the existing read-only Atta September 21 delivery/response/suppression proof.
Do not send a reminder to test suppression. A later approved cumulative release
may supersede this dependency only after source equivalence is proved.

## Primary Technical Sources

- https://learn.microsoft.com/en-us/graph/api/user-list-messages?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/graph/api/user-list-mailfolders?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/graph/outlook-immutable-id

Source tests and a validated deployment package are not live mailbox coverage.
