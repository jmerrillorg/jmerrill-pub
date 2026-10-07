# Publishing front-door receipt repair

Packet: JMP-FRONTDOOR-LAURA-20261007-001

This is a technical incident repair, not external-author system commissioning.
Private author/message/file identifiers and incident logs are retained in the
packet evidence namespace, not in this repository or public PR.

## Receipt contract

1. Validate consent, origin, challenge, fields and upload format.
2. Read canonical intake by submission key; reject conflicting or malformed readbacks.
3. Reserve a deterministic intake primary key before any workspace or file write.
4. Hold legacy acknowledgment and diagnostic triggers during incomplete custody.
5. Upload and record the source manifest within the same reference workspace.
6. Finalize durable acceptance. Only then return received and attempt the governed
   receipt acknowledgment and internal Publishing notification.
7. Reserved/incomplete work returns pending with the existing reference. Duplicate
   and concurrent retries must not upload, acknowledge or create another inquiry.

Public receipt does not initialize Editorial Review, enqueue orchestration,
create a title, advance a stage or perform financial/provider activity. The
existing Contact/Lead routing flow remains separate. New receipt-marked inquiries
appear as Publisher manual review in the existing Operating Center. A held
incomplete receipt is JMP's recovery responsibility, not an author resubmission.

## Release prerequisites

- Review exact current PR head and relevant guards, executable adapter tests,
  typecheck and production build; recheck concurrent deployment/main drift.
- Platform owner must authorize only Local Create on jm1_publishingintake for
  the existing intake application role. Do not grant broad roles or substitute
  another identity. Capture role/user effective privilege before/after readback.
- Deploy the exact reviewed artifact through azure-app-service-premium.yml,
  using the existing production release controls. Read packaged SHA and health.
- Repair the existing alert with intake-alert-repair.bicep in its existing
  resource group, using the existing operations action group and exact Premium
  application ID. No new scheduler, recipient or queue consumer is introduced.
- Read-only health authority check must independently confirm the executing
  identity's intake Create privilege. A ready website/configuration is not proof.

## Live acceptance and recovery

Use an isolated harmless approximately 193KB DOCX and an approved controlled
internal recipient, never the real author's submission. Observe one intake,
one workspace and source manifest, exact manual review owner, complete receipt,
single intended acknowledgment and no title/diagnostic/orchestration/payment
effects. Retry the same key and verify unchanged record/file/message counts.

Dependency failure and timeout tests use isolated adapter fixtures, not outages
in shared production. Prove pending receipt and identifier-only recovery evidence,
then independently read the existing recovery queue and manual owner attention.
Alert testing must use the existing internal operator path without inquiry text.
Do not certify alert delivery from configuration alone.

## Rollback / containment

Preserve durable reservations, original files and recovery references. Never rerun
the real public submission, resend author mail, delete duplicate evidence, or
reset a held record as a rollback. Prior artifact 93538cc68e736a7ef543231ce93460edc7a7e0cc
is the technical rollback reference, but restoring it reintroduces upload-before-
record and legacy diagnostic dispatch risks; it is not a safe intake recovery.
Prefer holding receipt acceptance with the existing email fallback while the
reviewed repaired artifact is recovered forward. Restore alert preimage only
through approved configuration rollback; do not change its recipients.

Current production acceptance is NOT proven by this document or passing tests.
# Live custody follow-up

The first live synthetic DOCX proved SharePoint promotes library metadata into Office packages during upload. The document text was unchanged but its package bytes did not match the received source hash. New uploads therefore retain an inert `.source.bin` companion containing the exact received bytes before the readable DOCX. The manifest distinguishes the metadata-mutable document from the exact source companion and records its item ID, original filename, size and checksum. Existing real documents and historical manifests are not rewritten by this repair. Live acceptance must independently download and hash the synthetic companion; metadata or an input hash alone is insufficient.
