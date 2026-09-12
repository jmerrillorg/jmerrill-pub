# JMP-DIST-004 Final Provider Authority Reconciliation

Date: 2026-09-12
Mode: bounded read-only provider/account reconciliation plus repo evidence update

## Classification

`JMP_DIST_004_PARTIAL`

This pass reduced the remaining gaps to exact buckets, but it did not reach clean closure. Internally actionable runtime work remains green. Provider/account authority is improved. Clean closure is still blocked by external-provider authority and incomplete route ownership proof.

No provider mutation, upload, retry, title creation, credential copy, public product creation, or on-sale product creation occurred.

## CoreSource Safe-State Authority

CoreSource is authenticated for Jackie Smith / J Merrill Publishing, Inc.

Current dashboard readback:

| Field | Readback |
| --- | --- |
| Number of distributions | 161 |
| Missing content | 0 assets |
| Number of assets | eBook 118; Print 51; Audio 5 |
| Active users | 1 |
| Failed distributions attention | 17 title groups |
| Missing front-cover attention | 5 title groups |

Advanced Search exposes these relevant controls:

| Area | Current provider-native fields observed | Safe nonpublic canary conclusion |
| --- | --- | --- |
| Basic | ISBNs or Asset IDs, Product Form, Product Form Detail, Format Category, Asset Type, Publishing Status, Is Distributable Yes/No, Asset Status Active/Inactive, Has Content | Searchable state exists, but not public-effect authority |
| Sales Rights | Exclusive, Non-exclusive, multiple Not-for-sale territory expressions, territory include/exclude fields | Not-for-sale concepts exist, but safe ingestion/public-effect combination not proven |
| Supply Terms | Discount code, sales restriction type, returns code | Sales restriction concepts exist, but safe ingestion/public-effect combination not proven |
| Distribution | Distribution channel filtering and "not distributed to this channel" search mode | Search/filter state only; not a canary firewall |

August 2026 CoreSource release-note readback states that CoreSource-to-Lightning Source enhancements are still planned, including Australian, Global Connect, and Sharjah pricing/market eligibility data, closing metadata gaps required for Lightning Source title setup, and reviewing Lightning Source title statuses directly in CoreSource UI.

`CORESOURCE_SUPPORTS_NONPUBLIC_INGESTED_RECORD = EXTERNAL_PROVIDER_CONFIRMATION_PENDING`

`SAFE_NONDISTRIBUTABLE_CANARY_STATE = EXTERNAL_PROVIDER_RESPONSE_PENDING`

`SAFE_CANARY_FIELDS = NOT_PROVEN_BY_PORTAL_CONTROLS`

## CoreSource Support Ticket 5862952

Ticket `5862952` remains the governing external dependency.

| Field | Result |
| --- | --- |
| Owner | CoreSource Support |
| Current status | Open / external provider response pending |
| Provider response visible in latest readback | No |
| Resume trigger | CoreSource responds with machine-ingestion, nonpublic ingestion, public-effect, job-readback, and provider-record correction authority |
| JM1 action before response | Continue read-only provider inventory only; do not execute canary |

## LSI Health - Account 6116305

| Dimension | Result |
| --- | --- |
| Account state | Healthy for authenticated portal operations |
| Finance state | Healthy where visible; no finance or account-hold warning surfaced in dashboard, messages, titles, or order pages |
| Title creation | Add Title visible |
| Metadata/title editing | Title detail routes visible |
| Content upload | Title upload flows visible |
| POD production | Place Order opens and shows Short Run Order and Proof Order |
| Wholesale/global distribution | Enabled global-distribution indicators visible on title rows |
| Direct distribution / Global Connect | Global Connect and Expand Your Reach links visible |
| Current warnings | One visible title-specific `Awaiting Update` row; not account-wide |
| Account holds | None visible |
| Payment/credit restrictions | None visible in inspected pages; full billing ledger not inspected |

`LSI_ACCOUNT_HEALTH = HEALTHY`

`LSI_FINANCE_HEALTH = HEALTHY_WHERE_VISIBLE_NO_PORTAL_HOLD_OBSERVED`

`LSI_PRIMARY_PRINT_READY = YES_FOR_EXISTING_OPERABLE_PRINT_ACCOUNT_NO_FOR_UNPROVEN_CORESOURCE_TO_LSI_CANARY`

## IngramSpark Health - Account 9118734

| Dimension | Result |
| --- | --- |
| Account state | Healthy for authenticated portal operations |
| Finance state | Healthy where visible; no finance or account-hold warning surfaced in dashboard, messages, titles, or order pages |
| Title count | 239 rows shown |
| Title creation | Add Title visible |
| Metadata/title editing | Edit Title / title detail routes visible |
| Content upload | Print & Ebook, Print Book Only, and Ebook Only upload/title flows visible |
| Distribution | Enabled global-distribution indicators visible |
| Current warnings | US discount review for 2 titles; eCommerce link review for 2 links |
| Warning classification | Portfolio-specific maintenance, not account-level restriction |
| Live product evidence | Title Available rows, global-distribution indicators, and print sales activity visible |

`INGRAMSPARK_ACCOUNT_HEALTH = HEALTHY_WITH_PORTFOLIO_MAINTENANCE_ALERTS`

`INGRAMSPARK_FINANCE_HEALTH = HEALTHY_WHERE_VISIBLE_NO_PORTAL_HOLD_OBSERVED`

`INGRAMSPARK_CONTINGENCY_READY = YES_FOR_GOVERNED_CONTINGENCY_USE_NO_FOR_UNAUTHORIZED_MIGRATION`

## Finance Incident Final Matrix

| Provider | Account health | Finance health | Title creation | Metadata update | Content upload | Distribution | Royalty/payment effect | Remaining restriction | Return-to-full-health trigger |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CoreSource | Healthy for authenticated portal readback | No finance hold visible; finance ledger not exposed | Create New Title visible | Title/search surfaces visible | Asset/title workflows exist but not mutated | Distributions visible; failed-distribution attention remains | Not exposed | Safe nonpublic/public-effect authority pending CoreSource response | Provider response to ticket 5862952 |
| LSI | Healthy | Healthy where visible; no hold observed | Visible | Visible | Visible | Visible | Sales/order surfaces visible; no hold observed | Full billing ledger not inspected, but no restriction visible | Billing/credit page or provider support confirmation if needed |
| IngramSpark | Healthy with maintenance alerts | Healthy where visible; no hold observed | Visible | Visible | Visible | Visible | Sales activity visible; no hold observed | Discount/eCommerce-link maintenance alerts | Separate title/link maintenance review |

`UNCLASSIFIED_FINANCE_RESTRICTIONS = 0`

Finance restrictions are no longer described as generically partial. The remaining items are either no visible restriction, provider-response pending, or portfolio-specific maintenance.

## Amazon Direct / KDP

KDP authenticated Bookshelf was visible.

Observed:

- Direct KDP products exist.
- Live paperback, hardcover, and Kindle eBook formats are visible.
- Draft/unpublished products are visible.
- ASINs and prices are visible for multiple products.
- Create/link controls are visible for Kindle eBook, paperback, hardcover, and Audible audiobook.
- Quality Issues Dashboard link is visible.

`AMAZON_DIRECT_ROLE = STRATEGIC_EXCEPTION`

Reason: direct Amazon management is real and useful for specific governed products, but it creates duplicate-route exposure if expanded broadly without route ownership normalization.

## ACX / Amazon Audio

ACX authenticated dashboard was visible for Jackie Smith.

Observed:

- Titles not posted: 1
- Offers: 10
- In production: 2
- Completed: 4
- Royalty-model enrollment prompt: 0 of 4 titles enrolled

`ACX_ROLE = ACTIVE_STRATEGIC_AUDIO_DIRECT_RIGHTS_ROUTE_REQUIRING_SEPARATE_GOVERNANCE`

No enrollment, title claim, or audio action occurred.

## Barnes & Noble Press Direct

B&N Press authenticated sales-report surface was visible.

Observed:

- Welcome, Jackie
- Sales by Year
- Total paid units: 10
- Total free units: 0
- Total royalty: $57.50
- 2026 paid units: 0
- Navigation to Projects, Sales Reports, Profile, Vendor Account, Manage Contributors, and Order History visible

The Projects route loaded a page shell/spinner but did not expose project rows in the accessibility tree during the bounded pass.

`BN_MFA_REQUIRED = NO_CURRENT_SESSION_AUTHENTICATED`

`BARNES_AND_NOBLE_DIRECT_ROLE = STRATEGIC_EXCEPTION_EVIDENCE_LIMITED_TO_AUTHENTICATED_ACCOUNT_AND_SALES_SURFACE`

Reason: B&N account and sales evidence are real, but title/product inventory was not deterministically readable in this pass.

## Active Portfolio Matrix From Current Repo Evidence

Current available evidence:

| Source | Rows / count |
| --- | ---: |
| Public catalog `data/books.json` | 122 records |
| Public catalog works by id | 122 |
| Public catalog records with ISBN | 122 |
| Public catalog formats | Hardcover; Paperback; eBook |
| CoreSource full catalog census | 295 asset rows |
| CoreSource title groups | 117 |
| CoreSource formats | AUDIO; EBOOK; FRONT_COVER; PRINT_COVER; PRINT_COVER_VARIANT; PRINT_INTERIOR |
| CoreSource publication statuses | 04 - Active; 08 - Inactive; 11 - Withdrawn from sale |
| CoreSource eBook reconciliation rows | 118 |
| CoreSource eBook catalog matches | 117 |
| CoreSource eBook catalog nonmatches | 1 |

`ACTIVE_WORKS = 122_FROM_PUBLIC_CATALOG`

`ACTIVE_TITLE_FORMAT_UNITS = 295_CORESOURCE_ASSET_ROWS_PLUS_DIRECT_PROVIDER_SNAPSHOTS`

`ROUTES_CLASSIFIED = CORESOURCE_CATALOG_AND_PROVIDER_ROLE_LEVEL_CLASSIFIED`

`UNCLASSIFIED_ROUTES = NOT_PROVEN_ZERO`

The every-title / every-format / every-retailer matrix is not complete because KDP and B&N direct title exports were not available in the current repo evidence, and B&N project rows were not deterministically readable.

## Channel Ownership

| Requirement | Result |
| --- | --- |
| Channel ownership rows | Not complete |
| Duplicate channel authorities discovered | Real duplicate-route exposure proven at role level by KDP direct products plus CoreSource/LSI/Ingram route evidence |
| Duplicate channel authorities intentional | Not proven title-by-title |
| Duplicate channel authorities requiring later normalization | Yes |
| Uncontrolled duplicate channel authorities | Not proven zero |

`UNCONTROLLED_DUPLICATE_CHANNEL_AUTHORITIES = NOT_PROVEN_ZERO`

## Final Routing Canon Candidate

| Route | Candidate | Health requirement | Fallback trigger | Contingency | Duplicate prevention | Return trigger |
| --- | --- | --- | --- | --- | --- | --- |
| Print primary | CoreSource to LSI POD | CoreSource support confirms public/on-sale effect boundaries and LSI account remains operational | CoreSource/LSI account restriction, provider outage, or title-specific blocked channel | IngramSpark | One governed upstream per title-format-channel unless exception is recorded | Provider restriction cleared and route ownership reconciled |
| Print contingency | IngramSpark | Account remains healthy; title-specific discount/link alerts do not block target title | Primary print route unavailable | None below this layer | Do not duplicate live print products without explicit exception | Primary print route restored |
| eBook primary | CoreSource | eBook assets/metadata validate and provider attention states resolved | CoreSource eBook channel failure or account restriction | Title-specific strategic exception | Avoid duplicate Amazon/B&N direct eBook authority unless intentional | CoreSource eBook route healthy |
| Audio primary | CoreSource enabled audio plus ACX strategic exceptions | Channel-specific audio metadata/assets validate; ACX royalty-model decision governed separately | CoreSource audio channel failure or direct-rights reason | ACX / current audio provider | Direct audio only where rights and route ownership are explicit | Audio channel restored or exception closed |
| Amazon direct | Strategic exception | Product-specific reason and route ownership proof | Primary route unsuitable or legacy direct product requires maintenance | KDP | No broad KDP activation without normalization | Primary route confirmed |
| B&N direct | Strategic exception | Project/product inventory and route overlap proven | CoreSource/B&N route issue or legacy direct maintenance | B&N Press | No broad B&N activation without product inventory | Primary route confirmed |

## CoreSource to LSI Effect Boundary

The strongest available evidence proves CoreSource-to-Lightning Source integration exists and is actively improving, but not the full public-effect boundary for a canary.

| Effect | Paperback | Hardcover |
| --- | --- | --- |
| Downstream title created | External provider confirmation pending | External provider confirmation pending |
| POD product created | External provider confirmation pending | External provider confirmation pending |
| Wholesale availability created | External provider confirmation pending | External provider confirmation pending |
| Public retailer listing created | External provider confirmation pending | External provider confirmation pending |
| On-sale availability created | External provider confirmation pending | External provider confirmation pending |
| Release-date effect | External provider confirmation pending | External provider confirmation pending |
| Reversibility/withdrawal | External provider confirmation pending | External provider confirmation pending |
| Status readback | Planned/enhanced status readback noted in CoreSource release note; exact current readback pending | Planned/enhanced status readback noted in CoreSource release note; exact current readback pending |

`CORESOURCE_TO_LSI_PUBLIC_EFFECT = EXTERNAL_PROVIDER_RESPONSE_PENDING`

`CORESOURCE_TO_LSI_CANARY_READY = NO`

`CORESOURCE_TO_LSI_NEXT_GATE = EXPLICIT PUBLIC/SALEABLE PROVIDER EFFECT AUTHORIZATION`

## Canary Decision

Valid outcome C applies:

`ONLY CORESOURCE SUPPORT CAN ANSWER`

No canary was executed.

## UI-Assisted Runtime Ready State

| Step | State |
| --- | --- |
| System discovers eligibility | PASS |
| System generates exact workbook | PASS |
| System validates workbook | PASS |
| System creates provider task | PASS |
| Human authenticates | PASS as bounded operational step |
| Human uploads only | PASS as bounded operational step |
| Job ID/result captured | PASS in runtime model; requires actual provider job |
| System reconciles | PASS in runtime model |
| Next work discovered | PASS |

`HUMAN_INITIATION_REQUIRED = NO`

`MANUAL_METADATA_AUTHORING = NO`

`HUMAN_PROVIDER_STEP = BOUNDED_UPLOAD_ONLY`

`SYSTEM_CONTINUATION = YES`

## ORCH-012 Revalidation

`ORCH012_ACTIONS_REVALIDATED = 18`

`ORCH012_ACTIONS_DOWNGRADED = 0`

No ORCH-012 action remains dependent on an obsolete direct-API assumption. Transport remains UI-assisted unless CoreSource support confirms machine ingestion.

## Remaining Boundary

`INTERNAL_ACTIONS_REMAINING = ACTIVE_ROUTE_MATRIX_AND_CHANNEL_OWNERSHIP_EXPORT_OR_PROVIDER_READABLE_EQUIVALENT`

`EXTERNAL_DEPENDENCIES_REMAINING = CORESOURCE_SUPPORT_TICKET_5862952_RESPONSE`

`NEW_MATERIAL_FOUNDER_GATE_REQUIRED = ONLY_IF_SAFE_NONPUBLIC_CANARY_IS_NOT_SUPPORTED_AND_NEXT TEST WOULD CREATE PUBLIC/SALEABLE EFFECT`

DIST-004 is not blocked by code implementation. It is blocked by provider/public-effect authority and title-channel ownership proof.
