# Regression Results

Last verified: 2026-08-10T14:04:00Z

Command:

`npm run human-review-artifact-readiness-guard`

Result:

`22 / 22 PASS`

Required cases:

| # | Case | Result |
| ---: | --- | --- |
| 1 | Creative brief exists, no cover concept -> INTERNAL REVIEW blocked | PASS |
| 2 | Concept-development Markdown package exists, no visual concept -> blocked | PASS |
| 3 | Visual concept exists but wrong title -> blocked | PASS |
| 4 | Visual concept exists but superseded -> blocked | PASS |
| 5 | Visual concept exists but no governed reference -> blocked | PASS |
| 6 | Visual concept exists but reviewer cannot access -> blocked | PASS |
| 7 | Visual concept exists and all requirements pass -> INTERNAL REVIEW eligible | PASS |
| 8 | Reviewer-access link/reference resolves correctly | PASS |
| 9 | Brief cannot masquerade as review artifact | PASS |
| 10 | Evidence artifact cannot masquerade as review artifact | PASS |
| 11 | Duplicate review artifacts produce hold/review-required | PASS |
| 12 | Correct review artifact preserves checksum/version | PASS |
| 13 | Entry to internal review records assigned reviewer | PASS |
| 14 | Entry defines the human decision required | PASS |
| 15 | No artwork is generated merely by readiness evaluation | PASS |
| 16 | No author communication is sent | PASS |
| 17 | No marketing activation occurs | PASS |
| 18 | No financial/distribution activity occurs | PASS |
| 19 | Retry is idempotent | PASS |
| 20 | Corrective rollback from falsely-ready review state preserves execution lineage | PASS |

Additional cases:

| Case | Result |
| --- | --- |
| Contract definitions cover six governed human gates | PASS |
| Current The Intentional Leader reality check is not review-ready without visual artifact | PASS |

Additional validation:

- `npm run type-check`: PASS
- `JITI_CACHE=false node --test scripts/publisher_today_read_model.test.mjs`: PASS
