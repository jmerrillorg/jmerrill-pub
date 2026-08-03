# Interior Proof Source-Lineage Guard Requirement

Generated: 2026-08-02

## Purpose

Prevent an Interior Layout proof from becoming author-release eligible when the proof's registered source does not prove complete title coverage and generator lineage.

## Release-Eligibility Inputs

Every release-eligible Interior Layout proof must have:

| Input | Requirement |
| --- | --- |
| Canonical title | Matches package, gate, proof, and source artifacts |
| Canonical stage | Interior Layout |
| Current proof artifact | Exactly one current release-eligible proof |
| Source artifact relationship | Present and current |
| Source completeness | Covers the complete approved manuscript and canonical Vellum layout source |
| Generator record | Present |
| Manifest | Page count and checksum match actual proof |
| Supersession state | Failed or incomplete prior artifacts are not current |

## Fail-Closed Conditions

| Failure code | Trigger |
| --- | --- |
| `INCOMPLETE_LAYOUT_SOURCE` | Registered source coverage is materially incomplete compared with the approved manuscript or current proof. |
| `UNPROVEN_INTERIOR_PROOF_LINEAGE` | Current proof cannot be traced to a governed source and generator record. |
| `LAYOUT_SOURCE_COVERAGE_MISMATCH` | Source date/chapter/section coverage does not match the approved manuscript coverage required for the stage. |
| `MISSING_VELLUM_PROJECT` | Governance requires a native Vellum project for the proof and no project is registered. |
| `PROOF_SOURCE_RELATIONSHIP_MISSING` | Proof artifact lacks a current source-artifact relationship. |
| `NONCANONICAL_PDF_ASSEMBLY_PATH` | Proof was created through a non-Vellum assembly path without an approved emergency exception. |

## Non-Vellum Generator Handling

If a proof was generated outside Vellum, the system must not invent a Vellum source. It must record:

- actual generator;
- source file checksum;
- intermediate proof checksum, if applicable;
- assembly step, if applicable;
- final proof checksum;
- page count;
- source coverage;
- and QA result.

For The Intentional Leader, the recovered source chain is:

Approved proofread DOCX
-> LibreOffice headless 388-page body proof
-> pypdf assembly with 5-page front matter
-> 393-page author-review proof

## Dispatch Boundary

The author dispatch path must stop before send when any active Interior Layout proof returns one of the fail-closed codes above.

Dispatch may continue only when:

| Check | Required |
| --- | --- |
| Source-lineage guard | PASS |
| Manifest checksum | PASS |
| Page-count readback | PASS |
| Author-facing attachment QA | PASS |
| Email-first package QA | PASS |

## Current Title Application

The incomplete 21 KB Layout DOCX must be superseded from source authority before a corrected resend can occur.

The recovered LibreOffice/pypdf chain is sufficient to explain the prior PDF lineage, but it is historical rendered-proof evidence only. It does not satisfy the canonical Vellum production source requirement.
