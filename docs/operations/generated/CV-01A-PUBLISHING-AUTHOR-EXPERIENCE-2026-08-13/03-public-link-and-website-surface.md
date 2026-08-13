# Public Link And Website Surface

Last Verified: 2026-08-13T03:49:51Z

## Public Surface

| Surface | State |
| --- | --- |
| Public path | `/experience` |
| Public URL | `https://jmerrill.pub/experience/` |
| Button/link label | `Share Your Experience` |
| Website source changed | YES |
| Public deployment | PENDING GOVERNED APP SERVICE WORKFLOW |

## Source Locations

| File | Change |
| --- | --- |
| `app/experience/page.tsx` | Added public Author Experience feedback page. |
| `app/experience/AuthorExperienceSurveyClient.tsx` | Added author-facing feedback form. |
| `app/api/author-experience/route.ts` | Added Dataverse-backed submission route. |
| `app/publishing/page.tsx` | Added `Share Your Experience` action. |
| `app/author-journey/page.tsx` | Added `Share Your Experience` action. |
| `app/contact/page.tsx` | Added `Share Your Experience` action. |
| `lib/tokens.ts` | Added footer link under Author Support. |

## Local Public Page Check

| Check | Result |
| --- | --- |
| `GET http://localhost:3100/experience` | 200 |

The deployed public link must be rechecked after the App Service workflow promotes the validated source to production.
