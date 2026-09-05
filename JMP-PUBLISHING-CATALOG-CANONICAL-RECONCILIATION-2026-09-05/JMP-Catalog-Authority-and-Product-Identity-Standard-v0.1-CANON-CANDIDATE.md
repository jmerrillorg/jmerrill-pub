# JMP Catalog Authority & Product Identity Standard v0.1

Status: CANON-CANDIDATE  
Owner: J Merrill Publishing  
Ratification authority: Founder  
Candidate date: 2026-09-05

This document is a governance candidate. It does not create canon by its own publication. Founder approval is required before it becomes binding JMP canon.

## 1. Ownership Boundary

J Merrill Publishing owns canonical author identity, work identity, edition identity, product identity, identifiers, publication history, distribution state, title authority, retirement or reversion state, and current catalog state. JM1 Marketing consumes the resulting authority contract and must not independently reconstruct Publishing truth.

## 2. Product Identity

The catalog hierarchy is Author -> Canonical Work -> Edition or Release Instance -> Format or Product -> Identifier.

- An Author is the stable Publisher identity for a person or institution.
- A Canonical Work is the intellectual title and is not duplicated for each format.
- An Edition records a materially distinct release family, reissue, new edition, or approved parallel edition.
- A Format or Product is the commercially distributable manifestation, such as paperback, hardback, digital, or audio.
- An Identifier belongs to the applicable product. It may be an ISBN-13, ASIN, ACX identifier, or another governed distribution identifier.

Display-title text alone is never a stable key. Product keys prefer normalized ISBN-13, ASIN, audio identifier, or an existing governed Product ID.

## 3. Publisher Origin And Authority Change

Authoritative JMP publication or catalog evidence establishes `PUBLISHER_ORIGIN_CONFIRMED`. Missing modern agreement rows do not negate historical Publisher origin.

After origin is established, current authority changes only through affirmative governed evidence such as executed termination, rights reversion, effective contract expiration, author withdrawal, title retirement, Founder hold, legal restriction, relevant distribution termination, or a superseding agreement. A missing record is not an authority-changing event. Material conflict or unclear evidence is classified `AUTHORITY_CHANGE_UNCLEAR` and routed for rights review.

## 4. Catalog, Retirement, And Distribution

Each work has an explicit catalog state: `ACTIVE`, `RETIRED`, `INACTIVE`, `WITHDRAWN`, `RIGHTS_REVERTED`, or `UNRESOLVED`.

Retirement, rights authority, and product distribution are separate dimensions. Retiring a work does not by itself remove distribution, and distribution termination does not by itself prove a rights reversion. Product distribution uses `CURRENTLY_DISTRIBUTED`, `LEGACY_DISTRIBUTION`, `NOT_CURRENTLY_DISTRIBUTED`, or `DISTRIBUTION_UNKNOWN`.

## 5. Marketing Authority

Publishing emits exactly one explicit marketing-authority state for each governed work: `MARKETING_ELIGIBLE`, `MARKETING_HELD`, `MARKETING_PROHIBITED`, or `MARKETING_AUTHORITY_UNRESOLVED`.

Marketing may not infer this state from legacy Contract, IsDistributed, House, Status, or file-presence fields. The governed downstream contract contains:

`CanonicalWorkId`, `CanonicalAuthorId`, `Title`, `AuthorDisplayName`, `CurrentLifecycleState`, `PublicationDate`, `ReleaseDate`, `ActiveState`, `MarketingAuthorityState`, `CurrentEditionId`, `AvailableFormats`, `PrimaryCoverAsset`, `PurchaseCTA`, `FeaturedAuthorEligibility`, `MarketingHealthEligibility`, `RetirementState`, and `RightsHoldState`.

## 6. Reserved ISBNs

An ISBN allocation without title or product information is `RESERVED_UNASSIGNED_ISBN`. It remains in Publishing allocation inventory and is excluded from works, catalog counts, authors, distribution, campaigns, and Marketing Health.

## 7. Reconciliation And Preservation

Raw source values are immutable evidence. Normalized fields are stored separately. Harmless display variants may resolve to one canonical identity only when author, title, publication history, identifiers, and edition evidence support that result.

Historic products are preserved when a newer product or edition exists. Allowed relationships include `SAME_EDITION_DIFFERENT_FORMAT`, `NEW_EDITION`, `REISSUE`, `REPLACEMENT_PRODUCT`, `PARALLEL_EDITION`, `LEGACY_PRODUCT`, `CURRENT_PRODUCT`, `SUPERSEDED_PRODUCT`, and `UNRESOLVED_EDITION_RELATION`.

## 8. Promotion Controls

Schema changes are additive. Existing IDs and lifecycle relationships are preserved. Promotion uses stable deterministic keys and idempotent upsert. Replaying an unchanged source must create zero duplicate authors, works, editions, or products and perform zero updates.

Every commissioning records source checksum, correlation ID, pre-write plan, write ledger, independent readback, and no-op replay. Destructive catalog migration requires separate Founder authorization.

## Founder Gate

Decision: PENDING FOUNDER APPROVAL  
Effect of approval: This candidate becomes the authoritative JMP Catalog Authority & Product Identity Standard.
