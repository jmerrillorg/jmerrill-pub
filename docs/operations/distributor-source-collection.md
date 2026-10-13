# Monthly distributor source collection

Publishing owns the importer and source ledger. OPS independently verifies cross-system evidence. This collection path does not post accounting entries, calculate an unbound author entitlement, pay an author, or send royalty statements.

## Runtime

The existing Publishing Function host registers `run-distributor-collection`. It calls the existing Publishing website with its existing orchestration worker key. Both hosts require `JM1_DISTRIBUTOR_COLLECTION_ENABLED=true`; absent means disabled. `JM1_DISTRIBUTOR_COLLECTION_MONTH` optionally restricts the website to one archive month for acceptance. No new identity or grant is required by source code.

Every 15 minutes the timer checks durable due state. Successful month scans are due again after 24 hours. The current and two preceding archive folders are scanned unless acceptance is month-bound. A failed scan has a durable privacy-safe receipt, retries after 15 then 30 minutes, and holds after three failures. An abandoned claim expires after 20 minutes and counts against the retry bound. No AI session is the scheduler. Missing folders and source reads are failures, not zero-sales evidence.

The private `jm1-publishing-distributor-sources` container stores exact originals by SHA256 and atomic normalized statement versions by distributor/account/type/currency/period. Conditional creation and ETag replacement prevent concurrent duplicate commits. A crash after raw custody recovers using identical bytes. Changed content for an existing statement remains a correction requiring review; it cannot silently replace active rows. Reformatting-only duplicates cannot add active sales.

Archive month, archive creation timestamp, runtime receipt timestamp/month, source sales period, and transaction date are separate fields. SharePoint creation time is not distributor receipt time. Workbook filters and source files are never changed. All rows, including zeros and returns, are retained.

## Authority and holds

The prior-import read covers legacy royalty lines, transactions, royalty execution logs, and V2 statement/payment evidence. Unreadable or ambiguous records fail closed. Existing V2 evidence without a proved period mapping is held conservatively. A snapshot is refreshed for each collection invocation.

Ingram TSV reports are recognized by exact schema, irrespective of their `.xls` suffix. eBook control totals must agree. Ambiguous repeated POD account/ISBN/market/category identities fail rather than being collapsed.

KDP originals can be captured and inspected independently of import. The present KDP reader retains every sheet/filter and currency separately. It does not activate normalized KDP sales without a proved account context and complete detail/control reconciliation. An archived/current-provider conflict must remain held. An unavailable ACX statement is `STATEMENT_UNAVAILABLE`, never a zero-sale author report.

Source publisher proceeds are not author royalties. Agreement-specific edition, payee, executed agreement, rate, base, and applicable period must be established by the existing Publishing royalty owner before author entitlement can be released. A null profile rate never inherits an assumed standard. Every new source version remains `HELD_AGREEMENT_MAPPING_REQUIRED` for entitlement; this does not erase its verified source proceeds.

## Release and acceptance

Review and merge the exact source through existing controls. Website and Function releases have different SHAs until both readbacks pass. Use the Function workflow's settings-preserving `source-only` mode with the exact previous release. Do not allow the automatically triggered standard deployment to replace live configuration. Enable only the source collector after both artifacts and existing settings have been verified.

Acceptance requires exact source hashes/counts/currency totals, live private ledger readback, a replay with no extra active rows, failure/recovery evidence at its actual proof level, and a separately observed natural timer invocation. Unit tests are not live acceptance. KDP/account/contract holds remain visible even when a scan succeeds.

## Recovery and rollback

Disable the collection feature on both hosts before rollback. Preserve originals, statement versions, failed receipts, monitor claims, and existing signature/stage settings. Never delete a real receipt or restore a historical oversized ledger to simulate recovery. A source-only rollback uses the last verified canonical artifacts through the protected path. Corrected-statement promotion and exhausted-retry reset require an exact reviewed owner operation; this release deliberately supplies no blind promote/reset endpoint.
# Existing owner source access

Distributor source reads run in the existing Publishing Function managed identity,
not a fallback credential in the website. The authenticated reader is disabled by
default (`JM1_DISTRIBUTOR_SOURCE_READER_ENABLED`). It accepts only a bounded archive
month, fixed Publishing drive, file membership and five existing ledger reads.
It cannot accept arbitrary URLs, OData, mutations or mailbox operations. The
website uses its established Function-owner authentication. No grant is added.
`JM1_DISTRIBUTOR_COLLECTION_MONTH` bounds both caller and owner during acceptance.
Disabling the reader and collector retains all source receipts and originals.

## Publisher source precedence, October 13, 2026

Jackie's direct ruling in the OPS owner conversation establishes that KDP online
wins when it conflicts with an archived workbook. For August 2026 the independently
observed online USD 6.69 supersedes the archived USD 13.38 as value authority.
Preserve both observations and unchanged workbook bytes. This does not establish
account binding, royalty entitlement, payment or accounting authority. Archived
KDP totals remain nonauthoritative until reconciled with current online evidence.
