# Source Verification and Title State Correction

Date: 2026-08-06

Purpose: record the current source-location evidence and corrected operational boundary for the four manual Publishing recovery titles.

No author communication, Dataverse mutation, runtime work, automation thaw, Business Central mutation, website deployment, or schema change occurred.

## Naughty Tales

Corrected title state: DEVELOPMENTAL_EDIT_REQUIRED.

Authoritative source located:

- File: `240920 9781954414846.docx`
- SharePoint path: `/sites/publishing/Shared Documents/02_Active-Pipeline/04_Editorial/Stevette, Jaylonna - Naughty Tales/02-MANUSCRIPT/240920 9781954414846.docx`
- Evidence source: SharePoint search and file fetch in the Publishing site.
- Last verified: 2026-08-06.

Additional copy located:

- File: `240920 9781954414846.docx`
- SharePoint path: `/sites/publishing/Shared Documents/02_Active-Pipeline/04_Editorial/06_Hold/2025-Stevette-NaughtyTales/02-MANUSCRIPT/240920 9781954414846.docx`
- Last verified: 2026-08-06.

Correction:

The existing author-review package in the PR is not accepted as complete because it was not proven to be a completed developmental edit from the controlling source manuscript.

Required next gate:

1. Complete manual developmental edit from the verified source manuscript.
2. Generate clean author-facing manuscript and Editorial Review Guide.
3. Run leakage QA.
4. File governed package.
5. Request Jackie send approval.

## The General's Will and Last Testament

Corrected title state: AUTHORITATIVE_DEV_EDIT_VALIDATION_REQUIRED.

Candidate controlling manuscript located:

- File: `THE_GENERALS_FULL_MANUSCRIPT_Clean_Formatted_Editorial_Working_Copy (1).docx`
- SharePoint path: `/sites/publishing/Shared Documents/01_Titles/02_Developmental-Editing/JMP-INT-202607-DL2T20 - Iyorwuese Hagher - The General's Will and Last Testament/02_Manuscript/THE_GENERALS_FULL_MANUSCRIPT_Clean_Formatted_Editorial_Working_Copy (1).docx`
- Evidence source: SharePoint search and file fetch in the Publishing site.
- Last verified: 2026-08-06.

Existing developmental package evidence located:

- Program-008 author-review manuscript.
- Program-008 Editorial Review Guide.
- 2026-07-21 developmental-edit manuscript.
- 2026-07-20 developmental-edit manuscript.
- 2026-07-21 developmental memo and review instructions.

Correction:

The later generated developmental-edit manuscript contains internal operational content, including automation-generation metadata, source artifact/checksum references, correlation language, and publisher review notes. That artifact is not author-facing clean and cannot support a package-ready state without correction.

Required next gate:

1. Compare the candidate controlling manuscript against prior manuscript and Program-008 package evidence.
2. Confirm which artifact is the authoritative developmental-edit output.
3. Remove any author-facing internal operational content.
4. Run leakage QA.
5. Prepare Jackie corrective-send approval package only after the clean package is verified.

## Before You Were Born

Corrected title state: EDITORIAL_STATE_CONFIRMATION_REQUIRED; AUTHOR_FACING_INTERNAL_INFORMATION_EXPOSURE.

Candidate source manuscript located:

- File: `JMP-INT-202607-LQPHEK - Before You Were Born copy.docx`
- SharePoint path: `/sites/publishing/Shared Documents/01_Titles/02_Developmental-Editing/JMP-INT-202607-LQPHEK - Sean Crowley - Before You Were Born/01_Manuscript/Original/JMP-INT-202607-LQPHEK - Before You Were Born copy.docx`
- Evidence source: SharePoint search and file fetch in the Publishing site.
- Last verified: 2026-08-06.

Existing developmental package evidence located:

- 2026-07-21 developmental-edit manuscript.
- 2026-07-20 developmental-edit manuscript.
- 2026-07-21 developmental memo.
- 2026-07-21 developmental review instructions.
- Prior protected-dispatch certification evidence.

Correction:

Before You Were Born is not placed in author-decision-required state. Prior evidence classifies the delivery path as technically released but operationally failed. A defective send cannot start the author response clock.

Required next gate:

1. Confirm the current editorial state from candidate source and developmental outputs.
2. Preserve incident evidence.
3. Prepare corrected author-facing package only after leakage QA passes.
4. Prepare apology/corrective communication only after the corrected package is verified.
5. Request Jackie approval before any author communication.

## Strategies For Success

Corrected title state: MANUAL_FINAL_PRODUCTION.

Release date: 2026-09-22.

Current manual boundary:

- Hardcover design remains in progress.
- Jackie is handling this manually.
- Client-title automation remains frozen and was not used.

Correction:

Stale broad blockers from the earlier recovery pass are not carried forward unless directly verified as current. No author communication is required under this PR.

Required next gate:

Continue manual final production and hardcover design under the Operating Manual.
