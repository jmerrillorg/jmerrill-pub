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

`ACTUAL_LAYOUT_SOURCE_RECOVERED`

The current evidence supports recovery of the actual non-Vellum layout-generation chain, not recovery of a native title-specific Vellum project.

| Item | Result |
| --- | --- |
| Native Vellum title project recovered | NO |
| Current 393-page PDF source chain recovered | YES |
| PDF generator class | OTHER |
| Generator evidence | LibreOffice headless body conversion plus pypdf front-matter assembly |
| Current live PDF checksum | `dfc25985d495a425935751ab33ab108c372c9373141940fb44ddffc9cf12aca3` |
| Recovered release-candidate checksum | `dfc25985d495a425935751ab33ab108c372c9373141940fb44ddffc9cf12aca3` |

## Source Conflict

| Asset | SHA-256 | Size / Pages | Date coverage | Classification |
| --- | --- | --- | --- | --- |
| Approved Proofreading DOCX | `d038b45dddb7b797cc69d576f5fbeb4520a85d84c61162c180c506666200b922` | 466,220 bytes | Jan 1-Mar 31, 90 / 90 | COMPLETE_APPROVED_SOURCE |
| Registered Layout DOCX | `21e9d06ce444bee5289846a448969dfe783e0c81f276904b75f62b122d106a9b` | 21,573 bytes | Jan 1-Jan 5, 5 / 90 | INCOMPLETE |
| Current Interior PDF | `dfc25985d495a425935751ab33ab108c372c9373141940fb44ddffc9cf12aca3` | 811,688 bytes / 393 pages | Jan 1-Mar 31, 90 / 90 | RELATED_BUT_NOT_SOURCE |

The incomplete registered Layout DOCX must be superseded from current source authority. It should remain preserved as historical evidence.

## Recovered Generation Chain

The existing governed proof package `JM1-INTENTIONAL-LEADER-INTERIOR-LAYOUT-PROOF-2026-08-01` contains the recovered chain:

| Component | SHA-256 | Role | Classification |
| --- | --- | --- | --- |
| `2026-08-01-The-Intentional-Leader-Volume-I-Interior-Layout-Production-Source.docx` | `d038b45dddb7b797cc69d576f5fbeb4520a85d84c61162c180c506666200b922` | Approved proofread manuscript copy used as body source | LIKELY_PDF_SOURCE |
| `2026-08-01-The-Intentional-Leader-Volume-I-Interior-Layout-Production-Proof.pdf` | `723fc053774d733d1293082a75e34c6cc958b960f7474a2ff7b9408be32a4269` | 388-page body proof | PROVEN_PDF_SOURCE |
| `2026-08-01-The-Intentional-Leader-Interior-Layout-Author-Review-Front-Matter.pdf` | `fcd6bebc8f88d839edda4eef7c8df5803fce04ecd7f47605d7c7f09d8dfe99fc` | 5-page author-review front matter | PROVEN_PDF_SOURCE |
| `2026-08-01-The-Intentional-Leader-Interior-Layout-Author-Review-Release-Candidate.pdf` | `dfc25985d495a425935751ab33ab108c372c9373141940fb44ddffc9cf12aca3` | 393-page assembled output | RELATED_BUT_NOT_SOURCE |

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

The metadata supports the recovered pypdf assembly chain and does not support a native Vellum-origin assertion for the current PDF.

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

1. Supersede the 21 KB registered Layout DOCX from current source authority.
2. Register the recovered complete layout source chain through the protected production mutation path.
3. Confirm the current proof or a regenerated proof is bound to the corrected source lineage.
4. Complete copyright/front-matter readiness review against current publishing policy.
5. Confirm actual proof page count matches the manifest.
6. Run author-safe package QA under the email-first reset.
7. Prepare corrected replacement but do not send until Jackie readiness review authorizes delivery.

## Permanent Guard Requirement

Any Interior Layout proof marked release-eligible must fail closed when source lineage is incomplete or unproven.

Required failure codes:

- `INCOMPLETE_LAYOUT_SOURCE`
- `UNPROVEN_INTERIOR_PROOF_LINEAGE`
- `LAYOUT_SOURCE_COVERAGE_MISMATCH`
- `MISSING_VELLUM_PROJECT`
- `PROOF_SOURCE_RELATIONSHIP_MISSING`

If the proof was generated outside Vellum, the guard must record the actual generator and complete source relationship rather than requiring a false Vellum assertion.

## Final Classification

The lineage investigation is complete at the evidence layer.

Current release status:

`CORRECTED_REPLACEMENT_PREPARED_NOT_SENT`

The proof must not be resent until the protected production records are reconciled and Jackie readiness review approves corrected delivery.
