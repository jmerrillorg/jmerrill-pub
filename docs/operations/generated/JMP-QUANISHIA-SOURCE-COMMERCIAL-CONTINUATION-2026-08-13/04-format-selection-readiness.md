# Governed Format Selection Readiness

Last verified: 2026-08-13T02:00:02Z

## Purpose

Author onboarding now captures package-aware Format Selection before production specifications so downstream ISBN, interior, cover, ebook, audiobook, distribution, royalty, and complimentary-copy handling can be driven by governed Product Form election.

## Implemented Fields

Author setup form:

- `governedFormatSelection`
- `additionalFormatInterest`

Onboarding payload:

- `governedFormatSelection`
- `selectedProductForms`
- `includedProductForms`
- `availableAddOnProductForms`
- `separateAuthorizationProductForms`
- `notApplicableProductForms`
- `formatDownstreamDrivers`

## Starter Default

For `JMP-PKG-STARTER`, the default included set is:

- `PF-01` Paperback
- `PF-03` Standard Ebook

## Format Dispositions

- Included Product Forms: package entitlement applies.
- Available add-on Product Forms: can be requested but require commercial/add-on handling.
- Separate-authorization Product Forms: require governed approval before production.
- PF-07: not applicable / fails closed.

## Boundary

This change prepares onboarding capture. It does not fabricate a format election for a live author and does not start production.
