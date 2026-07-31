# Workspace Disposition Plan

Read-before-write status: complete enough to identify stop conditions.

No SharePoint folders were moved, renamed, deleted, archived, or quarantined during this pass.

## Proposed Safe Movements After Approval Gates

| Workspace | Current Path | Proposed Target | Proposed Action | Risk | Reason |
|---|---|---|---|---|---|
| Establishing Glory: The Library | `01_Titles/01_Editorial-Review/Compilation-Reconciliation/2024-Smith-EstablishingGloryTheLibrary` | `01_Titles/02_Developmental-Editing/JMP-INT-202606-UFYG6O - Jackie Smith Jr - Establishing Glory: The Library/2024-Smith-EstablishingGloryTheLibrary` | Move and update Dataverse asset path/package reference | Medium | Live title is in Developmental Editing; folder label makes it appear synthetic or editorial-only |
| The Long Watch | `01_Titles/01_Editorial-Review/JMP-INT-202607-6R2MPZ - Jackie Smith Jr - The Long Watch` | `01_Titles/02_Developmental-Editing/JMP-INT-202607-6R2MPZ - Jackie Smith Jr - The Long Watch` | Move and update Dataverse asset path/package reference | Medium | Dataverse active stage is Developmental Editing |
| The Intentional Leader | `01_Titles/05_Proofreading/JMP-INT-202607-0W5PTQ - Jackie Smith jr - The Intentional Leader` | Production interior-layout lane, after package artifact completion | Move or create canonical production workspace only after package handoff blocker clears | High | Existing Proofreading folder contains prior-stage evidence; current active handoff is blocked |
| The Intentional Leader Inquiry duplicate | `01_Pre-Pipeline/00_Inquiry/JMP-INT-202607-0W5PTQ - Jackie Smith jr - The Intentional Leader` | Canonical title archive or governed duplicate-evidence folder | Preserve/merge unique `20_Editorial/05_Proofreading` evidence; do not delete blindly | High | Duplicate contains unique evidence-sized content |
| Gate W1 and JM1 synthetic Inquiry folders | `01_Pre-Pipeline/00_Inquiry/JMP-INT-202607-* Synthetic*`, `Gate W1*`, `_certification` | Governed nonproduction evidence location | Quarantine/move after dependency check | Medium | Certification assets may be referenced by GATE evidence; deletion is not safe without dependency review |
| Template folder | `01_Pre-Pipeline/00_Inquiry/_YYYY_AuthorLastName_Short_Title_Slug_TEMPLATE` | Governed template location | Move after confirming target template root | Low | Template should not live in active production Inquiry |

## Inquiry Population Snapshot

Inquiry currently includes:

- real dormant/active inquiries;
- `_Backlist`;
- `_certification`;
- template folder;
- The Intentional Leader duplicate active Inquiry folder;
- multiple GATE-W1 / JM1 synthetic certification folders;
- Carolyn live/title-related folder;
- Atta Boateng active Inquiry folder.

## Required Pre-Move Controls

Before any movement:

1. preserve before-state item IDs, paths, modified timestamps, and sizes;
2. verify no workflow depends on the old path;
3. verify every title code and target stage;
4. preserve unique evidence before duplicate archival;
5. update Dataverse asset paths and package references in the same governed transaction window;
6. write execution log evidence;
7. verify Publisher OC, Author OC, SharePoint, and Dataverse agree after movement.

