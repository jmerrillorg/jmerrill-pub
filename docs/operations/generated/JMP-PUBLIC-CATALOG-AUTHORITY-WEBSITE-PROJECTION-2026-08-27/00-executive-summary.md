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
| Readiness correction | Public-page blockers are separated from metadata warnings |
| SEO / JSON-LD | Added for title and author pages |
| Validation | PASS |
| Public deployment | Completed on merge SHA `2dd56a81a4fa5d5c425ee72fb461f4e3c7afc48f`; readiness correction pending follow-up deploy |

No catalog language, prices, author communications, Stripe records, Dataverse data, Business Central data, or external retailer listings were modified by this repository change.
