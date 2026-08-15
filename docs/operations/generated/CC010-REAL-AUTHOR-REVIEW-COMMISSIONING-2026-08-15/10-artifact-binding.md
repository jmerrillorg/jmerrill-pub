# Artifact Binding

Last verified: 2026-08-15T09:50:00-04:00

## Runtime Binding

PR #507 made author approval artifact-bound. Later stage execution requires full author approval tied to the exact upstream deliverable artifact and checksum.

## Closest Gate Binding

- Gate: `eeffc5fb-5698-f111-8076-000d3a14673b`
- Deliverable artifact: `bc3c6522-418c-f111-ab10-00224820105b`
- Checksum: `567a47a1c98ac2aaab5ec33b931f56c2ec0b916f12f98959e0cbc9430836d183`
- Artifact visibility: Internal Only
- Artifact file type: Markdown

## Result

The gate has artifact binding, but it is not author-sendable because the bound artifact is not a governed author-facing package artifact.

## Guard

PublishingDispatchService continues to require materialized package attachments, checksum validation, author-safe MIME inventory, and current gate validation before send.
