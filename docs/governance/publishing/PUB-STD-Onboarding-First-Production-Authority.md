# PUB-STD: Onboarding-First Production Authority

Status: CANON
Version: 1.0
Approved authority: Founder authorization, 2026-08-25
Scope: J Merrill Publishing production authority, author-selectable title preferences, genre/book-type production defaults, Full Wrap preparation, and conditional commercial metadata.

## Purpose

JMP production configuration must preserve author intent while allowing production to move without unnecessary Publisher gates. Author-selectable production attributes are resolved from author onboarding first, then governed genre/book-type defaults, then a narrow JMP production exception when neither source is safe.

## Authority Hierarchy

For author-selectable physical-production attributes:

1. Valid author onboarding selection
2. Governed genre or book-type default
3. Governed JMP production exception

Genre defaults are fallback authority only. They must not silently override a valid author selection.

For lifecycle-derived title authorities:

| Attribute | Authority |
| --- | --- |
| Final trim | Author onboarding selection or recovered title-specific trim authority |
| Final page count | Current approved final interior proof |
| Imprint | Editorial Review or title imprint authority |
| Final back-cover copy | Jackie / Publisher approval |
| ISBN | Publication intent, format, edition, and distribution requirement |
| Barcode | ISBN and public-distribution requirement |
| Distribution path | Publication intent and governed distribution routing |

## Provenance

Every resolved production attribute must preserve:

- attribute
- value
- authority source
- source record or artifact where applicable
- resolved timestamp

Allowed authority sources:

- `AUTHOR_ONBOARDING`
- `GENRE_DEFAULT`
- `LIFECYCLE_AUTHORITY`
- `DERIVED_VALUE`
- `JMP_EXCEPTION`

## Publication Intent

Supported publication-intent categories:

- `COMMERCIAL_RELEASE`
- `COMMISSIONING`
- `INTERNAL`
- `PROTOTYPE`
- `PROOF`
- `ARCHIVAL`
- `NON_RELEASE`
- `ARCHIVAL_NON_RELEASE`

For `COMMISSIONING`, `INTERNAL`, `PROTOTYPE`, `PROOF`, `ARCHIVAL`, `NON_RELEASE`, and `ARCHIVAL_NON_RELEASE`:

- ISBN is not universally required.
- Barcode is not universally required.
- Distribution path is not universally required.
- Publication launch is not required.
- Full Wrap may proceed without fake commercial placeholders when all true title/production authorities are present.

For `COMMERCIAL_RELEASE`, ISBN, barcode, and distribution requirements remain enforced according to edition, format, and channel policy.

## Genre / Book-Type Production Profiles

The current runtime profile framework supports:

- Standard text-forward nonfiction
- Leadership / business
- Memoir
- Devotional
- Poetry
- Novel / narrative fiction
- Children's picture book
- Workbook / journal

Profile defaults for paper, finish, construction, and interior mode are `CANON-CANDIDATE` physical defaults unless already recovered from a more specific title, provider, or production authority. They may resolve unanswered author-selectable attributes but may not override valid author selections.

## Back-Cover Copy

Back-cover copy follows this authority chain:

1. Governed title, manuscript, editorial, marketing, and author-source evidence
2. Draft prepared by Chad / ChatGPT or Claude / Claude AI
3. Jackie / Publisher review
4. Approved back-cover copy persisted
5. Full Wrap consumes approved copy

Cody, CeCe, Copilot, or other executors may prepare evidence and apply approved copy. They may not silently generate final marketing copy or self-approve generated copy.

## Full Wrap Contract

Full Wrap consumes four classes of inputs:

| Class | Examples |
| --- | --- |
| Title-specific authorities | Trim, imprint, final page count, front cover, interior proof, approved back-cover copy |
| Author-selectable / fallback attributes | Interior mode, paper color, paper stock, paper weight, cover finish, hardcover construction |
| Derived values | Spine width, full-wrap dimensions, bleed, safe areas |
| Conditional commercial values | ISBN, barcode, distribution path |

Full Wrap must fail closed on missing trim authority, final approved proof/page count, imprint, approved front cover, current interior proof, approved back-cover copy, or provider-incompatible physical configuration.

Full Wrap must not fail closed merely because a non-release/commissioning title lacks ISBN, barcode, or distribution metadata.

## The Intentional Leader

The Intentional Leader, Volume I is a commissioning / non-release title. Its Full Wrap must not consume ISBN inventory, generate barcode metadata, create distribution records, or schedule publication launch merely to satisfy a generic commercial Full Wrap contract.
