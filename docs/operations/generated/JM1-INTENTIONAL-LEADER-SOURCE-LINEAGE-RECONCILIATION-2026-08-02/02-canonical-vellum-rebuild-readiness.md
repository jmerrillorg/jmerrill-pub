# Canonical Vellum Rebuild Readiness

Generated: 2026-08-03

## Current Decision

The prior investigation recovered the PDF generation chain, not the canonical editable Vellum production source.

| Control | Result |
| --- | --- |
| Approved Proofreading DOCX | COMPLETE / CANONICAL CONTENT SOURCE |
| Registered 21 KB Layout DOCX | INCOMPLETE / MUST BE SUPERSEDED |
| Prior 393-page PDF generation chain | RECOVERED |
| Native prior Vellum source | NOT RECOVERED |
| Editable canonical Layout source | NOT RECOVERED |
| Canonical Vellum rebuild | REQUIRED |

## Vellum Tool Readiness

| Item | Readback |
| --- | --- |
| Vellum app | `/Applications/Vellum.app` |
| Vellum version | 4.1.4 |
| Scriptable dictionary | Not exposed by `sdef` in this environment |

The absence of an AppleScript dictionary means Cody did not have a verified, noninteractive Vellum automation surface for importing the approved DOCX, applying metadata, generating the TOC, and exporting the proof.

## Template Candidate

| Field | Value |
| --- | --- |
| Template candidate | `Master Vellum 2026.vellum` |
| Local path | `/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/JM1-PUB/01_Pre-Pipeline/00_Inquiry/_Backlist/2026-Smith-TheIntentionalLeader/03_Design/Master Vellum 2026.vellum` |
| SHA-256 | `961a0ade5ab7d6e535119a503dfb1b8f491bdd17ccb3a2eb82887b224bb17055` |
| File type | Zip-format Vellum project |
| Archive members | `bookMetadata.plist`, `resourceMetadata.plist`, `content.vellumcontent`, logo image resources |

This template may be used as the governed Vellum Master 2026 starting point, but copying it alone would not create a title-specific project containing the 90 dated entries.

## Non-Fabrication Boundary

Cody did not create or register a canonical Vellum project in this pass because doing so safely requires one of:

1. a verified Vellum-supported import/export automation path;
2. interactive Vellum operation by an authorized production user with evidence capture;
3. or a documented internal production script that can create a valid `.vellum` project without corrupting Vellum internals.

Directly editing `content.vellumcontent` or renaming/copying the template as if it were populated would not satisfy the production-source requirement.

## Required Rebuild Procedure

The next production step remains:

Approved Proofreading DOCX
-> title-specific Vellum project using JMP Vellum Master 2026
-> Vellum-generated review proof
-> content-fidelity and visual QA
-> protected production registration
-> Jackie readiness review
-> corrected resend only after authorization

## Required Vellum Project Controls

The rebuilt project must prove:

| Check | Required Result |
| --- | --- |
| January entries | 31 |
| February entries | 28 |
| March entries | 31 |
| Total dated entries | 90 |
| Missing entries | 0 |
| Duplicate entries | 0 |
| Out-of-order entries | 0 |
| TOC source | VELLUM ELEMENT STRUCTURE |
| Copyright page | PASS |
| Internal template guidance exposed | 0 |
| Unused ISBN labels | 0 |
| Synthetic ISBNs | 0 |

## Author State

No author-facing state changes are authorized by this evidence correction.

| Field | Value |
| --- | --- |
| Stage | Interior Layout |
| Author response | RECEIVED |
| Response type | `QUESTIONS_OR_CLARIFICATION_REQUESTED` |
| Approval | NO |
| Response clock | 0 |
| Corrected resend | NOT AUTHORIZED |
