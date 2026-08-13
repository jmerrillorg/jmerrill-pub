# Public Link And Website Surface

Last Verified: 2026-08-13T04:06:50Z

## Public Surface

| Surface | State |
| --- | --- |
| Public path | `/experience` |
| Public URL | `https://jmerrill.pub/experience/` |
| Button/link label | `Share Your Experience` |
| Website source changed | YES |
| Public deployment | COMPLETE / PRODUCTION VERIFIED |

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

## Public Page Checks

| Check | Result |
| --- | --- |
| `GET http://localhost:3100/experience` | 200 |
| `GET https://app-jm1-pub-prod-staging.azurewebsites.net/experience` | 200 |
| `GET https://jmerrill.pub/experience` | 200 |

The production public link is live at `https://jmerrill.pub/experience`.
