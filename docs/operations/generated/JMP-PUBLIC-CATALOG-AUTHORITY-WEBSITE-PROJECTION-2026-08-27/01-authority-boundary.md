# Authority Boundary

Last Verified: 2026-08-27T22:56:00-04:00

| Source | Governed role |
| --- | --- |
| Dataverse `jm1pub_title` | Title identity, slug, public catalog status, publication status, author display, descriptions, imprint, genre, dates |
| Dataverse publishing assets | Format, ISBN, cover URL, asset status |
| Dataverse marketplace records | Retailer/listing evidence and links |
| Public author identity resolver | Public, pen-name, anonymous, and hidden author projection |
| `jmerrill.pub` | JMP-controlled public author/title surface |
| Amazon / retailers | Verification evidence only; not public-catalog authority |

The runtime source guard preserves the boundary by rejecting imports of `data/books.json` from runtime app, component, and library code.
