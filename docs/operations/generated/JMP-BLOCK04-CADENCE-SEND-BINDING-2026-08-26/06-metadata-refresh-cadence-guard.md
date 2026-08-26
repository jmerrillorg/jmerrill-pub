# Metadata Refresh Cadence Guard

Last Verified: 2026-08-26T10:17:00Z

## Production Observation

The 2026-08-26T10:00Z cadence timer succeeded on release:

`561a9d9fd3b6ea48b1f72830440f257f07f16ca8`

It did not send The General's Will and Last Testament package because the live edited-manuscript artifact checksum in Dataverse did not match the stable SharePoint/Graph bytes.

Blocker:

`ATTACHMENT_CHECKSUM_MISMATCH:editedManuscript`

## Deterministic Metadata Repair

The live Graph item for the Developmentally Edited Manuscript returned:

- HTTP: `200`
- bytes: `20070`
- DOCX integrity: `PASS`
- stored Dataverse checksum before repair: `fa93165bdff7a470a1c9e949402c876406820e7c344c088e1dd492d570074efd`
- live Graph SHA256: `f849765c1b00437889abba5da54371e8361e9666566e67d61b5d70a6a8487c6f`

Dataverse artifact metadata was reconciled to the live Graph SHA256. No artifact bytes were changed and no author communication was sent.

Audit log:

`EDITORIAL_ARTIFACT_CHECKSUM_RECONCILED`

## Secondary Runtime Finding

Refreshing the package manifest through the canonical package-handoff consumer produced a corrected package checksum:

`aa3512d130cb4e8cccdac062038e957ab43035f25d49e4bb9eb30e83e0fba737`

The same refresh also exposed a runtime defect: metadata-only package refresh completion was treated as a new package completion date, which restarted the author-facing cadence hold and scheduled release for 2026-09-02.

That was not a content revision and must not restart the cadence hold.

## Corrective Action

The cadence release consumer now ignores package-completion logs associated with checksum repair or metadata refresh when selecting the completion date used for cadence timing.

The refreshed package metadata can still be used for package identity and checksum evidence, but the author-release clock remains anchored to the real package-completion event.

## Validation After Correction

- `npm run lint` in `azure-functions/diagnostic-ai-runner`: PASS.
- `node --test test/editorialCadenceReleaseConsumer.test.js` in `azure-functions/diagnostic-ai-runner`: 16 / 16 PASS.
- `npm test` in `azure-functions/diagnostic-ai-runner`: 2,123 / 2,123 PASS.

