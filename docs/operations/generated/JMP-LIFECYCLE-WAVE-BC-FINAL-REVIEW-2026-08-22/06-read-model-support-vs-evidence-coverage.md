# Read Model Support vs Evidence Coverage

| Domain | READ_MODEL_SUPPORT | Implementation |
| --- | --- | --- |
| Artifact identity/type/version/current/checksum/provenance | IMPLEMENTED | Wave C lifecycleEvidence.artifact facets |
| Author relationship/workspace/onboarding | IMPLEMENTED | Separate authorWorkspace facets; workspace/onboarding remain source-backed only |
| Commercial chain | IMPLEMENTED | packageAccepted, pricingLocked, agreementExecuted, initialPayment, installments, joinedFamily facets |
| Format/distribution/certification/URL | IMPLEMENTED | per-format identity/distribution/certification/verifiedUrl facets |
| Readiness contracts | IMPLEMENTED | readinessContracts per editorial/bookProduction/metadata/distribution/royalty/finalDelivery |
| Data-gap classification | IMPLEMENTED | RESOLVABLE / STRUCTURAL classification in read model and final register |

Production evidence coverage is separate from read-model support:

| Evidence Domain | Applicable | Covered | Coverage % | Conflict | DATA_GAP |
| --- | --- | --- | --- | --- | --- |
| Artifact checksum | 314 | 0 | 0 | 0 | 314 |
| Workspace entitlement | 31 | 0 | 0 | 0 | 31 |
| Agreement executed | 5 | 2 | 40 | 0 | 3 |
| Initial payment | 5 | 0 | 0 | 0 | 5 |
| Format certification | 314 | 0 | 0 | 0 | 314 |
