# JMP Commercial Architecture Activation Report

Authority: Jackie Smith, Jr.

Canonical source: `JMP_Package_Edition_Program_Pricing_SKU_Matrix_v1.1.docx`

## Summary

The Matrix v1.1 package, edition, program, pricing, and SKU architecture has been activated in repository source as a canonical commercial architecture module with validation guards and public catalog mapping. Production promotion to live Dataverse schema, Business Central items, and executable contract schedules remains gated.

## Schema and Relationship Evidence

Canonical source file:

- `lib/commercial/catalog.ts`

The source defines:

- Publishing Package
- Edition Catalog Definition
- Publishing Program
- Package Edition Entitlement
- Package Included Service
- Premium Upcharge Rule
- Price Rule
- Funding-Track Applicability
- Title Edition (`jm1pub_edition`) required field set
- Title Program Enrollment

Relationship stance:

- Package records own slot counts.
- Edition Catalog Definitions own product-form and slot eligibility.
- Price Rules own every amount.
- Funding Track controls payer and author billing, never SKU identity.
- Title Edition is the instance-level record that must carry ISBN/identifier and distribution evidence.

## Solution-Component Inventory

Ready for ALM solution promotion:

- Commercial table inventory
- Product Form option set with exactly eight values
- Publishing Track option set
- Price Rule seed records
- Package seed records
- Edition catalog seed records
- Program seed records
- Title Edition required field inventory
- Execution event taxonomy for edition lifecycle

No live Dataverse schema mutation was performed in this repository slice.

## BC Item Crosswalk

Evidence file:

- `docs/operations/generated/2026-07-20-JMP-Commercial-Architecture-Dataverse-and-BC-Crosswalk.md`

BC item classification is resolved by pricing method:

- Fixed pricing: Fixed Service Item
- Unit pricing: Unit Service Item
- Quote/SOW pricing: Quote/SOW Item

Webtoon/GFX items remain non-sellable pending production-partner validation and separate Jackie approval.

## Website and Public Catalog Mapping

Updated public surface:

- `app/packages/page.tsx`
- `lib/tokens.ts`

Public catalog now exposes:

- package prices and slot counts
- standard/premium edition add-on pricing
- in-slot premium pricing
- AI narration at $500 through 8 PFH and $50/PFH overage
- human narration as quote-required starting at $400/PFH
- serialization prices
- interactive EPUB starting price

Public catalog does not expose:

- webtoon pilot or season pricing
- internal cost calculations
- implementation status
- Council commentary

## Contract Schedule Mapping

Evidence file:

- `docs/operations/generated/2026-07-20-JMP-Contract-Pricing-Schedule-Mapping.md`

All unreviewed legal provisions remain marked:

`LEGAL LANGUAGE PENDING — COMMERCIAL PRICE APPROVED`

## Pricing-Rule Test Results

Guard script:

- `scripts/commercial_architecture_guard.test.mjs`

Coverage:

- package prices and slot counts
- exactly eight product forms
- no `PF-05C`
- PF-05 complexity as an attribute
- PF-04 narration method as an attribute
- standard and premium edition pricing
- AI narration base and overage
- human narration quote posture
- PF-07/PF-08 program-only enforcement
- webtoon public-price block
- stale `$699` public audiobook price removal
- public page consumes canonical matrix source

## Traditional-Track $0 Test

The canonical `authorBillableAmount()` resolver returns $0 for author-billed amounts when Publishing Track is Traditional while preserving the underlying SKU/list amount.

## Webtoon Boundary Test

The guard verifies:

- `JMP-GFX-WEBTOON-PILOT` is provisional and non-public.
- `JMP-GFX-WEBTOON-12` is provisional and non-public.
- public package page does not expose `$1,200` or `$850`.

## Execution-Log Evidence

Edition lifecycle event types are defined in source:

- `TITLE_EDITION_CREATED`
- `TITLE_EDITION_STATUS_TRANSITIONED`
- `TITLE_EDITION_VALIDATION_GATE_INITIATED`
- `TITLE_EDITION_VALIDATION_GATE_PASSED`
- `TITLE_EDITION_VALIDATION_GATE_FAILED`
- `TITLE_EDITION_DISTRIBUTION_SUBMITTED`
- `TITLE_EDITION_DISTRIBUTOR_ACCEPTANCE_RECEIVED`
- `TITLE_EDITION_LIVE`
- `TITLE_EDITION_RETIRED`

Live execution-log emission awaits Dataverse solution promotion and the first governed Title Edition lifecycle transaction.

## Rollback and Remediation Notes

Rollback is source-level:

- revert `lib/commercial/catalog.ts`
- revert public page/token changes
- remove `commercial-architecture-guard`
- remove generated evidence files

No live Dataverse, BC, distribution, contract, or financial posting change was made by this repository activation slice.

## Unresolved Exceptions

- Dataverse schema deployment requires governed solution promotion.
- Business Central item creation requires BC promotion and sellable/non-sellable posture confirmation.
- Contract legal language remains pending counsel review.
- Webtoon/GFX remains prohibited from public sale, automated quoting, BC sellable activation, and contract activation until partner validation and separate Jackie approval.
- Human-in-the-loop validation gate must be enforced before ENH/CPLX editions move to live distribution.

Final boundary: production promotion requires final evidence package and explicit Jackie approval. This activation implements the canonical architecture source, guardrails, website mapping, and schedule/crosswalk evidence only.

