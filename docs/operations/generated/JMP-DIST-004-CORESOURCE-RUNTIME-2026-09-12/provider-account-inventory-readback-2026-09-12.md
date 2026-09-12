# JMP-DIST-004 Provider Account Inventory Readback

Date: 2026-09-12
Mode: read-only provider/account inspection
Mutation boundary: no upload, no title creation, no distribution retry, no role change, no credential copy, no public product creation

## Overall Classification

`JMP_DIST_004_PARTIAL`

The repo-side DIST-004 runtime remains implemented and fail-closed. The additional provider inspection improved account visibility for Lightning Source, IngramSpark, ACX, and Amazon KDP, but it did not prove the exact CoreSource nondistributable/nonpublic state required for a safe canary. Barnes & Noble Press direct inventory is authentication-gated and was not entered past the code challenge.

## CoreSource Support Ticket 5862952

| Field | Readback |
| --- | --- |
| Status | Open |
| Requester | Smith, Jr., Jackie |
| Publisher | J Merrill Publishing, Inc. |
| Product type | Multiple |
| Reason | Ingestion - Metadata/Content |
| Latest visible provider response | None visible |
| Latest visible publisher activity | Today, 2:02 AM |
| Support dependency | External pending |
| Provider action required | Respond with supported machine-ingestion, readback, nonpublic test, and provider-record correction authority |
| JM1 action required | Continue read-only inventory; do not execute canary or distribution retry until provider authority is proven |

Ticket content requests provider confirmation for account authority, metadata/title ingestion, machine ingestion, distribution workflow, job/status readback, and safe nonpublic test behavior. A later publisher update asks CoreSource to explain Love Lucy attention-state behavior, audio/front-cover attention-state behavior, and Little Girl provider binding. The ticket explicitly does not authorize asset uploads, title creation, ISBN reassignment, broad metadata cleanup, distribution retry, or ticket closure.

### Machine Ingestion Authority

| Capability | Current result |
| --- | --- |
| Machine ingestion available | Provider has not proven |
| API available | Provider has not proven |
| SFTP available | Provider has not proven |
| FTP available | Provider has not proven |
| File feed available | Provider has not proven |
| ONIX feed available | Provider has not proven |
| Auth model | Provider has not proven |
| Separate service credentials required | Provider has not proven |
| Job readback contract | Provider has not proven |
| Test/sandbox mode | Provider has not proven |
| New cost | Provider has not proven |
| New contract requirement | Provider has not proven |

## CoreSource Nonpublic Authority

The current provider readback proves visible portal concepts such as title group search, product/asset rows, publishing status, asset status, `Has Content`, and asset-level `Is Distributable`. It does not prove the business effect of safe canary values.

| Field | Source | Required for canary | Allowed/safe value currently proven | Business effect currently proven |
| --- | --- | --- | --- | --- |
| Distributable / Is Distributable | CoreSource portal asset rows and advanced-search controls | Yes | No safe nondistributable canary value proven | Not proven to prevent all downstream/public effects |
| Publishing Status | CoreSource advanced-search control | Yes | No safe nonpublic value proven | Not proven |
| Publication Date | CoreSource title metadata concept; exact canary behavior not provider-proven | Yes | Not proven | Not proven |
| Release Date | Requested from provider in ticket 5862952 | Yes | Not proven | Not proven |
| Channel enablement | Requested from provider in ticket 5862952 | Yes | Not proven | Not proven |
| LSI distribution | Requested from provider in ticket 5862952 | Yes | Not proven | Not proven |
| Retailer distribution | Requested from provider in ticket 5862952 | Yes | Not proven | Not proven |
| Territory | Requested from provider in ticket 5862952 | Yes | Not proven | Not proven |
| Asset availability | CoreSource asset rows prove visibility after ingestion, not safe canary isolation | Yes | Not proven | Not proven |

`CORESOURCE_SUPPORTS_INGESTED_NONPUBLIC_RECORD = PROVIDER_HAS_NOT_PROVEN`

`SAFE_NONDISTRIBUTABLE_CANARY_STATE = FAIL_PROVIDER_PUBLIC_EFFECT_BOUNDARY`

## Lightning Source Account 6116305

| Field | Readback |
| --- | --- |
| Account | J Merrill Publishing, Inc. Account#: 6116305 |
| Account state | Authenticated dashboard visible |
| Messages | My Messages table visible; no message rows visible |
| Title creation allowed | Add Title link visible |
| Metadata/title detail readback | Titles and title detail links visible |
| Content/title upload allowed | Upload a Title links visible for Paperback or Hardcover and Advanced Reader Copy |
| POD distribution allowed | Recent title rows show title status and global-distribution indicators |
| Wholesale/global distribution | Global-distribution indicators visible on title rows; Global Connect and Expand Your Reach links visible |
| Current account warnings | No dashboard finance warning visible in readback |
| Current finance warnings | None visible on dashboard/messages; full finance state not proven without provider billing/finance authority |
| Title status readback | Recent rows include `Title Available`, `Awaiting Update`, `Enabled for global distribution`, and `Not enabled for global distribution` |
| LSI primary print ready | No for closure; dashboard proves operability but not full finance/public-effect health |

## IngramSpark Account 9118734

| Field | Readback |
| --- | --- |
| Account | J Merrill Publishing, Inc. Account#: 9118734 |
| Account state | Authenticated dashboard and title list visible |
| Messages | My Messages table visible; no message rows visible |
| Dashboard warnings | `Update Your US Discount` for 2 titles; `Review Your ECommerce Links` for 2 links |
| Title creation allowed | Add Title link visible |
| Metadata update allowed | Title detail/edit links visible |
| Content upload/title setup allowed | Upload a Title links visible for Print & Ebook, Print Book Only, and Ebook Only |
| Distribution allowed | Title rows show enabled global-distribution indicators |
| Current title count | 239 rows shown on All Titles page |
| Live product evidence | Visible rows include `Title Available` and global-distribution indicators; dashboard shows print units sold |
| Finance state | No finance warning visible on dashboard/messages; full finance state not proven without provider billing/finance authority |
| IngramSpark contingency ready | Yes for authenticated read-only/operable contingency surface; no for clean migration or product mutation authority |

## ACX / Amazon Audio

| Field | Readback |
| --- | --- |
| Platform | ACX |
| Account/profile | Jackie Smith visible |
| Current projects | My Projects visible |
| Project counts | Titles not posted 1; Offers 10; In production 2; Completed 4 |
| Current action item | Enroll titles in new royalty model by year-end; enrollment progress 0/4 |
| Directly managed audio | ACX projects exist |
| Mutation boundary | No title claim, enrollment, project edit, or audio action performed |
| ACX role | Active strategic audio/direct-rights route requiring separate governance |

## Amazon KDP Direct

| Field | Readback |
| --- | --- |
| Platform | Amazon Kindle Direct Publishing |
| Account state | Authenticated bookshelf visible |
| Current titles | Bookshelf visible with paginated title rows |
| Current formats | Kindle eBook, paperback, hardcover, and Audible audiobook controls/rows visible |
| ASIN relationships | Visible rows include ASINs for live Kindle and print formats |
| Directly managed products | Live and draft KDP products visible |
| CoreSource/LSI/Ingram overlap | Not fully proven from KDP page alone; duplicate-route risk is real because direct live Amazon products exist |
| Metadata authority | Manage title and setup links visible |
| Price authority | Pricing links visible on live rows |
| Duplicate route risk | High unless title-format route ownership is explicitly normalized |
| Business advantage | Direct Amazon control exists for specific exceptions and legacy products |
| Amazon Direct role | Strategic exception / direct route for specific governed formats; do not activate broadly |

## Barnes & Noble Press Direct

| Field | Readback |
| --- | --- |
| Platform | Barnes & Noble Press |
| Account inventory | Not reached |
| Current state | Authentication code challenge |
| Direct products | Not proven |
| CoreSource overlap | Not proven |
| Metadata/price authority | Not proven |
| Duplicate route risk | Unknown until authenticated inventory is completed |
| Strategic benefit | Unknown until authenticated inventory is completed |
| Barnes & Noble Direct role | Authentication-gated; cannot classify beyond `UNPROVEN_DIRECT_INVENTORY` |

## Finance Incident Closure Matrix

| Provider | Channel | Previous restriction | Current restriction | Finance related | Title creation allowed | Metadata update allowed | Content upload allowed | Distribution allowed | Royalty/payment effect | Current support action | Return-to-normal trigger |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CoreSource | eBook/print/audio distribution | Historic finance/provider concern not exactly enumerated in current page | No finance warning visible in captured CoreSource readback; full finance state not exposed | Unknown | Portal capability visible but not finance-proven | Portal capability visible but not finance-proven | Portal capability visible but not finance-proven | Dashboard shows distributions, but canary/public-effect safety not proven | Unknown | Ticket 5862952 pending | Provider confirms health and safe public-effect controls |
| Lightning Source | POD/wholesale/global distribution | Historic finance/provider concern not exactly enumerated in current page | No dashboard/messages finance warning visible; full finance state not proven | Unknown | Visible | Visible by title-detail routes | Visible via upload/title flow links | Visible by title indicators | Unknown | None visible | Finance/billing page or provider support confirms no restriction |
| IngramSpark | Print/eBook distribution | Historic finance/provider concern not exactly enumerated in current page | Discount and eCommerce-link alerts visible; no dashboard/messages finance warning visible; full finance state not proven | Unknown | Visible | Visible | Visible | Visible by title indicators | Sales activity visible; royalty/payment restrictions not proven | Account/title alerts require separate review | Provider/account evidence proves no finance restriction and title alerts resolved or accepted |
| ACX | Audio direct | Royalty model change prompt visible | Enrollment action item remains, 0/4 enrolled | Yes, royalty-model related | Claim/edit capabilities visible | Project/title capabilities visible | Audio/project capabilities visible | Existing ACX project states visible | Royalty model action item could affect continued distribution | Review under separate audio governance | Founder-authorized royalty-model disposition |
| Amazon KDP | Amazon direct Kindle/print | Not established | No finance warning visible; full payment/tax/royalty state not proven | Unknown | Visible | Visible | Visible | Live products visible | Royalties/payment not inspected | None visible | Account/payment/tax readback confirms no hold |
| Barnes & Noble Press | B&N direct | Not established | Authentication-gated | Unknown | Not proven | Not proven | Not proven | Not proven | Not proven | Human authentication required | MFA-authenticated read-only inventory |

`FINANCE_STATE_UNKNOWN_ITEMS = 0 where provider evidence is available; unresolved finance items are explicitly enumerated where provider evidence was not exposed.`

## Active Routing And Ownership

The bounded browser pass proves current records in several provider systems, but it does not complete an every-title/every-format/every-channel ownership matrix.

| Requirement | Result |
| --- | --- |
| Active title-format routing matrix complete | No |
| Channel ownership rows complete | No |
| Unclassified active routes | Present; exact count not proven in this pass |
| Uncontrolled duplicate channel authorities | Not proven zero |
| Normalization authorized | No |

## Target Routing Recommendation

| Route | Recommendation | Closure condition |
| --- | --- | --- |
| Print primary | CoreSource to Lightning Source POD, conditional | Provider must prove CoreSource to LSI public/on-sale effect and safe release controls |
| Print contingency | IngramSpark | Use only under governed fallback trigger; do not migrate casually |
| eBook primary | CoreSource | Keep, subject to provider attention-state/support resolution |
| Audio primary | CoreSource enabled audio channels plus ACX strategic exceptions | Resolve ACX royalty-model prompt separately |
| Amazon direct | Strategic exception / specific governed direct route | Normalize title-format ownership before expansion |
| Barnes & Noble direct | Unproven direct inventory | Complete MFA-authenticated read-only inventory |

## Canary Decision

`CORESOURCE_INGESTION_CANARY_READY = NO`

`CORESOURCE_INGESTION_CANARY_EXECUTED = NO`

Reason: provider evidence still does not prove a CoreSource record can be ingested with no active channels, no LSI distribution, no retail distribution, no public availability, and no on-sale state.

## ORCH-012 Revalidation

`ORCH012_ACTIONS_REVALIDATED = 18`

The 18-action model remains repo-side revalidated against the current provider evidence classification. No action is upgraded to external mutation authority by this pass. Provider-facing execution stays UI-assisted while machine ingestion remains provider-unproven.
