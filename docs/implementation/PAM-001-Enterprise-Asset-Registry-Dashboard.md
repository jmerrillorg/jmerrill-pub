# PAM-001 - Enterprise Asset Registry Dashboard

**Generated:** 2026-07-07T03:06:11Z
**Status:** Staging dashboard; no Dataverse import performed

## Build State

| Area | Status |
| --- | --- |
| JM1-Dev baseline | Complete |
| IS-009 schema | Deployed and validated |
| Migration staging engine | Operational |
| Registry health engine | Operational for staging |
| Dataverse import | Not started |
| SharePoint file movement | Not started |
| Royalty/payment activity | Not touched |

## Registry Staging Metrics

| Metric | Value |
| --- | ---: |
| Title candidates | 162 |
| Publishing asset candidates | 295 |
| Marketplace candidates | 537 |
| Assets with title link | 100.0% |
| Assets with ISBN | 99.32% |
| Assets with author evidence | 63.39% |
| Assets with format | 100.0% |
| Marketplace rows with identifier | 90.32% |
| Duplicate ISBN conflicts | 0 |

## Exception Queue

| Exception | Count |
| --- | ---: |
| MISSING_AUTHOR | 108 |
| MISSING_ISBN | 2 |
| MISSING_MARKETPLACE_IDENTIFIER | 52 |

## Marketplace Distribution

| Marketplace | Candidate Rows |
| --- | ---: |
| ACX | 2 |
| Amazon Digital Services, Inc | 8 |
| Amazon KDP | 4 |
| Apple Inc. | 5 |
| CoreSource | 110 |
| Global - Germany | 11 |
| Global - Singapore | 1 |
| Google Inc | 1 |
| INaudio, LLC | 2 |
| Kobo Books | 1 |
| LS-United Kingdom | 5 |
| LS-United States | 80 |
| Libri GmbH | 1 |
| Midwest Tape LLC | 25 |
| OverDrive, Inc. | 2 |
| Perlego | 1 |
| Proquest LLC | 2 |
| Publisher Registry | 271 |
| Scribd Inc. | 1 |
| Speechify, Inc | 2 |
| Taylor Made: My Life, My Story, 9781961475212 | 1 |
| eBooks.com | 1 |

## Next Actions

1. Review exception queues before import.
2. Approve asset health threshold and duplicate title/format/edition rules.
3. Harden service-principal metadata access before unattended automation.
4. Run controlled import only after validation approval.
