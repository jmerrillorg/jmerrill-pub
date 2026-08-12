# Validation Results

Last verified: 2026-08-12T11:38:36Z

## DOCX Structural Validation

| Check | Result |
| --- | --- |
| Required OOXML parts present | PASS |
| Legacy `Signature Publishing Package` text in v4.1 | 0 |
| Legacy `Signature Publishing Partnership` text in v4.1 | 0 |
| Legacy `JMP-PKG-SIGNATURE` text in v4.1 | 0 |
| `Premier Publishing Package` present | PASS |
| `JMP-PKG-PREMIER` present | PASS |
| JM Signature boundary note present | PASS |
| Author signature line preserved | PASS |

## Visual Validation

LibreOffice/packaged `render_docx.py` full DOCX-to-PNG render could not be completed in this resumed environment because the bundled document runtime was unavailable and LibreOffice was not installed.

Best-available visual check:

- macOS Quick Look generated one thumbnail preview at `rendered/JMP_Publishing_Package_Addendum_v4.1.docx.png`.
- The preview showed the first-page package table with Starter, Professional, and Premier rows and `JMP-PKG-PREMIER`.

This is a thumbnail sanity check, not a full LibreOffice page-by-page render pass.

## Test Results

| Command | Result |
| --- | --- |
| `npm ci` | PASS with Node 26 engine warning; repository declares Node 24 |
| `cd azure-functions/diagnostic-ai-runner && npm ci` | PASS with Node 26 engine warning; functions package declares Node >=22 <25 |
| Expanded agreement/package/template suite | 122 / 122 PASS |
| Active agreement stack/template guard | PASS; verifies v1.3.1 + v4.1 |
| `npm run type-check` | PASS |
| `npm run tranche3-title-pf-runtime-guard` | 10 / 10 PASS |
| `npm run tranche6-certification-controlled-thaw-guard` | 9 / 9 PASS |

## Boundary Validation

| Boundary | Result |
| --- | --- |
| Author-facing sends | 0 |
| Agreement signatures | 0 |
| Runtime deployment | 0 |
| Dataverse mutation | 0 |
| Business Central mutation | 0 |
| Website deployment | 0 |
