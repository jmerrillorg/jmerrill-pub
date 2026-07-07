# JM Publishing Executive KPI Definitions

**Status:** Active KPI definitions for Enterprise Command Center v1
**Date:** 2026-07-07

## KPI Definitions

| KPI | Formula | Current Value | Data Source | Notes |
| --- | --- | ---: | --- | --- |
| Asset Health % | Assets at or above operational health threshold / total Publishing Assets | 100.00% | PAM-001 / IS-009 | Operationally healthy threshold is 85. |
| Asset Confidence % | Assets with High or Good confidence / total Publishing Assets | 50.17% | PAM-001 / IS-009 | Confidence measures identity/source trust, not completeness. |
| Author Evidence Confirmed % | Assets with confirmed author evidence / total Publishing Assets | 63.39% | PAM-001 / IS-009 | Unknown author evidence is imported and flagged. |
| Marketplace Identifier Confirmed % | Marketplace records with confirmed identifier / total Marketplace records | 90.04% | PAM-001 / IS-009 | Pending identifiers are imported and flagged. |
| Royalty Readiness % | Royalty-ready authors/assets / royalty-eligible denominator | Provisional | EOP-001 / future royalty workstream | Requires canonical Contact/title/asset roster. |
| Stripe Readiness % | Stripe-ready authors / payout-eligible author denominator | Provisional | EOP-001 / Stripe migration | Requires canonical author roster and migration readiness. |
| Contract Linked % | Titles/assets linked to signed agreement evidence / governed denominator | 0.00% | EOP-001 / contract reconciliation | Historical contracts remain location pending reconciliation. |

## KPI Governance

- Coverage remains a historical adoption metric, not the primary optimization KPI.
- Enterprise Health should be recomputed only from governed, current sources.
- Provisional metrics must stay labeled provisional until their denominator is canonical.
- PAM metrics use Dataverse readback evidence, not `books.json`.
