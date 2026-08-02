# Title-Pubs Canonical Identifier Model

Status: CANONICAL
Date: 2026-07-27
Execution correlation: `TITLEPUBS-CANON-20260727T131004Z`

## Authority

The JM1 ISBN-Title-Author Register is the controlling authority for edition-level title authorship within J Merrill Publishing. Each ISBN or approved distribution identifier represents an edition or format record. Conflicting historical inference, royalty-manifest text, adoption evidence, or name-based matching must not override a relationship resolved by the register. Dataverse Title-Pubs is the operational implementation of this authority.

Authority boundaries:

| Domain | Authority |
| --- | --- |
| Financial authority | Business Central |
| Catalog identifier, title, and authorship authority | Dataverse Title-Pubs |
| Canonical party identity | Contact |
| Author-to-title business relationship | Publishing Relationship |

Title-Pubs is not a royalty ledger.

## Dataverse Model

Table: `jm1pub_title`
Entity set: `jm1pub_titles`

Legacy compatibility fields retained:

| Purpose | Logical name |
| --- | --- |
| Title Name | `jm1pub_titlename` |
| Author Name | `jm1pub_authorname` |
| ISBN | `jm1_isbn` |
| ISBN Normalized | `jm1_isbnnormalized` |

Canonical identifier fields:

| Purpose | Logical name |
| --- | --- |
| Catalog Identifier | `jm1_catalogidentifier` |
| Catalog Identifier Normalized | `jm1_catalogidentifiernormalized` |
| Identifier Type | `jm1_identifiertype` |
| Source Authority | `jm1_sourceauthority` |
| Canonical Status | `jm1_canonicalstatus` |
| Source Effective Date | `jm1_sourceeffectivedate` |
| Reconciliation Correlation ID | `jm1_reconciliationcorrelationid` |
| Canonical Title Reference | `jm1_canonicaltitlereference` |
| Canonical Author Contact | `jm1_canonicalauthorcontactreference` |

`jm1_isbn` remains a legacy compatibility field and is limited to 13 characters. `jm1_isbnnormalized` remains retained but superseded for canonical duplicate-control purposes because it is read-only, non-filterable, and has no functioning formula definition.

## Normalization

Identifier type values:

- `ISBN-13`
- `ISBN-10`
- `ACX`
- `Legacy/Internal`
- `Other`

Normalization rules:

- ISBN-13: remove hyphens, spaces, and punctuation; preserve digits.
- ISBN-10: preserve digits only.
- ACX: preserve the original display value and normalize by removing punctuation and uppercasing, such as `BK_ACX0_172577` to `BKACX0172577`.
- Legacy/Internal and Other: remove non-alphanumeric punctuation, uppercase, and do not fabricate ISBN check digits.

## Migration Result

| Metric | Count |
| --- | ---: |
| Original supplied rows | 411 |
| True blank/reserved rows | 116 |
| Legitimate catalog rows | 295 |
| Imported rows in this pass | 0 |
| Updated rows in this pass | 295 |
| Unchanged rows | 0 |
| Source duplicates | 0 |
| Dataverse duplicates | 0 |
| Retired/superseded rows | 40 |
| Active canonical rows | 295 |
| Unresolved exceptions | 0 |
| Blank original identifiers | 0 |
| Blank normalized identifiers | 0 |
| Blank titles | 0 |
| Blank authors | 0 |
| Unsupported legitimate identifier types | 0 |
| Duplicate active normalized identifiers | 0 |
| Identifier-to-author conflicts | 0 |
| Identifier-to-title conflicts | 0 |

The 116 previously skipped rows were reprocessed and classified as true blank/reserved rows because the supplied rows contained identifiers without title and author values. They remain excluded from the canonical catalog count and preserved in evidence with row positions and reasons.

## Duplicate Control

Active duplicate validation is complete: no active normalized identifier resolves to multiple title-author combinations.

The operational import uses prewrite idempotent upsert keyed by `jm1_catalogidentifiernormalized`. A Dataverse alternate key was not deployed in this pass because managed solution-layer confirmation is still required for the new fields and active-only uniqueness policy. The next managed-solution step is to add an alternate key or duplicate-detection rule for `jm1_catalogidentifiernormalized`, preserving retired/superseded historical traceability.

## View And Form Package

The canonical field model is available on `jm1pub_title` for governed model-driven app packaging. The remediation evidence defines the required view/form package for the next managed-solution update:

- Canonical Title-Pubs Register
- Identifier Exceptions
- Duplicate-Identifier Review
- Unlinked Canonical Authors
- Unlinked Canonical Titles
- Retired/Superseded Identifier Records

No unmanaged UI publish was performed in this pass.

## Confirmed Authorship

Carolyn Booker-Pierce's six canonical titles:

1. Abortion!
2. Because the Lord Is My Shepherd
3. Girl, You're Not Crazy. You're Dealing with a Narcissist
4. Loving the Addict
5. More Than a Village
6. You're Still Not Crazy

Additional closed decisions:

- `A Little Bit of Everything` belongs to Eryonna Barrino.
- `A Truebies Guide, Part 1` belongs to Alesia Corpening.
- `A Truebies Guide, Part 2` belongs to Alesia Corpening.

## Evidence

Primary evidence:

`/Volumes/UsersExternal/JM1/_EVIDENCE/TITLE-PUBS-REGISTER/2026-07-27/TITLEPUBS-CANON-20260727T131004Z/title-pubs-canonical-identifier-remediation.json`

SHA-256:

`919800f9a98cd5bc6d87e6971b7b8303545bd537419f8689578c9fb968bd4c0c`

Execution logs:

- `TITLE_PUBS_SCHEMA_REMEDIATION_STARTED`: `1032b17a-bc89-f111-ab10-7c1e525b15c2`
- `TITLE_PUBS_SCHEMA_REMEDIATION_COMPLETED`: `58fce6a7-bc89-f111-ab10-6045bdd69678`
- `TITLE_PUBS_SOURCE_ROWS_RECONCILED`: `df10bda6-bc89-f111-ab10-7c1e525b15c2`
- `TITLE_PUBS_IDENTIFIER_MIGRATED`: `60b512bf-bc89-f111-ab10-7c1e525b15c2`
- `TITLE_PUBS_DUPLICATE_CONTROL_ENABLED`: `6d812fc0-bc89-f111-ab10-6045bdd69678`
- `TITLE_PUBS_CANONICAL_VALIDATION_COMPLETED`: `6f812fc0-bc89-f111-ab10-6045bdd69678`

Rollback evidence includes pre-change row export, pre-change attribute metadata, dependency inventory, and post-change schema metadata in the same evidence folder.
