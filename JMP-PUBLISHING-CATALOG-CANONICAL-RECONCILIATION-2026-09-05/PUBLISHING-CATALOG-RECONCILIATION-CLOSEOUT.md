# Publishing Catalog Reconciliation Closeout

Date: 2026-09-05  
Correlation ID: `JMP-CATALOG-CANONICAL-20260905`  
Source SHA-256: `c48f2335c64e3952d2068d271a0e1f43fc28430960c839e2c4d5b54d4ab51316`

1. **SOURCE ROWS:** 411 total source rows; 300 product rows and 111 reserved ISBN rows. Raw source values are preserved verbatim.
2. **RESERVED ISBNs:** 111 `RESERVED_UNASSIGNED_ISBN` allocations, stored separately and excluded from works, authors, products, distribution, and Marketing eligibility.
3. **AUTHORS:** 82 canonical Publisher author identities. Nineteen Contacts were added after deterministic identity reconciliation; known spelling and name variants were merged without duplicating authors.
4. **CANONICAL WORKS:** 129. Existing IDs were preserved for 127; two governed Work rows were added for *Strategies for Success* and *The Tithe Is the Lord's*.
5. **EDITIONS:** 133 governed edition or release-instance rows.
6. **FORMAT PRODUCTS:** 300. Existing IDs were preserved for 292; eight products were added.
7. **PUBLISHER_ORIGIN_CONFIRMED:** 129 of 129 Works.
8. **AUTHORITY CHANGES FOUND:** 0 in available governed evidence. The Microsoft Graph evidence search was blocked by the current token's missing Files/Sites read scope; this limitation is recorded. Available Publisher-governed commissioning records affirm zero real-title retirements, reversions, or distribution takedowns and establish that none occur automatically.
9. **ACTIVE WORKS:** 129.
10. **RETIRED WORKS:** 0.
11. **INACTIVE WORKS:** 0.
12. **WITHDRAWN / RIGHTS-REVERTED WORKS:** 0.
13. **UNRESOLVED WORKS:** 0.
14. **MARKETING_ELIGIBLE:** 129.
15. **MARKETING_HELD:** 0.
16. **MARKETING_PROHIBITED:** 0; `MARKETING_AUTHORITY_UNRESOLVED` is also 0.
17. **SHELLEY MCINTOSH RESULT:** Exactly three canonical Works and eight format Products: *A Principal's Tale* (2), *Memoir of a Black Christian Nationalist* (4), and *Warriors and Angels* (2). No filesystem-only title claims were promoted.
18. **ESTABLISHING GLORY RESULT:** Three release families retained: the 2019 original, 2021 reissue, and later product family. Historic products remain preserved and distribution is product-specific.
19. **BEE CAREFUL RESULT:** Two complete same-date ISBN families retained as parallel editions; neither was deleted or silently superseded.
20. **GREAT HAIR RESTART RESULT:** The 2024 family is the original edition and the 2025 family is a new edition. Both are preserved with source-defined product distribution.
21. **LEGACY CODE DEFINITIONS:** Status, House, and Contract remain `OPAQUE_LEGACY_CODE`; raw values are preserved. IsDistributed Y/N is used only as the explicit workbook distribution flag and never as contract or Marketing authority.
22. **DATAVERSE PROMOTION:** Complete in Core. Initial ledger: 692 successful writes, comprising 273 creates and 419 updates, with 0 deletes. A 129-row additive lifecycle-detail update also completed successfully. Final readback validates 129 Works, 133 Editions, 300 Products, and 111 reserved ISBN allocations.
23. **IDEMPOTENCY:** Proven. Final replay reports 0 creates, 0 updates, 692 no-ops, and 0 deletes.
24. **DOWNSTREAM MARKETING CONTRACT:** Implemented as `listPublishingMarketingAuthority()` in the Publishing runtime with all 17 required fields. It selects only canonical reconciliation rows and derives eligibility from explicit Publishing authority, not legacy fields. Internal operating classification now prefers explicit canonical state.
25. **FOUNDER DECISIONS REQUIRED:** One governance decision only: approve or decline the Canon Candidate. There are no title-by-title reconciliation exceptions.
26. **CANON RATIFIED:** `JMP Catalog Authority & Product Identity Standard v0.1` was approved and ratified by Founder on 2026-09-05. The former Canon Candidate status is superseded.
27. **FINAL CLASSIFICATION:** `JMP CATALOG AUTHORITY - OPERATIONALLY RESTORED`, subject only to the separately stated Founder governance gate. The underlying reconciliation classification is `JMP CATALOG - CANONICALLY RECONCILED`.
28. **COMMITS / PR / EVIDENCE:** Initial implementation commit `08ebe765` is published in PR [#723](https://github.com/jmerrillorg/jmerrill-pub/pull/723). Source, normalization registers, Dataverse plans and ledgers, independent validation, replay proof, authority-search record, governance candidate, and the accompanying final workbook are indexed by SHA-256 in this package.

## Protection Proof

- *The Shift* remains Sean A Crowley I, release 2026-08-18, `NEW_RECENTLY_RELEASED`.
- *Strategies for Success* remains Sean A Crowley I, release 2026-09-22, `ACTIVE_LAUNCH_LIFECYCLE`.
- *A Portrait of Paradise* and *The Conquest of Azenga* remain active.

## Founder Gate

The data commission and operational restoration are complete. Founder approval is requested only for the Canon Candidate; no routine catalog-maintenance decision or per-title approval is required.
