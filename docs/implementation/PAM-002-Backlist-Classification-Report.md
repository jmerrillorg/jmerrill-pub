# PAM-002 - Backlist Classification Report

**Status:** Planning / Classification only  
**Date:** 2026-07-07  

## Classification Model

| Class | Meaning | Examples | PAM Treatment |
| --- | --- | --- | --- |
| Source Manuscript | Author/source text evidence | `.docx`, `.doc`, `.rtf` | Link to Publishing Asset or Intellectual Work as source evidence |
| Production Output | Print/eBook/audiobook deliverables | `.pdf`, `.epub`, `.mp3` | Link to Publishing Asset / Marketplace readiness |
| Design/Production Working File | Cover/layout/design source | `.indd`, `.idml`, `.qxp`, `.psd`, `.ai` | Link as production evidence; preserve in SharePoint |
| Marketplace/Distribution Evidence | Upload/report/channel evidence | spreadsheets, client reports, ISBN folders | Link to Asset Marketplace and identifiers |
| Intake/Pre-Pipeline Evidence | Early-stage author/title artifacts | lead folders, intake docs | Link to Title/Contact only after identity validation |
| Duplicate/Generated Variant | Nimbus copies, repeated exports, old versions | repeated filenames, generated ePub variants | Do not delete; classify for later consolidation decision |

## Evidence Volume by Source

| Source | Exists | Directories | Files | Size | Dominant evidence groups |
| --- | ---: | ---: | ---: | ---: | --- |
| Olympus Backlist | True | 5475 | 6209 | 14.30 GB | image: 3528, manuscript: 1108, other: 557, pdf: 515, ebook: 346 |
| Archive Active Projects | True | 1576 | 60 | 0.01 GB | ebook: 30, manuscript: 20, pdf: 10 |
| Lead Intake | True | 656 | 4663 | 4.00 GB | manuscript: 1503, design: 1107, image: 508, other: 438, spreadsheet: 310 |
| Current Pipeline | True | 2147 | 10784 | 43.16 GB | manuscript: 3729, design: 1697, image: 1631, pdf: 1088, other: 815 |

## Risk Classification

| Risk | Severity | Notes |
| --- | --- | --- |
| Overlapping source trees | High | Lead Intake appears inside or adjacent to Current Pipeline; raw counts may double-count. |
| Historical author/title naming variance | High | Folder names use multiple formats and legacy names. Publisher Master Register should govern certified identity. |
| Duplicate generated files | Medium | Archive Active Projects and Current Pipeline include repeated `Nimbus` exports and variant ePubs. |
| Legacy design formats | Medium | QXP/QXD/CDR/INDD/IDML files require preservation even if not immediately editable. |
| Missing canonical Dataverse file references | High | PAM-002 must map files to Dataverse metadata without moving files during planning. |

## PAM Mapping

| File Evidence | Maps To |
| --- | --- |
| Author folder | Contact / author evidence candidate |
| Title folder | `jm1pub_title` / Intellectual Work candidate |
| ISBN folder | `jm1pub_publishingasset` candidate |
| ePub/PDF/print-ready file | Publishing Asset output evidence |
| Marketplace report/channel file | `jm1pub_assetmarketplace` evidence |
| Contract/payment folder | `jm1pub_contract` evidence candidate, pending contract reconciliation rules |
