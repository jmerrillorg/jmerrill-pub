# Post-Selector Observation and Attachment Hardening

Last Verified: 2026-08-26T09:49:00Z

## Selector Correction Deployment

PR #637 merged at:

`0e1a688dc89c5aac367025c2801e3e19289ce701`

Production health returned:

- status: `ready`
- release: `0e1a688dc89c5aac367025c2801e3e19289ce701`
- productionRelease: `0e1a688dc89c5aac367025c2801e3e19289ce701`

The 2026-08-26T09:40Z cadence timer fired on the corrected release and failed closed before any author package send.

## Fail-Closed Finding

Application Insights recorded the timer failure:

`REQUIRED_ATTACHMENT_MISSING:reviewInstructions`

The corresponding live stage artifact exists for The General's Will and Last Testament, but the Dataverse record represents author-visible approval with numeric choice values:

- artifact status: `196650002`
- visibility: `196650001`
- current approved flag: `false`

The sender previously recognized formatted labels and current-approved flags, but not this numeric approved/author-visible representation.

## Corrective Action

The author-package sender now recognizes the deployed numeric approved/author-visible artifact values as author-visible package evidence.

The cadence release consumer also catches send-materialization exceptions and records a governed blocked result instead of failing the whole timer. Missing attachments remain fail-closed and still produce no send.

## Validation After Correction

- `npm run lint` in `azure-functions/diagnostic-ai-runner`: PASS.
- `node --test test/editorialCadenceReleaseConsumer.test.js` in `azure-functions/diagnostic-ai-runner`: 15 / 15 PASS.
- `npm test` in `azure-functions/diagnostic-ai-runner`: 2,122 / 2,122 PASS.
