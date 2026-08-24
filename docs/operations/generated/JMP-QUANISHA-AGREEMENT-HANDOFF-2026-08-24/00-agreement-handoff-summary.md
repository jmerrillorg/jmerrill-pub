# Quanisha Dockery / Indomitable Agreement Handoff Evidence

Last verified: 2026-08-24T11:22:36Z

## Scope

This evidence records the corrected manual-signature handoff package for Quanisha Dockery / *Indomitable* after the agreement DOCX generation path was found to produce malformed `word/document.xml` in the Publishing Agreement signature table.

This package does not authorize or record an author-facing send.

## Commercial State Used

- Author: Quanisha Dockery
- Title: Indomitable
- Opportunity: 455daa4a-629f-f111-b8dc-6045bdd69678
- Diagnostic/package ID: 572a89ef-cd95-f111-8076-7c1e525b15c2
- Package: Professional Publishing Package
- Principal: $4,500
- Payment option: 24 payments
- Payment policy: JMP_FINANCING_EARLY_PAYOFF_v1.1
- Payments 1-23: $209.06
- Payment 24: $209.12
- Total before tax: $5,017.50

## Corrected Handoff Files

The actual DOCX files were regenerated into the local handoff folder for Jackie:

`/Volumes/UsersExternal/Developer/codex-worktrees/jmerrill-pub-author-portfolio-continuation/.codex-handoff/quanishia-indomitable-agreement-package-572a89ef-corrected-20260824T1122Z/`

| File | SHA-256 |
| --- | --- |
| `JMP_Publishing_Agreement_FILLED_572a89ef-cd95-f111-8076-7c1e525b15c2.docx` | `4834782ee0b790767c7f0b2dfec3502214ae7fd0af106f06c34b28b6828c18b1` |
| `JMP_Publishing_Package_Addendum_FILLED_572a89ef-cd95-f111-8076-7c1e525b15c2.docx` | `d94f777c2ea3c1d04f0fd27a4399b70ef43c868e78e1127d9e90b76ed99c78d3` |
| `JMP_Schedule_A_Payment_Schedule_572a89ef-cd95-f111-8076-7c1e525b15c2.docx` | `a602d42d98a30ec2432fbd81237b2c0db483cabd9c31a3a5e662f8d1a12d51d8` |

## Validation

- DOCX `word/document.xml` well-formedness: PASS for all three documents.
- LibreOffice render to PNG/PDF: PASS for all three documents.
- Publishing Agreement signature table render: PASS.
- Schedule A payment rows: PASS, including final payment $209.12 and total $5,017.50.

## Manual Send Boundary

- From: `publishing@email.jmerrill.one`
- Reply-To: `publishing@jmerrill.one`
- CC: `publishing@jmerrill.one`
- Format: HTML

No ACS send, Outlook send, e-sign send, Stripe action, payment link creation, production progression, or author-facing communication occurred in this correction.

## Runtime Repair

The malformed agreement root cause was a paragraph replacement helper matching `<w:pPr>` as though it were a `<w:p>` paragraph start. The repair constrains replacement to actual `<w:p>` tags and adds `word/document.xml` well-formedness validation to the DOCX validator so malformed Word documents cannot pass package-shape validation.
