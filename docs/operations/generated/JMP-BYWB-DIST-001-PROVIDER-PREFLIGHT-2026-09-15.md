# JMP-BYWB-DIST-001 Provider Distribution Preflight

Date: 2026-09-15
Repository: jmerrill-pub
Branch: codex/jmp-bywb-dist-001-provider-preflight
Baseline: origin/main
Execution model: clean-worktree, read-only provider/distribution preflight

## Scope Boundary

This manifest covers only the authorized distribution preflight for `Before You Were Born`.

No provider upload, distribution submission, publication activation, on-sale change, author communication, payment action, Bowker mutation, or Dataverse write was performed by this action.

## Canonical Authority

TITLE = Before You Were Born
AUTHOR = Sean Crowley / Sean Arron Crowley
AUTHOR_DISPLAY_DRIFT = FOUND
SUBTITLE_AUTHORITY = Discovering God's Plan for Your Life
SUBTITLE_ARTIFACT_READBACK = Discovering the Divine Blueprint for Your Life
SUBTITLE_DRIFT = FOUND
PACKAGE = Starter Package

AUTHORIZED_FORMATS_TOTAL = 2
AUTHORIZED_FORMATS = Paperback + eBook
PAPERBACK_AUTHORIZED = YES
EBOOK_AUTHORIZED = YES
HARDCOVER_AUTHORIZED = NO
AUDIO_AUTHORIZED = NO
OTHER_PROVIDER_FORMAT_AUTHORIZED = NO
LCCN_STATUS = INTENTIONALLY_NOT_PURSUED

## Hard Scope Guard

| Format / action | Status | Distribution action |
| --- | --- | --- |
| Paperback | Authorized | Preflight only |
| eBook | Authorized | Preflight only |
| Hardcover | Not authorized | Denied |
| Audio | Not authorized in this work package | Denied |
| Legacy Dataverse `Other` asset | Existing historical catalog row | Keep inert; do not map to provider product |
| LCCN | Intentionally omitted | No action |

UNAUTHORIZED_PROVIDER_ACTIONS = 0
UNAUTHORIZED_FORMAT_CREATION = 0
UNAUTHORIZED_HARDCOVER_RECORDS_CREATED = 0

## Identifier Evidence

| Format | ISBN | Normalized ISBN | Status |
| --- | --- | --- | --- |
| Paperback | 978-1-961475-86-1 | 9781961475861 | PASS |
| eBook | 978-1-961475-87-8 | 9781961475878 | PASS |
| Hardcover | Not applicable | Not applicable | DENIED |

ISBN_DUPLICATION = 0 for ISBN-bearing Dataverse asset rows inspected.

## Provider Route Readback

| Format | Primary route | Current readiness |
| --- | --- | --- |
| Paperback | CoreSource to LSI POD | BLOCKED pending full-wrap cover, retail metadata, and CoreSource-to-LSI safe-publication authority |
| eBook | CoreSource | BLOCKED pending canonical upload artifact selection, complete metadata, and final provider readiness |
| Backup print route | IngramSpark | Not active without separate authority |

Provider authority is based on existing distribution records identifying Ingram/CoreSource as canonical distribution infrastructure and `JMP-DIST-004-CORESOURCE-RUNTIME-2026-09-12` as the current CoreSource runtime boundary.

CORESOURCE_SUPPORT_TICKET = 5862952
CORESOURCE_PUBLIC_EFFECT_BOUNDARY = NOT_PROVEN
SAFE_NONPUBLIC_CANARY = NOT_AVAILABLE

## Paperback Artifact Readback

PAPERBACK_INTERIOR_FOUND = YES
PAPERBACK_INTERIOR_ARTIFACT = `/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/JM1-PUB/01_Pipeline_A-Z/09 - Copyediting/Crowley, Sean - Before You Were Born/Before You Were Born/Print/Before-You-Were-Born-Print-2026-09-15-v1.2.pdf`
PAPERBACK_INTERIOR_CHECKSUM = 623a2605d48e19a03ef5e3dd5d82494897b26c3c5f3e7cec338126bfb53f0e56
PAPERBACK_TRIM_SIZE = 6 x 9 inches
PAPERBACK_PAGE_COUNT = 102
PAPERBACK_PDF_ENCRYPTED = NO
PAPERBACK_COPYRIGHT_IDENTIFIER_BLOCK = PASS
PAPERBACK_HARDCOVER_TEXT_PRESENT = NO
PAPERBACK_LCCN_TEXT_PRESENT = NO

PAPERBACK_FONT_EMBEDDING = PARTIAL
PAPERBACK_FONT_EMBEDDING_NOTE = Base `Times-Roman` is not embedded; other inspected fonts are embedded/subset.
PAPERBACK_IMAGE_DPI_READBACK = PASS for detected images at approximately 300 ppi.

PAPERBACK_FULL_WRAP_COVER_FOUND = NO
PAPERBACK_COVER_BARCODE_VERIFIED = NO
PAPERBACK_COVER_SPINE_BLEED_SAFEZONE_VERIFIED = NO
PAPERBACK_PROVIDER_READY = NO

## eBook Artifact Readback

EBOOK_ARTIFACTS_FOUND = YES
EBOOK_CANONICAL_CORESOURCE_UPLOAD_ARTIFACT_SELECTED = NO

| Export | Artifact | SHA256 | Deterministic readback |
| --- | --- | --- | --- |
| Apple Books | `/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/JM1-PUB/01_Pipeline_A-Z/09 - Copyediting/Crowley, Sean - Before You Were Born/Before You Were Born/Apple Books/Before-You-Were-Born-Apple-2026-09-15.epub` | `d3e924e5a31ec6257452172e2394201c9597b6382459d6b7acb739fa4a3df5df` | ZIP/OPF/PACKAGE PASS |
| Google Play | `/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/JM1-PUB/01_Pipeline_A-Z/09 - Copyediting/Crowley, Sean - Before You Were Born/Before You Were Born/Google Play/Before-You-Were-Born-Google-2026-09-15.epub` | `5f489e116b0449c2728728eba3b21ff3f112c75bdca6e2de0307ee5cbcb20de4` | ZIP/OPF/PACKAGE PASS |
| Kindle | `/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/JM1-PUB/01_Pipeline_A-Z/09 - Copyediting/Crowley, Sean - Before You Were Born/Before You Were Born/Kindle/Before-You-Were-Born-Kindle-2026-09-15.epub` | `121e670f8990a47476b99c0a0ef300ee98a449e2e532aba801f82ed3d3190df3` | ZIP/OPF/PACKAGE PASS |
| Kobo | `/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/JM1-PUB/01_Pipeline_A-Z/09 - Copyediting/Crowley, Sean - Before You Were Born/Before You Were Born/Kobo/Before-You-Were-Born-Kobo-2026-09-15.kepub.epub` | `4f3c897c9feb8254b636b0968cdf5a3a9058c52d6ad2feff53241b330bf91369` | ZIP/OPF/PACKAGE PASS |
| Nook | `/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/JM1-PUB/01_Pipeline_A-Z/09 - Copyediting/Crowley, Sean - Before You Were Born/Before You Were Born/Nook/Before-You-Were-Born-Nook-2026-09-15.epub` | `54293d39be847877dec09459a11bdb39c50aa6a7056fd9a864262ffefa339e81` | ZIP/OPF/PACKAGE PASS |

EPUB_IDENTIFIER = 9781961475878
EPUB_TITLE_READBACK = Before You Were Born: Discovering the Divine Blueprint for Your Life
EPUB_AUTHOR_READBACK = Sean Arron Crowley, I
EPUB_PUBLISHER_READBACK = J Merrill Publishing Inc
EPUB_NAV_PRESENT = YES
EPUBCHECK_RUN = NO
EPUB_ACCESSIBILITY_CAVEAT = Present metadata reports images have not been verified and integral images do not have alternate text.
EBOOK_PROVIDER_READY = NO

## Dataverse Readback

DATAVERSE_TITLE_ID = 91c5e1ef-2980-f111-ab0f-7c1e525b15c2
DATAVERSE_TITLE_NAME = Before You Were Born
DATAVERSE_AUTHOR_READBACK = Sean Crowley

| Asset | Format | ISBN | Distribution status | Readback |
| --- | --- | --- | --- | --- |
| 24716f8b-f4b0-f111-aaac-00224820105b | Paperback | 978-1-961475-86-1 | Draft | PASS |
| 07f99887-f4b0-f111-aaac-6045bdd69678 | eBook | 978-1-961475-87-8 | Draft | PASS |
| 48896dd1-2f80-f111-ab0f-00224820105b | Other | None | Draft | LEGACY / KEEP INERT |

DATAVERSE_ISBN_BEARING_ASSETS_TOTAL = 2
DATAVERSE_HARDCOVER_ASSET_FOUND = NO
DATAVERSE_UNAUTHORIZED_ASSET_CREATION_BY_THIS_ACTION = 0

## Blocking Items

| Blocker | Reason | Required next action |
| --- | --- | --- |
| Full-wrap paperback cover missing | POD print cannot pass provider preflight without cover, barcode, spine, bleed, and safe-zone evidence. | Produce or locate governed 6 x 9 full-wrap cover package for ISBN 978-1-961475-86-1. |
| Subtitle drift | Identifier authority says `Discovering God's Plan for Your Life`; artifacts read `Discovering the Divine Blueprint for Your Life`. | Founder/title authority decision: ratify artifact subtitle or regenerate artifacts to canonical subtitle. |
| Author display drift | Authority says `Sean Arron Crowley`; Dataverse title says `Sean Crowley`; artifacts say `Sean Arron Crowley, I`. | Ratify provider-facing author display name before submission. |
| eBook canonical upload artifact not selected | Multiple channel-specific EPUB exports exist; CoreSource upload source is not uniquely chosen. | Select or generate one governed CoreSource eBook upload artifact. |
| EPUBCheck not completed | ZIP/OPF checks passed, but formal EPUBCheck evidence is absent. | Run EPUBCheck or record unavailable-tool exception with acceptance authority. |
| Retail metadata incomplete | Retail price, publication/on-sale date, BISAC/keywords/description/audience/territories are not fully proven in this preflight. | Complete governed distribution metadata sheet before provider entry. |
| CoreSource-to-LSI safe publication boundary unresolved | Provider public-effect/safe nonpublic behavior is not proven. | Resolve CoreSource support ticket 5862952 or obtain explicit controlled-submission authority. |
| Legacy `Other` asset exists | Historical non-format-specific asset could be misbound if used operationally. | Keep inert and exclude from provider mapping. |

## Classification

JMP_BYWB_DIST_001_PREFLIGHT = JMP_BYWB_DIST_001_BLOCKED
JMP_BYWB_DIST_001_FAILURE = NO
JMP_BYWB_DIST_001_BLOCKING_REASON = Authorized assets exist, but provider-ready distribution package is incomplete and title/metadata authority is not yet clean enough for submission.

DISTRIBUTION_READY = NO
PAPERBACK_PROVIDER_READY = NO
EBOOK_PROVIDER_READY = NO
HARDCOVER_PROVIDER_ACTION_ALLOWED = NO

## Return

TITLE = Before You Were Born
AUTHOR = Sean Crowley / Sean Arron Crowley
PACKAGE = Starter Package
AUTHORIZED_FORMATS_TOTAL = 2
PAPERBACK_AUTHORIZED = YES
PAPERBACK_ISBN = 978-1-961475-86-1
EBOOK_AUTHORIZED = YES
EBOOK_ISBN = 978-1-961475-87-8
HARDCOVER_AUTHORIZED = NO
LCCN_STATUS = INTENTIONALLY_NOT_PURSUED
PAPERBACK_INTERIOR_READY = YES
PAPERBACK_FULL_WRAP_COVER_READY = NO
EBOOK_ARTIFACTS_PRESENT = YES
EBOOK_CANONICAL_UPLOAD_ARTIFACT_SELECTED = NO
DATAVERSE_AUTHORIZED_ASSETS_READY = PARTIAL
PROVIDER_PREFLIGHT_STATUS = BLOCKED
DISTRIBUTION_READY = NO
NEXT_GATE = Resolve cover, title/author display, canonical EPUB, metadata, and CoreSource public-effect authority before any provider action.

DATAVERSE_MUTATIONS_BY_THIS_ACTION = 0
PROVIDER_MUTATIONS_BY_THIS_ACTION = 0
DISTRIBUTION_SUBMISSIONS_BY_THIS_ACTION = 0
AUTHOR_COMMUNICATIONS_BY_THIS_ACTION = 0
PAYMENT_ACTIONS_BY_THIS_ACTION = 0
