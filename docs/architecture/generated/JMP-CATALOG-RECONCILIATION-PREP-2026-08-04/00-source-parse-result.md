# Catalog v2.1 Source Parse Result

Generated: 2026-08-04

## Boundary

Read-only catalog reconciliation preparation. No migration, deployment, repricing, retirement, amendment, Business Central item creation, Dataverse mutation, or catalog mutation was performed.

## Source Resolution

| Source | Path | Exists | SHA-256 |
|---|---|---:|---|
| Canon-candidate DOCX | `/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/Implementation HQ - Documents/Architecture/00_CANON/Publishing/JMP_Products_Services_Catalog_v2.1_CANON-CANDIDATE.docx` | TRUE | `f65bccb0fb588b001674b8e8bb90d0b910838ae3918c4a1233fcd6fd18b45799` |
| Canon-candidate PDF | `/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/Implementation HQ - Documents/Architecture/00_CANON/Publishing/JMP_Products_Services_Catalog_v2.1_CANON-CANDIDATE.pdf` | TRUE | `afaa0008269113b57023899f7a354177a3d29b0b93a087288a9e085149d8ef9d` |
| Governance DOCX | `/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/Implementation HQ - Documents/Architecture/01_GOVERNANCE/JMP_Products_Services_Catalog_v2.1.docx` | TRUE | `afccd38e6e6a4fac7fd170f8da006fbde2440cee93e3040cf4942774fd19e577` |
| 104-row worksheet | `/Users/jmerrillone/Developer/codex-worktrees/jmerrill-pub-catalog-reconciliation-prep/docs/operations/generated/2026-07-20-JMP-Catalog-Reconciliation-Worksheet.csv` | TRUE | `921545b91b8fbb843f2cdea1ecc0071bc8283ab2606aba9b666607314a04fab7` |
| 120-row amended worksheet | `/Users/jmerrillone/Developer/codex-worktrees/jmerrill-pub-catalog-reconciliation-prep/docs/operations/generated/2026-07-20-JMP-Catalog-Reconciliation-Worksheet-Amended.csv` | TRUE | `36c07c9c2f3015c8522c26db6899ea1fc6009deadbc678f1c84fda57c431d5f5` |

## Parse Result

| Check | Result |
|---|---|
| DOCX readable as ZIP package | PASS |
| `word/document.xml` parsed | PASS |
| Paragraphs extracted | 500 |
| Unique `JMP-*` SKUs extracted | 112 |
| Failure mode | `NONE` |

## Comparison Summary

| Comparison | Count |
|---|---:|
| DOCX unique SKUs | 112 |
| Original worksheet SKUs | 104 |
| DOCX SKUs absent from original 104-row worksheet | 16 |
| Original worksheet SKUs not found in DOCX parse | 8 |
| DOCX SKUs absent from amended 120-row worksheet | 0 |

The parse succeeded. The 16 DOCX SKUs absent from the original 104-row worksheet match the amendment delta already represented in the 120-row amended worksheet. The eight worksheet-only SKUs remain preserved as worksheet/candidate evidence and require Jackie ruling rather than silent removal.
