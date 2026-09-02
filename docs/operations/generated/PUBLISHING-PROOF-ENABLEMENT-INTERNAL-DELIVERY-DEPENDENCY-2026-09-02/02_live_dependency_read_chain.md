# Live Dependency Read Chain

Last verified: 2026-09-02T21:56:11Z

## Canonical Records

| Dependency | Result | Evidence |
| --- | --- | --- |
| Title authority | `PASS` | `jm1pub_titles(48e831f0-418b-f111-ab10-000d3a1a9efa)` |
| Contact authority | `PASS` | `contacts(8b2a87d4-418b-f111-ab10-000d3a1a9efa)` |
| Author Profile authority | `PASS` | `jm1_authorprofiles(0359c9cc-aef8-5053-b902-6acbc3dff551)` |
| Title-author binding | `PASS` | `_jm1_primaryauthor_value = 8b2a87d4-418b-f111-ab10-000d3a1a9efa` |
| Stage authority | `PASS` | `jm1pub_editorialstages(a086e9f2-418b-f111-ab10-6045bdd69738)` |
| Gate authority | `PASS` | `jm1pub_editorialapprovalgates(a74b0513-4c8b-f111-ab10-6045bdd69738)` |
| Artifact authority | `PASS` | `jm1pub_editorialartifacts(0d04b5fc-4b8b-f111-ab10-000d3a9eacee)` |
| Package binding | `BLOCKED` | Canonical dispatch requires `editorialMemo` and `reviewInstructions`; only one author-facing artifact was found. |
| Cadence maturity | `PASS` | `npm run editorial-cadence-guard` passed 16/16. |
| Transition eligibility | `BLOCKED` | Dispatch runtime returned QA, required-attachment, and prospect-package-selection blockers. |
| Recipient binding | `PASS` | Recipient email resolved from Contact: `jm1.gate.w1.synthetic.long+20260729@jmerrill.one`. |

## Determinism

The read chain used live Dataverse IDs and the canonical dispatch service. It did not use email-only identity, title-text matching, browser-supplied IDs, or operator inference.
