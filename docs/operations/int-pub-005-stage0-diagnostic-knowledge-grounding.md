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
| File status | Draft skeleton uploaded 2026-06-16. Editorial content not yet authored. |
| File version | `v0.1-draft` |

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

## What `knowledge.md` Must Contain Before Activation

The file structure is established. Jackie must author the following editorial content sections before the prompt may be activated:

| Section | Content needed | Status |
|---|---|---|
| 1. Imprint Definitions | Description, target audience, genre focus, quality bar for: J Merrill Publishing, JM Works, JM Little, JM Verse, JM Signature | **Not authored** |
| 2. Stage 0 Scoring Rubric | Per-dimension scoring guidance for all 11 scoring dimensions | **Not authored** |
| 3. Package Categories | Internal package category names and distinguishing criteria (no pricing) | **Not authored** |
| 4. Publishing Goal Interpretation | How to interpret author-stated publishing goals when assigning imprint/editorial path | **Not authored** |
| 5. Editorial Path Definitions | What each editorial path means and selection criteria | **Not authored** |
| 6. Risk Flag Guidance | Hard Stop criteria, ethics flag, legal flag, brand misalignment, AI disclosure threshold, copyright risk level thresholds | **Not authored** |
| 7. Author Readiness Guidance | Scoring guidance for author readiness, investment fit, timeline fit | **Not authored** |
| 8. Routing Rules | Current routing defaults (all Stage 0 → Jackie review; no auto-routing) | Skeleton in place — confirm |

## Update and Versioning Governance

- Any change to `knowledge.md` editorial content requires Jackie approval before the updated file is uploaded to the governed container.
- The file version must be incremented on any substantive change.
- The version in use at the time of any AI execution is recorded in `jm1_airequestlog` (as a grounding artifact version field — to be implemented before activation).
- The file must not contain manuscript text, author PII, secrets, keys, or pricing.

## Activation Gate

`knowledge.md` is a pre-execution blocker. The prompt may not be activated until:

1. All editorial content sections above are authored by Jackie.
2. Jackie approves the completed file.
3. The approved file is uploaded to `stjm1diagrunner/knowledge/knowledge.md` replacing the draft skeleton.
4. The `jm1pub_groundingdependencies` field on the prompt template record confirms `knowledge.md` as the declared dependency (already set).

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
