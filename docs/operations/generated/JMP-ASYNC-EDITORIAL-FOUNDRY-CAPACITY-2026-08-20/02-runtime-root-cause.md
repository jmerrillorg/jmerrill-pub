# Runtime Root Cause

Last Verified: 2026-08-20

The existing Line runtime split the manuscript into chunks and ran bounded concurrency, but stored chunk progress only in process memory:

- `splitLineEditingSourceChunks`
- `buildLineEditingChunkPrompt`
- `invokeLineEditingModelProvider`

When one chunk hit provider capacity, the runtime returned the failing model result for the entire Line attempt. Completed chunks were not durably checkpointed for a later resume.

## Corrected Direction

The new worker creates an execution job and chunk records before model dispatch. Completed chunks are checkpointed independently. A provider-capacity response changes the job to `RETRY_SCHEDULED` / `WAITING_FOR_PROVIDER_CAPACITY` instead of treating the book as a terminal failure.

## Evidence Source

- `azure-functions/diagnostic-ai-runner/src/editorial/editorialExecutionRuntime.js`
- `azure-functions/diagnostic-ai-runner/src/editorial/asyncLongFormEditorialWorker.js`

