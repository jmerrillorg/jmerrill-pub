# Manual Publishing Operations Recovery

Date: 2026-08-05

Authority: Operating Manual v1.0 canonical on main.

Scope: manual publishing operations and backlog recovery only.

No runtime implementation, schema change, client-title automation thaw, author send, Business Central mutation, catalog change, agreement change, or new architecture was performed.

## Result

Portfolio inventory is complete for the currently visible governed SharePoint portfolio reviewed in this pass:

- /01_Pre-Pipeline/00_Inquiry
- /02_Active-Pipeline/04_Editorial
- /01_Titles
- PROGRAM-008 Jackie Review 2026-08-04
- prior repository evidence for Program 008 and five-title recovery

Every active or unresolved title identified in those sources is represented once in `operational-register.csv`.

## Client-Service Priority

Priority 1 authors waiting on JMP:

- Naughty Tales: developmental author-review package prepared in this pass; send requires Jackie approval.
- The General's Will and Last Testament: two-piece author-review package exists; actual send remains author-decision boundary.
- Before You Were Born: two-piece author-review package exists; actual send remains author-decision boundary.

Priority 2 titles one step from release:

- Strategies For Success: not ready for submission because production output folders for print and digital read back empty. Release-critical export, cover/election approval, metadata, ISBN, and final QA remain required.

Priority 3 active editorial or internal validation:

- The Intentional Leader
- The Long Watch
- Establishing Glory: The Library
- Why Faith Works For Some and Not For Others

Priority 4 intake and onboarding cleanup:

- All unresolved inquiry rows in `operational-register.csv`.

## Specific Title Outcomes

### Strategies For Success

Current status: near-release recovery, but not distribution-ready.

Evidence found:

- active SharePoint folder under /02_Active-Pipeline/04_Editorial/2026_Crowley_Strategies_For_Success;
- signed agreement evidence in the Crowley people/agreement folder;
- active folder agreement and package addendum;
- latest editorial candidate: 260529_d_StrategiesForSuccess.docx;
- Vellum source: Strategies_For_Success.vellum;
- distribution spreadsheets: JMerrill_PaperEbook.xlsx and JMerrill_PaperHardEbook.xlsx.

Blocking facts:

- Print production folder read back empty.
- Digital production folder read back empty.
- Cover election and final selected cover file were not proven in current SharePoint readback.
- Author approval was not proven in current evidence.
- ISBN assignment for each elected Product Form was not proven in this pass.

Boundary: JACKIE_APPROVAL_REQUIRED and AUTHOR_DECISION_REQUIRED.

Next valid action: Jackie confirms cover Option 2, Product Form elections, author approval, metadata, ISBNs, and permission to export final production files. Production then exports final paperback/hardcover/ebook files from Vellum and performs manual QA before any distribution submission.

### Naughty Tales

Current status: developmental author-review package prepared.

Evidence found:

- active SharePoint folder under /02_Active-Pipeline/04_Editorial/Stevette, Jaylonna - Naughty Tales;
- hold-folder manuscript archive under /02_Active-Pipeline/04_Editorial/06_Hold/2025-Stevette-NaughtyTales;
- latest manuscript candidate: 260303 Naughty Tales.docx, modified 2026-03-04;
- source checksum: e123ff3febe60c4c1b22f7ed96e5c51f5c956fcab62e6c7fb6e393c959adbfea.

Completed in this pass:

- corrected author-review manuscript with title and author filled in;
- consolidated Editorial Review Guide PDF;
- structural QA for no comments, no tracked changes, no internal markers, title and author correctness;
- DOCX render QA produced 145 manuscript pages;
- guide PDF render produced 2 pages.
- filed both deliverables in SharePoint under /02_Active-Pipeline/04_Editorial/Stevette, Jaylonna - Naughty Tales/02-MANUSCRIPT.

SharePoint filing:

- Author Review Manuscript: https://jmerrillfoundation.sharepoint.com/sites/publishing/_layouts/15/Doc.aspx?sourcedoc=%7BFF9927FB-16C4-4537-9349-4F2588899268%7D&file=naughty-tales-Author-Review-Manuscript.docx&action=default&mobileredirect=true
- Editorial Review Guide: https://jmerrillfoundation.sharepoint.com/sites/publishing/Shared%20Documents/02_Active-Pipeline/04_Editorial/Stevette,%20Jaylonna%20-%20Naughty%20Tales/02-MANUSCRIPT/naughty-tales-Editorial-Review-Guide.pdf

Boundary: AUTHOR_DECISION_REQUIRED after Jackie approves sending.

Next valid action: send the prepared package to Jaylonna Stevette using the prepared communication draft.

### The General's Will and Last Testament

Current status: author-review package ready, actual author-facing send not proven.

Evidence found:

- Program 008 SharePoint package folder;
- author-review manuscript DOCX;
- consolidated Editorial Review Guide PDF;
- active title folder under /01_Titles/02_Developmental-Editing.

Boundary: AUTHOR_DECISION_REQUIRED.

Next valid action: if Jackie approves send, deliver the existing two-piece package and request author review.

### Before You Were Born

Current status: author-review package ready, actual author-facing send not proven.

Evidence found:

- Program 008 SharePoint package folder;
- author-review manuscript DOCX;
- consolidated Editorial Review Guide PDF;
- active title folder under /01_Titles/02_Developmental-Editing.

Boundary: AUTHOR_DECISION_REQUIRED.

Next valid action: if Jackie approves send, deliver the existing two-piece package and request author review.

### Inquiry Cohort

The five named inquiry titles are reconciled:

- God Got Me: inquiry, not accepted/contracted in current evidence.
- Lucky Ducky: inquiry, not accepted/contracted in current evidence.
- February: inquiry, not accepted/contracted in current evidence.
- A Walk Home with God: dormant inquiry, author decision required.
- Inner Peace Through Life's Storms: dormant inquiry/backlist ambiguity, author decision required.

No accepted or contracted status was proven for those five in current evidence, so no folder movement was performed.

## Evidence

- `operational-register.csv`
- `strategies-for-success-release-critical-checklist.md`
- `inquiry-reconciliation.md`
- `author-deliverables/naughty-tales/naughty-tales-Author-Review-Manuscript.docx`
- `author-deliverables/naughty-tales/naughty-tales-Editorial-Review-Guide.pdf`
- `communications/naughty-tales-author-review-draft.md`
- `checksums.sha256`

## Stop State

Client-title automation remains FROZEN.

Client-title production remains MANUAL.

Runtime implementation: 0.

Schema changes: 0.

New architecture: 0.
