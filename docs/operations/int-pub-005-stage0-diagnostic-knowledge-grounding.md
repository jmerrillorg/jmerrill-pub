# INT-PUB-005 Stage 0 Diagnostic — Knowledge Grounding Location and Access

## Purpose

This document confirms the governed location, access pattern, and editorial content requirements for `knowledge.md` — the declared grounding dependency for the Stage 0 Diagnostic AI prompt template `jm1-prompt-pub-stage0-diagnostic`.

## Governed Location

| Property | Value |
|---|---|
| Storage account | `stjm1diagrunner` (resource group `rg-jm1-ai`, East US) |
| Container | `knowledge` |
| Blob name | `knowledge.md` |
| Container access | Private — no public access |
| Blob URL (private) | `https://stjm1diagrunner.blob.core.windows.net/knowledge/knowledge.md` |
| File status | v1.1 — approved and uploaded 2026-06-17T11:31:04Z |
| File version | `v1.1` |
| Approved via | PR #73 |
| Upload timestamp | `2026-06-17T11:31:04Z` |
| SHA-256 | `771c0b6d198ba47abf0c2cc411a49a0c16a7fee4b0960403e08d41da433fb957` |
| ETag | `"0x8DECC63EAC29DE7"` |
| File size | `35,754 bytes` |
| Content type | `text/markdown; charset=utf-8` |
| Prior version | v1.0 — SHA-256 `64e0e38f8a2cfdacf49fd8238b45939efbafef3bd23d526ab3d0d414b24e8a78`, ETag `"0x8DECBF9A7DEF3A2"`, 29,232 bytes, approved PR #60 |

## Access Pattern

The Azure Function `func-jm1-diagnostic-ai-runner` reads `knowledge.md` at execution time using its system-assigned managed identity and the `@azure/storage-blob` SDK with `DefaultAzureCredential`.

| Access component | Value |
|---|---|
| Function App | `func-jm1-diagnostic-ai-runner` |
| Managed identity principal ID | `e8c51a80-bdb0-46fa-b398-9109719d6427` |
| RBAC role | `Storage Blob Data Reader` |
| Role scope | `stjm1diagrunner` storage account |
| Role assigned | 2026-06-16 |
| SDK | `@azure/storage-blob` + `DefaultAzureCredential` (`@azure/identity`) |

The runner must not cache `knowledge.md` across cold starts unless a governed cache TTL is established. It must not write to the `knowledge` container.

## `knowledge.md` Content Status

All editorial content sections authored, approved, and uploaded. Version v1.1 is live.

| Section | Status |
|---|---|
| 1. Imprint Definitions | **Complete** — J Merrill Publishing, JM Works, JM Little (age bands), JM Verse (poetry-first), JM Signature (BP-07) |
| 2. Stage 0 Scoring Rubric | **Complete** — 11 dimensions, canonical 1–5 scale |
| 2a. Scoring Dimension Weights by Imprint | **Complete (v1.1)** — primary/secondary/informational weight tiers per imprint |
| 2b. Confidence Score Calibration | **Complete (v1.1)** — baseline by primary dimensions scored, upward/downward adjustments, hard caps, confidence-to-routing mapping |
| 3. Package Categories | **Complete** — 4 SKUs + null |
| 4. Publishing Goal Interpretation | **Complete** — 9 goal categories |
| 5. Editorial Path Definitions | **Complete** — thresholds set; Co-Development as human-review path |
| 6. Risk Flag Guidance | **Complete** — hard stops, ethics/legal/defamation routing, AI caps, brand misalignment, rights |
| 7. Author Readiness Guidance | **Complete** — authorReadinessScore, authorInvestmentFit, timelineFit |
| 8. Routing Rules | **Complete** — Legacy exclusion rule, closed humanReviewTrigger enum, BP-07 Signature |

## Update and Versioning Governance

- Any change to `knowledge.md` editorial content requires Jackie approval before the updated file is uploaded to the governed container.
- The file version must be incremented on any substantive change.
- The version in use at the time of any AI execution is recorded in `jm1_airequestlog` (as a grounding artifact version field — to be implemented before activation).
- The file must not contain manuscript text, author PII, secrets, keys, or pricing.

## Activation Gate

`knowledge.md` is a pre-execution blocker. Status as of 2026-06-16:

1. All editorial content sections authored by Jackie. **Done.**
2. Jackie approved the completed file via PR #60 (merged 2026-06-16T20:18:11Z, commit `10b8429`). **Done.**
3. Approved file uploaded to `stjm1diagrunner/knowledge/knowledge.md` replacing the draft skeleton. **Done — v1.0 live.**
4. `jm1pub_groundingdependencies` field on the prompt template record confirms `knowledge.md` as the declared dependency. **Done** (set 2026-06-16).

**v1.1 status:** All sections complete. `CONTRACT_TEST_MODE=false`, `JM1_AI_EXECUTION_ENABLED=true`. Runner hash verified against v1.1 (`hashMatched=true`) via live pipeline call 2026-06-17. `KNOWLEDGE_BLOB_SHA256` app setting updated to v1.1 hash. See Runner Read Verification (v1.1) below.

## Runner Read Verification

The runner's managed identity read of `knowledge.md` was verified via direct HTTP contract test on 2026-06-16.

| Field | Result |
|---|---|
| Test timestamp | 2026-06-16 (post PR #61 merge) |
| HTTP status | 202 |
| `knowledge.reachable` | `true` |
| `knowledge.hashMatched` | `true` |
| `knowledge.calculatedSha256` | `64e0e38f8a2cfdacf49fd8238b45939efbafef3bd23d526ab3d0d414b24e8a78` |
| `knowledge.expectedSha256` | `64e0e38f8a2cfdacf49fd8238b45939efbafef3bd23d526ab3d0d414b24e8a78` |
| `knowledge.byteLength` | `29232` |
| `knowledge.etag` | `"0x8DECBF9A7DEF3A2"` |
| `knowledge.lastModified` | `2026-06-16T22:50:25.000Z` |
| `knowledge.md` content in response | Not present — metadata only |
| Runner mode | `CONTRACT_TEST_MODE=true` |
| AI execution | Not enabled |
| Blob content logged | No — safe metadata only |

Access confirmed: `func-jm1-diagnostic-ai-runner` managed identity reads `knowledge.md` via `@azure/storage-blob` + `DefaultAzureCredential` using `Storage Blob Data Reader` on `stjm1diagrunner`.

## Runner Read Verification (v1.1 — 2026-06-17)

Hash verified via `controlledAiTest: true` pipeline call (synthetic TXT fixture, Approval 1 scope):

| Field | Result |
|---|---|
| Test timestamp | 2026-06-17 (PR #73) |
| HTTP status | 202 |
| `knowledge.reachable` | `true` |
| `knowledge.hashMatched` | `true` |
| `knowledge.byteLength` | `35754` |
| `KNOWLEDGE_BLOB_SHA256` app setting | `771c0b6d198ba47abf0c2cc411a49a0c16a7fee4b0960403e08d41da433fb957` |
| ETag | `"0x8DECC63EAC29DE7"` |
| Blob content in response | Not present — metadata only |
| Runner mode | `CONTRACT_TEST_MODE=false`, `JM1_AI_EXECUTION_ENABLED=true` |
| AI call made | Yes — synthetic fixture, Approval 1 scope |
| AI Request Log | `4480c742-406a-f111-a826-6045bdd69738` |
| Execution Log | `ecac2645-406a-f111-a826-000d3a14673b` |

## Runner Implementation Note

The `azure-functions/diagnostic-ai-runner/src/functions/runStage0Diagnostic.js` function must be updated (in a separate governed pass, after Jackie approves activation) to:

1. Read `knowledge.md` from `stjm1diagrunner/knowledge/knowledge.md` at execution start using managed identity.
2. Inject the content into the system prompt at the `[knowledge base content]` placeholder position.
3. Return a safe `Exception` result if the file cannot be read (do not proceed to AI call with missing grounding).
4. Log the blob URL and version field (if present in the file) in `jm1_airequestlog`.

## Related Documents

- [`docs/operations/int-pub-005-stage0-diagnostic-ai-activation-decision-record.md`](./int-pub-005-stage0-diagnostic-ai-activation-decision-record.md) — Section 6 (Grounding Dependencies) and Section 15 (checklist)
- [`docs/operations/int-pub-005-stage0-diagnostic-prompt-governance-review.md`](./int-pub-005-stage0-diagnostic-prompt-governance-review.md) — Prompt body review artifact (system prompt references `knowledge.md`)
- [`docs/operations/int-pub-005-stage0-diagnostic-ai-runner-azure-function.md`](./int-pub-005-stage0-diagnostic-ai-runner-azure-function.md) — Function spec
