# The Intentional Leader Source-Lineage Reconciliation

Generated: 2026-08-02

## Controlling Result

PR #399 was merged to preserve the corrected evidence classification:

| Field | Value |
| --- | --- |
| PR | #399 |
| Final reviewed head | `28e6d9d0f7ff772d4ab1edb99293f77b976ca5c0` |
| Merge SHA | `a16ffd38b83bc4f36e495982f8b8dba46261f7fd` |
| Corrected classification | `INCOMPLETE_LAYOUT_SOURCE` |

The registered live Layout DOCX is not a valid source for the current 393-page author-review PDF.

## Reconciled Disposition

Disposition:

`APPROVED_AUTOMATED_LAYOUT_GENERATION_CHAIN_RECOVERED`

The current evidence supports recovery of the approved automated layout generation chain. The prior Vellum-only requirement is withdrawn: Vellum is a historical/manual reference tool and structural standard, not a mandatory production engine for this title unless separately commissioned by Jackie.

| Item | Result |
| --- | --- |
| Approved automated layout generation chain recovered | YES |
| Native Vellum title project required | NO |
| Registered Layout DOCX complete | NO |
| Automated layout source registration reconciliation | REQUIRED |
| PDF generator class | APPROVED_AUTOMATED_LAYOUT_PROCESS |
| Generator evidence | LibreOffice headless body conversion plus pypdf front-matter assembly |
| Current live PDF checksum | `dfc25985d495a425935751ab33ab108c372c9373141940fb44ddffc9cf12aca3` |
| Recovered release-candidate checksum | `dfc25985d495a425935751ab33ab108c372c9373141940fb44ddffc9cf12aca3` |

## Source Conflict

| Asset | SHA-256 | Size / Pages | Date coverage | Classification |
| --- | --- | --- | --- | --- |
| Approved Proofreading DOCX | `d038b45dddb7b797cc69d576f5fbeb4520a85d84c61162c180c506666200b922` | 466,220 bytes | Jan 1-Mar 31, 90 / 90 | CANONICAL_CONTENT_SOURCE |
| Registered Layout DOCX | `21e9d06ce444bee5289846a448969dfe783e0c81f276904b75f62b122d106a9b` | 21,573 bytes | Jan 1-Jan 5, 5 / 90 | INCOMPLETE_LAYOUT_INTERMEDIATE |
| Current Interior PDF | `dfc25985d495a425935751ab33ab108c372c9373141940fb44ddffc9cf12aca3` | 811,688 bytes / 393 pages | Jan 1-Mar 31, 90 / 90 | AUTOMATED_AUTHOR_REVIEW_PROOF |

The incomplete registered Layout DOCX must be superseded or reclassified so it is not treated as current production authority. It should remain preserved as historical evidence.

## Recovered Generation Chain

The existing governed proof package `JM1-INTENTIONAL-LEADER-INTERIOR-LAYOUT-PROOF-2026-08-01` contains the recovered chain:

| Component | SHA-256 | Role | Classification |
| --- | --- | --- | --- |
| `2026-08-01-The-Intentional-Leader-Volume-I-Interior-Layout-Production-Source.docx` | `d038b45dddb7b797cc69d576f5fbeb4520a85d84c61162c180c506666200b922` | Approved proofread manuscript copy used as body content source | CANONICAL_CONTENT_SOURCE |
| `2026-08-01-The-Intentional-Leader-Volume-I-Interior-Layout-Production-Proof.pdf` | `723fc053774d733d1293082a75e34c6cc958b960f7474a2ff7b9408be32a4269` | 388-page rendered body proof | APPROVED_AUTOMATED_LAYOUT_COMPONENT |
| `2026-08-01-The-Intentional-Leader-Interior-Layout-Author-Review-Front-Matter.pdf` | `fcd6bebc8f88d839edda4eef7c8df5803fce04ecd7f47605d7c7f09d8dfe99fc` | 5-page rendered author-review front matter | APPROVED_AUTOMATED_LAYOUT_COMPONENT |
| `2026-08-01-The-Intentional-Leader-Interior-Layout-Author-Review-Release-Candidate.pdf` | `dfc25985d495a425935751ab33ab108c372c9373141940fb44ddffc9cf12aca3` | 393-page assembled output | AUTOMATED_AUTHOR_REVIEW_PROOF |

The release-candidate PDF checksum exactly matches the current SharePoint/Dataverse-readback current Interior PDF checksum.

## PDF Metadata and Structural Fingerprints

| Check | Result |
| --- | --- |
| Page count | 393 |
| PDF version | 1.7 |
| Producer metadata | pypdf |
| Creator metadata | Not present |
| Bookmark count | 0 |
| Extracted date entries | 90 / 90 |
| First entry present | January 1 |
| Last entry present | March 31 |

The metadata supports the recovered automated assembly chain. No native Vellum-origin assertion is required for the current PDF.

## Automated Layout Authority

The canonical production chain for this title is:

Approved Proofreading DOCX
-> approved automated body-layout generation
-> approved automated front-matter assembly
-> complete author-review PDF

| Authority field | Value |
| --- | --- |
| Approved source checksum | `d038b45dddb7b797cc69d576f5fbeb4520a85d84c61162c180c506666200b922` |
| Automation implementation | LibreOffice headless body conversion plus pypdf front-matter assembly |
| Template/reference standard | JMP standard title structure; Vellum-derived formatting reference |
| Output checksum | `dfc25985d495a425935751ab33ab108c372c9373141940fb44ddffc9cf12aca3` |
| Output page count | 393 |
| Body coverage | PASS: 90 / 90 dated entries |
| TOC coverage | PASS: complete body represented |
| Missing entries | 0 |
| Duplicate entries | 0 |
| Out-of-order entries | 0 |

The 393-page PDF may still require correction for confirmed production/content defects such as copyright-page completeness, metadata, disclaimer selection, or front-matter content. It must not be rejected solely because it was not generated in Vellum.

## Author State Preservation

The production author state must remain:

| Field | Value |
| --- | --- |
| Title | The Intentional Leader |
| Stage | Interior Layout |
| Author response | `QUESTIONS_OR_CLARIFICATION_REQUESTED` |
| Approval given | NO |
| Author overdue | NO |
| Response clock | 0 |
| Corrected resend | NOT AUTHORIZED UNTIL READINESS REVIEW |

Do not infer approval from PR #399, this reconciliation, or the recovered source chain.

## Required Production Correction

Before corrected delivery can proceed:

1. Supersede or reclassify the 21 KB registered Layout DOCX from current production authority.
2. Record the automated layout execution lineage as the production authority instead of relying on the incomplete DOCX.
3. Complete copyright/front-matter readiness review against current publishing policy.
4. Correct confirmed production defects while preserving the previously approved visual format.
5. Regenerate through the approved automated layout process only if rendered content must change.
6. Confirm actual proof page count matches the manifest.
7. Run author-safe package QA under the email-first reset.
8. Prepare corrected replacement but do not send until Jackie readiness review authorizes delivery.

## Permanent Guard Requirement

Any Interior Layout proof marked release-eligible must fail closed when source lineage is incomplete or unproven.

Required failure codes:

- `INCOMPLETE_LAYOUT_SOURCE`
- `UNPROVEN_INTERIOR_PROOF_LINEAGE`
- `LAYOUT_SOURCE_COVERAGE_MISMATCH`
- `INCOMPLETE_LAYOUT_INTERMEDIATE`
- `LAYOUT_EXECUTION_NOT_FOUND`
- `PROOF_SOURCE_RELATIONSHIP_MISSING`
- `AUTOMATED_LAYOUT_OUTPUT_INCOMPLETE`
- `PROOF_CONTENT_FIDELITY_FAILURE`

If the proof was generated by the approved automated renderer, the guard must record the generator, source checksum, execution lineage, output checksum, coverage, and QA result. Vellum-specific failures apply only to a separately commissioned manual Vellum workflow.

## Final Classification

The lineage investigation is complete at the evidence layer.

Current release status:

`AUTOMATED_LAYOUT_AUTHORITY_RECONCILIATION_REQUIRED`

The proof must not be resent until the incomplete Layout DOCX is superseded or reclassified, automated production records are reconciled, confirmed production defects are corrected, author-safe QA passes, and Jackie readiness review authorizes corrected delivery.
