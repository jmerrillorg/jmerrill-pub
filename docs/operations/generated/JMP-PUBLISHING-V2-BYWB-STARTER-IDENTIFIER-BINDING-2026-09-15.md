# JMP Publishing V2 BYWB Starter Identifier Binding

Date: 2026-09-15
Stream: JMP Publishing V2 - BYWB Identifier Binding + Starter Package Production Refresh
Execution model: founder-authorized two-format Starter Package identifier binding
Author communications sent by this action: 0
Provider/distribution mutations by this action: 0

## Supersession Authority

This record supersedes prior three-format planning assumptions for `Before You Were Born`.

Earlier records treated the package as requiring:

- Paperback
- Hardcover
- eBook

Founder correction:

BYWB_PACKAGE = STARTER PACKAGE
AUTHORIZED_FORMATS_TOTAL = 2
AUTHORIZED_FORMATS = Paperback + eBook
HARDCOVER_AUTHORIZED = NO
LCCN_STATUS = INTENTIONALLY_NOT_PURSUED

The earlier hardcover planning rows remain historical evidence only. They are not current source authority for production, catalog registration, Bowker, Dataverse, CoreSource, SharePoint, SKU, or distribution work.

## Canonical Title Authority

TITLE = Before You Were Born
SUBTITLE = Discovering God's Plan for Your Life
AUTHOR = Sean Arron Crowley
AUTHOR_DISPLAY_NOTE = Prior Dataverse readback currently shows `Sean Crowley`; founder title authority for this workstream states `Sean Arron Crowley`.
PACKAGE = STARTER PACKAGE

Identifier-only production refresh did not reopen editorial content, interior layout design, proof approval, or author-facing approval.

## Identifier Map

BYWB_IDENTIFIER_AUTHORITY = PASS

| Format | ISBN | Normalized ISBN | Authority |
| --- | --- | --- | --- |
| Paperback | 978-1-961475-86-1 | 9781961475861 | Founder supplied / Bowker assigned |
| eBook | 978-1-961475-87-8 | 9781961475878 | Founder supplied / Bowker assigned |
| Hardcover | Not authorized | Not applicable | Founder correction |
| LCCN | Intentionally omitted | Not applicable | Founder correction |

UNAUTHORIZED_HARDCOVER_RECORDS_CREATED = 0
HARDCOVER_MASTER_CREATED = NO
HARDCOVER_SKU_CREATED = NO
HARDCOVER_DISTRIBUTION_CREATED = NO
LCCN_CREATED = NO

## Production Refresh

Refresh scope:

- Copyright-page identifier block only
- Paperback ISBN insertion
- eBook ISBN insertion
- LCCN omission
- Hardcover omission

No manuscript text rewrite, title-page rewrite, subtitle rewrite, editorial stage transition, cover modification, or author communication occurred.

## Refreshed Paperback / Print Artifacts

PRINT_PDF_READY = YES
COPYRIGHT_PAGE_REFRESH = PASS
PDF_VISUAL_QA = PASS
PDF_PLACEHOLDERS_REMAINING = 0

| Artifact | SHA256 |
| --- | --- |
| `/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/JM1-PUB/01_Pipeline_A-Z/09 - Copyediting/Crowley, Sean - Before You Were Born/Before You Were Born/Print/Before-You-Were-Born-Print-2026-09-15-v1.2.pdf` | `623a2605d48e19a03ef5e3dd5d82494897b26c3c5f3e7cec338126bfb53f0e56` |
| `/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/JM1-PUB/01_Pipeline_A-Z/09 - Copyediting/Crowley, Sean - Before You Were Born/11 - Interior Layout/Before-You-Were-Born-Print-2026-09-15-v1.2.pdf` | `623a2605d48e19a03ef5e3dd5d82494897b26c3c5f3e7cec338126bfb53f0e56` |

PDF copyright-page readback:

- ISBNs present: YES
- Paperback ISBN present: YES
- eBook ISBN present: YES
- Hardcover text present: NO
- LCCN text present: NO
- Pending placeholders present: NO

## Refreshed eBook Artifacts

EBOOK_READY = YES
EPUB_COPYRIGHT_PAGE_REFRESH = PASS
EPUB_OPF_IDENTIFIER_REFRESH = PASS
EPUB_PLACEHOLDERS_REMAINING = 0

| Artifact | SHA256 |
| --- | --- |
| `/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/JM1-PUB/01_Pipeline_A-Z/09 - Copyediting/Crowley, Sean - Before You Were Born/Before You Were Born/Apple Books/Before-You-Were-Born-Apple-2026-09-15.epub` | `d3e924e5a31ec6257452172e2394201c9597b6382459d6b7acb739fa4a3df5df` |
| `/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/JM1-PUB/01_Pipeline_A-Z/09 - Copyediting/Crowley, Sean - Before You Were Born/Before You Were Born/Google Play/Before-You-Were-Born-Google-2026-09-15.epub` | `5f489e116b0449c2728728eba3b21ff3f112c75bdca6e2de0307ee5cbcb20de4` |
| `/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/JM1-PUB/01_Pipeline_A-Z/09 - Copyediting/Crowley, Sean - Before You Were Born/Before You Were Born/Kindle/Before-You-Were-Born-Kindle-2026-09-15.epub` | `121e670f8990a47476b99c0a0ef300ee98a449e2e532aba801f82ed3d3190df3` |
| `/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/JM1-PUB/01_Pipeline_A-Z/09 - Copyediting/Crowley, Sean - Before You Were Born/Before You Were Born/Kobo/Before-You-Were-Born-Kobo-2026-09-15.kepub.epub` | `4f3c897c9feb8254b636b0968cdf5a3a9058c52d6ad2feff53241b330bf91369` |
| `/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/JM1-PUB/01_Pipeline_A-Z/09 - Copyediting/Crowley, Sean - Before You Were Born/Before You Were Born/Nook/Before-You-Were-Born-Nook-2026-09-15.epub` | `54293d39be847877dec09459a11bdb39c50aa6a7056fd9a864262ffefa339e81` |

EPUB deterministic readback:

- Copyright page has Paperback ISBN: YES
- Copyright page has eBook ISBN: YES
- OPF has eBook ISBN identifier: YES
- Copyright page has Hardcover: NO
- Copyright page has LCCN: NO
- Placeholder tokens remain: NO

EPUBCHECK_RUN = NO
EPUB_QA_LIMITATION = ZIP/XHTML/OPF deterministic inspection only.

## Dataverse Catalog Registration

CATALOG_REGISTRATION_SYSTEM = Dataverse publishing asset records
CATALOG_REGISTRATION = PASS

Title readback:

DATAVERSE_TITLE_ID = 91c5e1ef-2980-f111-ab0f-7c1e525b15c2
DATAVERSE_TITLE_NAME = Before You Were Born
DATAVERSE_AUTHOR_READBACK = Sean Crowley

Duplicate ISBN precheck:

ISBN_DUPLICATE_ROWS_BEFORE_CREATE = 0

Created asset rows:

| Format | Dataverse asset id | Asset name | Status | Distribution status |
| --- | --- | --- | --- | --- |
| Paperback | 24716f8b-f4b0-f111-aaac-00224820105b | Before You Were Born - Paperback - 9781961475861 | Staged | Draft |
| eBook | 07f99887-f4b0-f111-aaac-6045bdd69678 | Before You Were Born - eBook - 9781961475878 | Staged | Draft |

Existing nonspecific asset retained:

| Dataverse asset id | Asset name | Format | Status | Distribution status |
| --- | --- | --- | --- |
| 48896dd1-2f80-f111-ab0f-00224820105b | Before You Were Born | Other | Staged | Draft |

UNAUTHORIZED_DATAVERSE_HARDCOVER_RECORDS_CREATED = 0

## Distribution Boundary

DISTRIBUTION_READY = NO
READINESS_REASON = Distribution is not authorized by identifier binding alone. CoreSource/provider upload, channel metadata, and title-specific distribution preflight remain separate governed gates.

No CoreSource upload, distribution retry, channel activation, publication status change, Bowker mutation, or author-facing communication occurred in this action.

## Return

BYWB_PACKAGE = STARTER PACKAGE
AUTHORIZED_FORMATS_TOTAL = 2
PAPERBACK_AUTHORIZED = YES
PAPERBACK_ISBN = 978-1-961475-86-1
PAPERBACK_NORMALIZED_ISBN = 9781961475861
EBOOK_AUTHORIZED = YES
EBOOK_ISBN = 978-1-961475-87-8
EBOOK_NORMALIZED_ISBN = 9781961475878
HARDCOVER_AUTHORIZED = NO
HARDCOVER_ISBN = NOT_APPLICABLE
LCCN_STATUS = INTENTIONALLY_NOT_PURSUED
IDENTIFIER_AUTHORITY = PASS
COPYRIGHT_PAGE_REFRESH = PASS
PAPERBACK_READY = YES
EBOOK_READY = YES
CATALOG_REGISTRATION = PASS
UNAUTHORIZED_HARDCOVER_RECORDS_CREATED = 0
DISTRIBUTION_READY = NO
NEXT_GATE = CoreSource/provider distribution preflight for authorized Paperback and eBook only
