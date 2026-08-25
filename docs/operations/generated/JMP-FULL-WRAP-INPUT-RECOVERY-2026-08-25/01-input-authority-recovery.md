# Input Authority Recovery

Last verified: 2026-08-25T07:53:36Z

## Recovered Inputs

| Input | Value | Authority | Status |
| --- | --- | --- | --- |
| Title ID | `e797232b-da7a-f111-ab0f-00224820105b` | Dataverse `jm1pub_title` readback | GOVERNED |
| Title | The Intentional Leader, Volume I | Dataverse title and production task readback | GOVERNED |
| Author | Jackie Smith Jr | Dataverse title readback | GOVERNED |
| Task ID | `6dd4bddc-07a0-f111-b8dc-000d3a14673b` | Dataverse `jm1_productiontask` readback | GOVERNED |
| Trim size | `6 x 9` | Current active state and author-review delivery language | GOVERNED |
| Page count | `275` | Current active state and current approved artifact notes/checksum | GOVERNED |
| Imprint | J Merrill Publishing | Dataverse formatted `jm1pub_imprint` readback | GOVERNED |
| Front cover source asset | `The-Intentional-Leader-Cover-Concept-For-Author-Review.png` | SharePoint/OneDrive file and Cover Design author approval evidence | GOVERNED CONCEPT ASSET |
| Front cover checksum | `539c21a146812c38a5b33c065862c667a720926bc6777a14da41101d6350a774` | Local OneDrive hash readback and PR/live-action evidence | VERIFIED |
| Interior proof source asset | `The_Intentional_Leader_-_Corrected_Interior_Layout_Proof.pdf` | Dataverse artifact `43131113-4c94-f111-8076-000d3a14673b` | GOVERNED |
| Interior proof checksum | `0138d7a474cc4ab2d8369b4ae0642842d8bdbd041ec9029347b15daf051975ed` | Dataverse artifact and local OneDrive hash readback | VERIFIED |

## Unresolved Inputs

| Input | Recovery result | Governing issue |
| --- | --- | --- |
| PAPER_STOCK | NOT RECOVERED | No title-specific paper profile found in Dataverse title fields, production task, cover brief, active-state file, local title folders, or bounded Publishing mailbox search. |
| ISBN | NOT RECOVERED | Dataverse title `jm1_isbn` and `jm1_isbnnormalized` are null. ISBN governance says assignment occurs at the Production Metadata Gate with human approval. |
| BARCODE | NOT RECOVERED | No title-specific barcode artifact found. Barcode generation depends on assigned ISBN. |
| DISTRIBUTION_PATH | NOT RECOVERED | General canon favors IngramSpark/Ingram for standard print, but no title-specific distribution path/template for this 275-page proof was found. |
| BACK_COVER_COPY | NOT RECOVERED | No approved title-specific back-cover copy source found in current title folders, cover package, Dataverse title/project readback, or bounded Publishing mailbox search. |

## Search Surfaces Examined

- Dataverse title record
- Dataverse production task
- Dataverse production projects
- Dataverse editorial artifacts
- Dataverse opportunity
- Dataverse title metadata attributes
- Active state package
- Prior Full Wrap execution evidence
- ISBN assignment governance package
- Cover production canon cache
- Local OneDrive governed title folders
- Publishing shared mailbox bounded search for Intentional Leader, Full Wrap, ISBN, barcode, Ingram, and back-cover terms
- Repository governance, implementation, operations, scripts, and runner code

