# PROGRAM-002 Enterprise Coverage Dashboard

**Program:** PROGRAM-002 - Autonomous Publishing Production Pipeline  
**Mode:** Enterprise Adoption Operations  
**Status:** Active baseline  
**Date:** 2026-07-06  
**Primary KPI:** Enterprise Coverage

## Executive Coverage

| Metric | Current Value | Source / Notes |
|---|---:|---|
| Total catalog titles | 122 | `data/books.json` |
| Catalog titles adopted into PROGRAM-002 | 12 | Track B certified: 2 prior adopted titles plus 10 Wave 1 titles |
| Active pipeline titles adopted | 1 | Track A certified: *Establishing Glory: The Library* |
| Published authors in catalog | 71 | Unique author names in `data/books.json` |
| Published authors adopted | 12 | J. Derrick Johnson; Alice V Pryor; 10 Wave 1 authors |
| Active Author Workspaces certified | 13 | One Active Author Workspace; twelve Published Author Workspaces |
| Contracts linked | 0 confirmed | 10 Wave 1 contracts marked Signed / Exists - Location Pending Reconciliation |
| Stripe-ready authors | 0 confirmed | Stripe migration is flagged, not performed automatically |
| Royalty-ready authors | 0 confirmed | Royalty migration is explicitly deferred |
| OP-000 remaining catalog titles | 110 | Total catalog titles minus adopted Track B catalog titles |
| OP-000 remaining published authors | 59 | Total catalog authors minus adopted published authors |
| Enterprise Coverage % | 9.84% | 12 adopted catalog titles / 122 catalog titles |

## Coverage by Imprint

| Imprint | Catalog Titles | Adopted Titles | Remaining | Notes |
|---|---:|---:|---:|---|
| J Merrill Publishing | 67 | 4 | 63 | Standard adoption path unless metadata conflicts appear |
| JM Works | 35 | 5 | 30 | Standard adoption path |
| JM Little | 12 | 1 | 11 | Standard adoption path with children's-book metadata review |
| JM Verse | 5 | 3 | 2 | Standard adoption path |
| JM Signature | 1 | 0 | 1 | Publisher review required; never auto-lock |
| Missing imprint | 2 | 0 | 2 | Catalog hygiene required before certification |

## Operational Interpretation

Enterprise Coverage is now measured by catalog titles adopted into PROGRAM-002, not by pilot completion. Track A and Track B proved the method; each subsequent adoption should increase the adopted-title count, published-author count, workspace count, contract-link count, and migration-readiness count as evidence becomes available.

## Current Operating Rhythm

1. Select the next author from the Enterprise Adoption Queue.
2. Discover existing Contact, title, contract, workspace, royalty, distribution, and asset evidence.
3. Validate the evidence without recreating history.
4. Link existing records and populate only missing governed fields.
5. Write historical `jm1_executionlog` events.
6. Certify the author/title.
7. Update this dashboard and continue to the next author.

## Next Recommended Adoption

| Rank | Author | Title | Reason |
|---:|---|---|---|
| 1 | Wayne Pounds | *Number 23 and Me* | Single-title author, clean metadata, non-Signature imprint |
| 2 | Essence Unique | *Your Brain Has Too Much What, Mommy??* | Single-title author, clean metadata, non-Signature imprint |
| 3 | Johnson Settles | *7 Step Jumpstart to Becoming Your Best Self* | Single-title author, clean metadata, non-Signature imprint |

## Current Constraints

- Contracts are not linked until historical contract location is confirmed.
- Stripe migration is not automatic; existing payment method remains authoritative until migration is scheduled.
- Royalty migration and payments remain outside OP-000 adoption.
- SharePoint workspace search/link must happen before any workspace creation.
- JM Signature and missing-imprint records require Publisher review before imprint certification.
