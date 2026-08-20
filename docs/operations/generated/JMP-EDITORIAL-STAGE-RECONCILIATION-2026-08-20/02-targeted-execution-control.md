# Targeted Execution Control

Last verified: 2026-08-20T13:48:10Z

## Implementation

- Runtime module: `azure-functions/diagnostic-ai-runner/src/editorial/editorialExecutionRuntime.js`
- HTTP route: `run-targeted-editorial-execution`
- Function wrapper: `azure-functions/diagnostic-ai-runner/src/functions/runTargetedEditorialExecution.js`
- Function entry wiring: `azure-functions/diagnostic-ai-runner/src/index.js`

## Required Request Fields

- `titleId`
- `stageCode`
- `sourceArtifactId`
- `sourceChecksum`
- `expectedCurrentStage`
- `authorApprovalRequired: true`
- `executionMode: DRY_RUN | EXECUTE`

## Fail-Closed Guards

- Missing title ID
- Unsupported stage code
- Missing source artifact ID
- Missing source checksum
- Missing or unsupported execution mode
- `authorApprovalRequired` not true
- Bulk/portfolio/query selector present
- Title not found or not unique
- Target stage not found or not unique
- Source artifact not found or not unique
- Target stage code mismatch
- Target stage not executable
- Source checksum mismatch
- Upstream author approval missing or not exact-artifact-bound
- Upstream approval binds a different artifact
- Expected current stage mismatch
- Existing output already recorded for stage/source

## Dry Run

Dry-run returns title, current stage, exact source artifact, author approval evidence, style guide, provider route, expected output roles, and expected next author gate. Dry-run performs zero Dataverse mutations and zero external sends.

## Execution

Execute reuses the existing editorial runtime stage processor and passes the prevalidated exact source artifact into the processor. It does not call the portfolio selector and does not run more than one stage.

