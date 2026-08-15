# Title Requirement Policy

Last verified: 2026-08-15T10:35:00-04:00

## Working Title Acceptable

The centralized policy allows `Untitled` / `WORKING_TITLE` for:

- `EDITORIAL_REVIEW`
- `DEVELOPMENTAL_EDITING`
- `LINE_EDITING`
- `COPYEDITING`
- `PROOFREADING`

Author title selection is nonblocking in these processes.

## Final Title Required

The centralized policy requires a final approved title for:

- `ISBN_ASSIGNMENT`
- `DISTRIBUTOR_METADATA`
- `FINAL_COVER_PRODUCTION`
- `RETAILER_METADATA`
- `LEGAL_TITLE_SPECIFICITY`
- `PUBLICATION_METADATA`

Those are downstream title-dependent gates and must not be imposed on Stage 0 or Editorial Review dispatch.

## Negative Proof

- scattered `if title == "Untitled"` dispatch blockers: 0
- `TITLE_NOT_FINAL_FOR_AUTHOR_REVIEW` blockers in source: 0
- Jackie gates created merely for missing final title: 0
