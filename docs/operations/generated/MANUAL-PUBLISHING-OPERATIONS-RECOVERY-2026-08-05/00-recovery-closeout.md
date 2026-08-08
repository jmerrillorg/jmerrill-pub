# Manual Publishing Operations Recovery

Date: 2026-08-06

Authority: JM1 Publishing Enterprise Operating Manual v1.0 canonical on main.

Scope: manual Publishing operations recovery only.

No runtime implementation, schema change, client-title automation thaw, author send, Business Central mutation, catalog change, agreement change, website deployment, or new architecture was performed.

## Corrected Result

This package has been corrected to remove stale package-complete and author-decision language that was not supported by the current title evidence.

The recovery pass did not truthfully complete clean author-review packages for Naughty Tales, The General's Will and Last Testament, or Before You Were Born. It located the controlling or candidate manuscript sources and established the current operational boundary for each title.

The PR should not be treated as ready for merge as a completed manual recovery package until the unresolved title-level gates in `validation.md` are cleared.

## Priority 1 Authors Waiting on JMP

- Before You Were Born: candidate source manuscript located. The title remains under editorial-state confirmation and a major author-facing internal-information exposure incident. Prior technical dispatch is not a valid author-review delivery. This is now the first manual recovery priority.
- Naughty Tales: authoritative source manuscript located. Developmental edit is still required unless a later approved developmental package is proven from the exact controlling manuscript.
- The General's Will and Last Testament: candidate controlling manuscript located. Existing generated developmental outputs contain internal operational language and require authoritative validation before author delivery.

## Priority 2 Title One Step from Release

- Strategies For Success: manual final production continues under the Operating Manual. Jackie identified hardcover design as the current remaining item. Client-title automation remains frozen and was not used.

## Specific Title Outcomes

### Naughty Tales

Current status: DEVELOPMENTAL_EDIT_REQUIRED.

Authoritative source located:

- `240920 9781954414846.docx`
- SharePoint location: `/sites/publishing/Shared Documents/02_Active-Pipeline/04_Editorial/Stevette, Jaylonna - Naughty Tales/02-MANUSCRIPT/240920 9781954414846.docx`
- Last verified: 2026-08-06

Corrected finding:

The previously recorded `PACKAGE COMPLETE / SHAREPOINT FILED` state is not carried forward because the package was not proven to be built from the exact controlling manuscript after a completed developmental edit.

Boundary: DEVELOPMENTAL_EDIT_REQUIRED; JACKIE_SEND_APPROVAL_REQUIRED only after clean package QA passes.

Next valid action: perform manual developmental edit from the verified source manuscript, generate clean author-facing deliverables, run leakage QA, file the package, then request Jackie send approval. Do not send.

### The General's Will and Last Testament

Current status: AUTHORITATIVE_DEV_EDIT_VALIDATION_REQUIRED.

Candidate controlling manuscript located:

- `THE_GENERALS_FULL_MANUSCRIPT_Clean_Formatted_Editorial_Working_Copy (1).docx`
- SharePoint location: `/sites/publishing/Shared Documents/01_Titles/02_Developmental-Editing/JMP-INT-202607-DL2T20 - Iyorwuese Hagher - The General's Will and Last Testament/02_Manuscript/THE_GENERALS_FULL_MANUSCRIPT_Clean_Formatted_Editorial_Working_Copy (1).docx`
- Last verified: 2026-08-06

Corrected finding:

The existing package-ready state is not carried forward. A later generated developmental-edit manuscript was located, but it contains internal operational language including automation-generation metadata, source artifact references, correlation language, and publisher review notes. That artifact is not author-facing clean.

Boundary: AUTHORITATIVE_DEV_EDIT_VALIDATION_REQUIRED.

Next valid action: validate the candidate source against prior manuscripts, Program-008 package evidence, and later outputs. Only after authoritative source validation and leakage QA may a corrected author-review package be prepared for Jackie approval. Do not send.

### Before You Were Born

Current status: EDITORIAL_STATE_CONFIRMATION_REQUIRED; AUTHOR_FACING_INTERNAL_INFORMATION_EXPOSURE.

Candidate source manuscript located:

- `JMP-INT-202607-LQPHEK - Before You Were Born copy.docx`
- SharePoint location: `/sites/publishing/Shared Documents/01_Titles/02_Developmental-Editing/JMP-INT-202607-LQPHEK - Sean Crowley - Before You Were Born/01_Manuscript/Original/JMP-INT-202607-LQPHEK - Before You Were Born copy.docx`
- Last verified: 2026-08-06

Corrected finding:

The prior author-review delivery is not accepted as valid operational delivery. Existing protected-dispatch evidence classified the title as `TECHNICALLY_RELEASED / OPERATIONAL_CERTIFICATION_FAILED`, and no author response clock may run from that defective state.

Incident record:

- `incidents/before-you-were-born-author-facing-internal-information-exposure.md`

Boundary: EDITORIAL_STATE_CONFIRMATION_REQUIRED; corrective communication and package preparation must wait until the clean package is verified.

Next valid action: confirm editorial state, preserve the incident evidence, prepare a clean corrected package after verification, then request Jackie approval for any apology or corrected package send. Do not send.

### Strategies For Success

Current status: MANUAL_FINAL_PRODUCTION.

Release date: 2026-09-22.

Corrected finding:

The prior broad not-distribution-ready blocker list is superseded unless separately proven current by direct evidence. Current manual operational understanding is that the remaining identified item is hardcover design, handled manually by Jackie.

Boundary: HARDCOVER_DESIGN_IN_PROGRESS; CLIENT_AUTOMATION_NOT_USED.

Next valid action: continue manual hardcover design and manual release preparation under the Operating Manual. No author status communication is required under this recovery package unless Jackie separately requests it.

## Stale States Removed

- Naughty Tales is not marked package complete.
- The General's Will and Last Testament is not marked author-decision-required.
- Before You Were Born is not marked author-decision-required.
- Strategies For Success no longer carries broad stale blockers not verified as current in this corrective pass.

## Evidence

- `operational-register.csv`
- `source-verification-and-title-state-correction.md`
- `validation.md`
- `priority-and-single-operator-routing-addendum.md`
- `incidents/before-you-were-born-author-facing-internal-information-exposure.md`
- `communications/naughty-tales-author-review-draft.md`
- `communications/general-author-review-ready-draft.md`
- `communications/strategies-for-success-status-draft.md`
- `checksums.sha256`

## Stop State

Client-title automation remains FROZEN.

Client-title production remains MANUAL.

Runtime implementation: 0.

Schema changes: 0.

Dataverse mutations: 0.

Business Central changes: 0.

Author communications sent: 0.

New architecture: 0.
