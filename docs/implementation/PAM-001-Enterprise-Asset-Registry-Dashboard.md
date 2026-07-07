# PAM-001 - Enterprise Asset Registry Dashboard

**Generated:** 2026-07-07T03:36:06Z
**Status:** Operational registry dashboard for JM1-Dev

## Build State

| Area | Status |
| --- | --- |
| JM1-Dev baseline | Complete |
| IS-009 schema | Deployed and validated |
| Migration staging engine | Operational |
| Registry health engine | Operational |
| Dataverse import | Complete in JM1-Dev |
| Reconciliation queue | Active |
| SharePoint file movement | Not started |
| Royalty/payment activity | Not touched |

## Registry Import Metrics

| Metric | Value |
| --- | ---: |
| Intellectual Works represented | 162 |
| Titles created | 113 |
| Titles reused | 49 |
| Titles updated | 49 |
| Publishing assets created | 295 |
| Publishing assets reused | 0 |
| Marketplace records created | 522 |
| Marketplace records reused | 15 |
| Execution-log events written | 2 |
| Duplicate Publishing Asset names | 0 |
| Duplicate normalized ISBN observations | 0 |

## Registry Health

| Metric | Value |
| --- | ---: |
| Asset Health: Healthy | 295 |
| Asset Confidence: High | 148 |
| Asset Confidence: Reconciliation Required | 147 |
| Author Evidence: Confirmed | 187 |
| Author Evidence: Unknown / Pending Reconciliation | 108 |
| Marketplace Identifier: Confirmed | 470 |
| Marketplace Identifier: Pending Identification | 52 |

Operational health threshold:

- 95-100: Healthy
- 85-94: Operational / Good
- 70-84: Needs Attention
- Below 70: Action Required
- Operationally healthy threshold: 85

## Reconciliation Queue

| Queue | Count |
| --- | ---: |
| Publishing assets requiring reconciliation | 147 |
| Marketplace records requiring reconciliation | 52 |

| Reason | Count |
| --- | ---: |
| Author evidence unknown / pending reconciliation | 108 |
| Marketplace identifier pending | 89 |
| Missing ISBN | 2 |

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

1. Work the reconciliation queue without blocking registry operations.
2. Harden service-principal metadata access before unattended automation/promotion.
3. Decide production promotion path after JM1-Dev acceptance.
4. Keep SharePoint file movement, royalties, and payments outside PAM until separately authorized.

## Evidence

- `docs/implementation/evidence/IS-009/is009-registry-import-evidence.json`
- `docs/implementation/evidence/IS-009/is009-registry-operational-validation.json`
- `docs/implementation/PAM-001-Operational-Certification-Report.md`
- `docs/implementation/JM-Publishing-Enterprise-Command-Center.md`
