# Stage Executor Before / After

Last verified: 2026-08-14

## Before

The executor could select active editorial stages, validate source artifacts, create outputs, and package handoff evidence. It did not require the governed model route before materialization and did not create mandatory next author-review gates for every stage.

## After

The executor now:

- evaluates upstream author approval before downstream stage execution;
- calls the governed model provider route with fallback disabled before artifact materialization;
- records model route metadata in output logs;
- creates/reuses an author-review gate after package handoff;
- keeps author notification separate from execution.

Evidence source:

- `azure-functions/diagnostic-ai-runner/src/editorial/editorialExecutionRuntime.js`
