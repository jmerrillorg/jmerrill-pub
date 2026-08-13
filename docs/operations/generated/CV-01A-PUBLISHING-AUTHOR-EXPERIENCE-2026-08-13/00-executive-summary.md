# CV-01A Publishing Author Experience Evidence Package

Last Verified: 2026-08-13T04:06:50Z

## Scope

CV-01A creates the Publishing Author Experience feedback path using the JM1 enterprise Customer Voice / Dataverse pattern.

## Current State

| Item | State |
| --- | --- |
| Target repository | J Merrill Publishing |
| Customer Voice project | CREATED / READBACK VERIFIED |
| Customer Voice survey | CREATED / READBACK VERIFIED |
| Publishing-specific questions | 9 / 9 CREATED |
| Sensitive author information requested | NO |
| Public website source | CHANGED |
| Public deployment | COMPLETE / PRODUCTION VERIFIED |
| Local public page check | PASS |
| Dataverse storage validation | PASS |
| Publishing access boundary | PASS |
| Runtime contract changes | 0 |
| Agreement changes | 0 |
| Catalog changes | 0 |
| Title/PF runtime changes | 0 |
| Author communications | 0 |
| Client-title automation | FROZEN |

## Deployment Evidence

| Item | Value |
| --- | --- |
| PR | `#493` |
| Merge SHA | `ad7cb42aaacb7d9c25addd038251a1bd896fe240` |
| Staging workflow run | `31665223388` / SUCCESS |
| Production workflow run | `31665539440` / SUCCESS |
| Production URL | `https://jmerrill.pub/experience` |
| Production page check | 200 |
| Production submission check | 201 |
| Production validation response ID | `5ab8a564-cc96-f111-8076-6045bdd69435` |
| Production validation question responses | 9 |

## Evidence Index

| File | Purpose |
| --- | --- |
| `01-customer-voice-configuration.md` | Customer Voice project, survey, and question readback. |
| `02-question-set-and-privacy-review.md` | Publishing question set and privacy-minimization review. |
| `03-public-link-and-website-surface.md` | Website link/button source changes and local public page check. |
| `04-dataverse-storage-and-access-boundary.md` | Dataverse response-storage validation and Publishing source boundary. |
| `05-validation-results.md` | Build, type-check, focused guard, and submission/storage results. |
| `checksums.sha256` | Evidence checksum manifest. |
