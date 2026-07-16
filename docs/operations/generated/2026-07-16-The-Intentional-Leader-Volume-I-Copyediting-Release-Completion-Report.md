# The Intentional Leader Volume I - CAP-003 Copyediting Author Release Addendum

Generated: 2026-07-16

## Overall Result

Jackie approved the remaining CAP-003 release decision. The Volume I Copyediting author-review package has been released to author review.

Copyediting remains complete. Proofreading has not started. The current author decision is pending.

## Released Package

Author-facing cover note:

- `2026-07-16-The-Intentional-Leader-Volume-I-Copyediting-Author-Review-Cover-Note.pdf`
- SharePoint driveItem ID: `01DF3SEQM4YBE33OYFTJF33UHX77CKADOS`
- Core artifact ID: `ac0595ab-ea80-f111-ab0f-000d3a14673b`

Author-facing copyedited manuscript:

- `2026-07-16-The-Intentional-Leader-Volume-I-Copyedited-Working-Manuscript.docx`
- SharePoint driveItem ID: `01DF3SEQKEDEAOFNRQ3ZH2QQNWWV6KQTJX`
- Core artifact ID: `c2f64dae-ea80-f111-ab0f-6045bdd69738`

SharePoint folder:

`01_Pre-Pipeline/00_Inquiry/JMP-INT-202607-0W5PTQ - Jackie Smith jr - The Intentional Leader/20_Editorial/04_Copyediting/Volume-I/2026-07-16_Copyediting-Author-Review-Package`

## Governed Email

Sender: `J Merrill Publishing <publishing@email.jmerrill.one>`

Recipient: governed author email for Jackie Smith, Jr.

Subject: `Volume I Copyediting Review Package - The Intentional Leader`

Provider: ACS email relay

Provider result: accepted.

Provider message ID: not captured because the local evidence script failed immediately after relay acceptance. The message was not resent, preserving the no-duplicate-notification boundary.

## Core State

Copyediting stage:

- Stage ID: `cf06664b-ce80-f111-ab0f-7c1e525b15c2`
- Status: `Complete`
- Author-safe summary: `Your Volume I copyediting review package for The Intentional Leader has been sent by email and is ready for your review.`
- Current gate count: `1`
- Publisher review required: `No`
- Proofreading authorized: `No`

A4 gate:

- Gate ID: `ca4994e3-ea80-f111-ab0f-7c1e525b15c2`
- Gate: `A4 Copyediting Completion`
- Status: `Awaiting Author Response`
- Deliverable artifact: `ac0595ab-ea80-f111-ab0f-000d3a14673b`
- Next stage authorized: `No`

Author-facing summary:

- Summary ID: `cb4994e3-ea80-f111-ab0f-7c1e525b15c2`
- Status: `Published to Workspace`
- Headline: `Volume I Copyediting Review Package Ready`
- Next action: `Please review the copyedited manuscript and reply to the publishing team with your approval, bounded copyediting corrections, a discussion request, or a pause request.`

Correlation ID:

`CAP003-AUTHOR-RELEASE-CORE-2026-07-16T07-48-04-768Z`

## Execution Logs

- `CAP003_AUTHOR_RELEASE_APPROVED`: `78dc27e2-ea80-f111-ab0f-6045bdd69678`
- `CAP003_AUTHOR_PACKAGE_DELIVERED`: `e7338fe2-ea80-f111-ab0f-000d3a14673b`
- `CAP003_AUTHOR_REVIEW_OPENED`: `79dc27e2-ea80-f111-ab0f-6045bdd69678`
- `CAP010_COPYEDITING_RELEASE_REFRESH_COMPLETED`: `0f7a893a-ec80-f111-ab0f-7c1e525b15c2`

## Browser Validation

Author Operating Center production readback:

- Shows The Intentional Leader as `Copyedit - Complete`.
- Shows next action asking the author to review the copyedited manuscript and respond with approval, bounded copyediting corrections, discussion request, or pause request.
- Shows pending approval: `Awaiting Author Response`.
- Shows package/download controls.
- Does not show Proofreading in progress.

Publisher Operating Center production readback:

- Current Chrome session was not authenticated to the Publisher Operating Center; page displayed the workforce sign-in screen.
- No stale publisher release-decision task was visible in the unauthenticated state.

## Credential Note

The initial app-identity write path created the author-facing artifact rows but lacked `prvCreateJm1pub_Editorialapprovalgate` for `JM1-INFRA-PAM`. Gate, summary, stage, and release execution-log writeback were completed with the governed `jm1-admin@jmerrill.one` delegated Dataverse token, matching the prior governed editorial release pattern.

Residual remediation: add the narrow editorial approval-gate create privilege to the permanent writeback identity before the next fully unattended release.

## Current Truth

- CAP-003 Copyediting: Complete.
- Author review: Open.
- Author decision: Pending.
- Proofreading: Not started.
- No additional Jackie release decision remains for this package.
