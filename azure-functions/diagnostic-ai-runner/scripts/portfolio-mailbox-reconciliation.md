# Portfolio Mailbox Evidence Release Contract

Packet: JMP-90-DAY-AUTHOR-TITLE-TRUTH-RECONCILIATION-001

This reader is GET-only against Graph and existing inbound/delivery evidence.
It writes audit files only to `jm1-publishing-portfolio-evidence`. It does not
send, mark mail read, apply decisions, update payments or move lifecycle state.

## Protected Release

1. Obtain Jackie's explicit authorization for the reviewed PR #918 release AND
   reader enablement. This runbook and passing tests are not that authorization.
   Record the reviewed head, current base and approval; re-review any intervening
   changes. Merge only under normal repository controls. Deploy the resulting canonical artifact through the
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
participants including each source's BCC, timestamps, subject,
body hash and attachment indicator; neither full bodies nor body previews are
exported (a preview can contain an entire short message). Graph IDs
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

Both 36929482252 (`ba00e47d...`) and 36933649885 (`fc756762...`) were superseded
by cumulative production release 88222fa5972cd90f1155eb4b8842b51b24b75872.
Do not approve either older artifact. October 2 live read-only delivery search
and cadence preview, plus exact title-specific projection evidence, proved
Atta's current suppression. Do not send a reminder to test it. Reader release
approval remains separate; it is not present in either old run or that release.

## Bounded Historical Attribution

The pure `attributeCommunicationCopies` projection can bind historical ACS
copies to existing communication logs by exact provider identity, title/contact
lookup, recipient parity and bounded timestamp. It does not use title text or
conversation proximity, create a delivery record, infer an author decision or
certify fresh provider delivery. Any incomplete or conflicting log poisons the
join. Use this after extraction with separately preserved source authority;
retain every nonmatching row as an exception.

## Release Assessment Repairs (Reader 2.3.0)

Invalid JSON or a missing runId is rejected before extraction. HTTP redirects
are rejected; continuation links remain confined to the original mailbox.
Every prior nonempty binding and body hash participates in conflict checks,
including when intervening observations omit fields. Exact communication-copy
joins cannot overwrite an existing communication/provider identity.

Import validates each observation's date/window, query count, Graph identity,
folder membership and metadata-only shape, in addition to the document digest.
Held events cannot carry a title/author authority binding. A digest proves file
integrity, not trusted provenance: use the authenticated download of the approved
run, retain its source pages and evidence snapshot, and never import arbitrary files.

## Safe Disable and Access Gate

After an approved extraction, disable the dedicated reader setting. This blocks
new HTTP starts; it does not cancel an in-flight invocation. Let an in-flight
read settle or inspect its durable pages/failure receipt before any authorized
host restart. Preserve all run directories. Never roll back unrelated production
work merely to disable this reader. Reuse the same runId for same-version recovery;
use a new run for a changed contract or expired continuation, linking the predecessor.

The code's two-mailbox allowlist is not an Exchange permission boundary. Before
enablement, verify the selected managed identity's effective Mail.Read coverage
and applicable Exchange application access/RBAC policy for both mailboxes. Do not
grant Mail.ReadWrite, Mail.Send or broader storage permissions for this packet.
Existing unrelated identity grants do not authorize this reader to use them.

## Primary Technical Sources

- https://learn.microsoft.com/en-us/graph/api/user-list-messages?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/graph/api/user-list-mailfolders?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/graph/outlook-immutable-id

Source tests and a validated deployment package are not live mailbox coverage.
