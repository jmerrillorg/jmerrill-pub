# JMP Public Catalog Authority + Website Projection

Last Verified: 2026-08-27T22:56:00-04:00

This package records the governed website-projection implementation for `jmerrill.pub`.

The public website now has an explicit projection authority layer: public title and author pages are derived from Dataverse catalog records, publishing assets, marketplace records, and the governed public author identity resolver. Retailer and Amazon data remain verification evidence only.

| Area | Result |
| --- | --- |
| Runtime source of truth | Dataverse public catalog adapter |
| Static `data/books.json` runtime import | Prohibited by guard |
| Public projection API | Added: `/api/public-catalog` |
| Title page contract | `/books/{canonical-title-slug}` |
| Author page contract | `/authors/{canonical-author-slug}` |
| `TITLE_LIVE_AND_VERIFIED` gate | Requires JMP public catalog projection evidence |
| SEO / JSON-LD | Added for title and author pages |
| Validation | PASS |
| Public deployment | Pending PR merge/deployment |

No catalog language, prices, author communications, Stripe records, Dataverse data, Business Central data, or external retailer listings were modified by this repository change.
