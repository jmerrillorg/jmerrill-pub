# JMP Commercial Architecture Dataverse and BC Crosswalk

Source: `JMP_Package_Edition_Program_Pricing_SKU_Matrix_v1.1.docx`

Status: implementation source and validation guard activated in repository. Live Dataverse and Business Central promotion remains gated by ALM/package approval.

## Dataverse Component Inventory

| Component | Purpose | Implementation disposition |
|---|---|---|
| Publishing Package | Starter, Professional, Premier package records | Canonical source in `lib/commercial/catalog.ts`; Dataverse table/seed promotion pending solution deployment |
| Edition Catalog Definition | Product-form catalog level, not title instance | Canonical source activated; table/seed promotion pending |
| Publishing Program | Serialization, audio-first, interactive, custom, provisional GFX | Canonical source activated; public/private flags enforced |
| Package Edition Entitlement | Package slot count and eligible edition rules | Guarded by canonical package and edition definitions |
| Package Included Service | Included services by package | Canonical service statements activated for public copy; detailed service table pending solution promotion |
| Premium Upcharge Rule | In-slot premium rules for complex large print and complex accessibility | Canonical price rules activated |
| Price Rule | Lookup-driven SKU pricing | Canonical price rules activated; hard-coded public stale price removed |
| Funding-Track Applicability | Track determines payer, not SKU | `authorBillableAmount()` guard active for Traditional $0 author billing |
| Title Edition (`jm1pub_edition`) | Real edition instance for a real title | Required field set documented and ready for ALM schema reconciliation |
| Title Program Enrollment | Title-level program participation | Canonical program definitions activated; live schema pending promotion |

## Required Title Edition Field Set

Every real edition instance must carry:

- parent title lookup
- Edition Catalog Definition/product form lookup
- SKU/Price Rule lookup
- ISBN or other edition identifier at edition level
- edition status
- publication and release dates
- distributor
- distributor product/edition ID
- retail price
- library price
- direct-to-consumer price
- currency
- language
- territory
- accessibility profile
- rights basis
- royalty treatment
- annual distribution fee treatment
- publishing track
- asset references
- validation and conformance evidence
- distribution submission and live evidence
- retirement status and retirement date

## Product Forms

Exactly eight values are active in source:

| Code | Product form | Notes |
|---|---|---|
| PF-01 | Paperback | Standard edition |
| PF-02 | Hardcover | Standard edition |
| PF-03 | Standard Ebook (born-accessible) | Born-accessible standard, not a paid accessibility upgrade |
| PF-04 | Audiobook | Narration method attribute: AI, Human Single-Voice, Human Multi-Voice |
| PF-05 | Large Print | Complexity attribute: Standard or Complex |
| PF-06 | Complex-Content Accessibility Edition | Premium/conformance edition |
| PF-07 | Vertical Graphic Edition | Program-only; provisional webtoon boundary applies |
| PF-08 | Interactive/Multimedia Edition | Program-only |

`PF-05C` is not created.

## Business Central Crosswalk

| SKU family | Pricing method | BC item classification | Sellable posture |
|---|---|---|---|
| Standard edition add-ons | Fixed | Fixed Service Item | Sellable after BC promotion |
| Complex add-ons and in-slot premiums | Fixed | Fixed Service Item | Sellable after validation and BC promotion |
| AI narration base | Fixed | Fixed Service Item | Sellable; Premier includes base under same length policy |
| AI narration overage | Unit PFH | Unit Service Item | Sellable with PFH quantity |
| Human single-voice narration | Unit PFH / quote required | Unit Service Item | Quote required before invoice |
| Human multi-voice narration | Quote/SOW | Quote/SOW Item | Not fixed-price |
| Serialization | Fixed | Fixed Service Item | Sellable after contract-schedule approval |
| Audio-first origination | Unit PFH / scoped approval | Unit Service Item | Quote/scoped approval before invoice |
| Webtoon/GFX | Fixed/unit provisional | Unit or Fixed Service Item | Created as non-sellable only; no public sale |
| Interactive EPUB 3 | Fixed starting, scope-capped | Fixed Service Item | Sellable after scope cap confirmed |
| Custom browser/custom work | Quote/SOW | Quote/SOW Item | SOW only |

Funding track controls payer and invoice responsibility. It does not change SKU identity.

