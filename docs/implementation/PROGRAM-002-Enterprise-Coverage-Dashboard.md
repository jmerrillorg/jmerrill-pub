# PROGRAM-002 Enterprise Coverage Dashboard

**Program:** PROGRAM-002 - Autonomous Publishing Production Pipeline
**Mode:** Enterprise Adoption Operations
**Status:** Enterprise Adoption Complete
**Date:** 2026-07-06
**Primary KPI:** Enterprise Coverage

## Executive Coverage

| Metric | Current Value | Source / Notes |
|---|---:|---|
| Total catalog titles | 122 | `data/books.json` |
| Catalog titles adopted into PROGRAM-002 | 122 | Enterprise Adoption completion pass certified all remaining eligible catalog titles |
| Active pipeline titles adopted | 1 | Track A certified: *Establishing Glory: The Library* |
| Published authors in catalog | 71 | Unique author names in `data/books.json` |
| Published authors adopted | 71 | All catalog authors adopted into PROGRAM-002 coverage |
| Active Author Workspaces certified | 72 | One Active Author Workspace; seventy-one Published Author Workspaces |
| Contracts linked | 0 confirmed | 122 catalog title contracts marked Signed / Exists - Location Pending Reconciliation |
| Stripe-ready authors | 0 confirmed | Stripe migration is flagged, not performed automatically |
| Royalty-ready authors | 0 confirmed | Royalty migration is explicitly deferred |
| OP-000 remaining catalog titles | 0 | Enterprise Adoption complete |
| OP-000 remaining published authors | 0 | Enterprise Adoption complete |
| Enterprise Coverage % | 100% | 122 adopted catalog titles / 122 catalog titles |

## Coverage by Imprint

| Certified PROGRAM-002 Imprint | Adopted Titles | Remaining Adoption | Notes |
|---|---:|---:|---|
| J Merrill Publishing | 81 | 0 | Includes low-confidence records requiring Publisher review before imprint lock |
| JM Works | 23 | 0 | Includes low-confidence records requiring Publisher review before imprint lock |
| JM Little | 12 | 0 | Certified PROGRAM-002 imprint coverage |
| JM Verse | 3 | 0 | Certified PROGRAM-002 imprint coverage |
| JM Signature | 1 | 0 | Publisher review required; never auto-lock |
| Unresolved | 2 | 0 | Adopted with Publisher imprint review required |

## Operational Interpretation

Enterprise Coverage is now measured by catalog titles adopted into PROGRAM-002, not by pilot completion. Track A, Track B, Waves 1-3, and the completion pass certified the adoption method across the full catalog. Remaining work is reconciliation, not adoption: Publisher imprint review, JM Signature review, contract file reconciliation, Stripe migration, royalty readiness, and future title-specific cleanup.

Imprint coverage is governed separately by the Enterprise Imprint Canonization Initiative. Current published imprint values remain historical evidence, but future OP-000 adoption waves must use `data/enterprise-imprint-canonization.json` for the canon-certified imprint recommendation and review decision.

## Completed Operating Rhythm

1. Select the next author from the Enterprise Adoption Queue.
2. Discover existing Contact, title, contract, workspace, royalty, distribution, and asset evidence.
3. Validate the evidence without recreating history.
4. Link existing records and populate only missing governed fields.
5. Write historical `jm1_executionlog` events.
6. Certify the author/title.
7. Update this dashboard and continue to the next author.

## Next Recommended Movement

| Rank | Movement | Reason |
|---:|---|---|
| 1 | Publisher imprint review queue | Resolve low-confidence and unresolved certified imprint items now that adoption coverage is complete |
| 2 | Contract reconciliation | Locate/link historical contract evidence for adopted catalog titles |
| 3 | Stripe migration planning | Migrate authors only when payment/royalty onboarding is scheduled and authorized |

## Current Constraints

- Contracts are not linked until historical contract location is confirmed.
- Stripe migration is not automatic; existing payment method remains authoritative until migration is scheduled.
- Royalty migration and payments remain outside OP-000 adoption.
- SharePoint workspace search/link must happen before any workspace creation.
- JM Signature and missing-imprint records require Publisher review before imprint certification.
