# Validation Results

Last Verified: 2026-08-13T04:06:50Z

| Validation | Result | Notes |
| --- | --- | --- |
| Customer Voice project seed | PASS | Created/readback verified. |
| Customer Voice survey seed | PASS | Created/readback verified. |
| Customer Voice questions | PASS | 9 / 9 created/readback verified. |
| Public page source | PASS | `/experience` added. |
| Public link/button source | PASS | `Share Your Experience` added to public site surfaces. |
| Privacy review | PASS | No unnecessary sensitive author information requested. |
| Focused guard | PASS | `npm run cv01a-author-experience-guard`: 5 / 5 PASS. |
| Type-check | PASS | `npm run type-check`. |
| Production build | PASS | `npm run build`. |
| Local public page | PASS | `GET http://localhost:3100/experience`: 200. |
| Direct Dataverse storage validation | PASS | 1 response and 9 question responses created. |
| Staging public link | PASS | `GET https://app-jm1-pub-prod-staging.azurewebsites.net/experience`: 200. |
| Staging response submission | PASS | `POST /api/author-experience`: 201. |
| Production public link | PASS | `GET https://jmerrill.pub/experience`: 200. |
| Production response submission | PASS | `POST https://jmerrill.pub/api/author-experience`: 201. |
| Production Dataverse readback | PASS | Response `5ab8a564-cc96-f111-8076-6045bdd69435`; 9 question responses. |
| Author communications | PASS | 0 sent. |
| Client-title automation | PASS | FROZEN. |

## Environment Note

`npm ci` completed using the repository lockfile. The local machine is running Node 26.0.0 while the repository declares Node `>=24 <25`; this generated an engine warning but did not block install, type-check, focused guard, or build.
