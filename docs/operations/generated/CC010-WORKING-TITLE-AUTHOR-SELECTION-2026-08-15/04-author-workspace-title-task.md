# Author Workspace Title Task

Last verified: 2026-08-15T10:35:00-04:00

## Intended Author-Facing State

For an untitled manuscript, the workspace should display:

- Working Title: `Untitled`
- task: `Choose or Provide Your Book Title`

## Decision Options

The task supports:

- `PROVIDE_MY_OWN_TITLE`
- `SELECT_SUGGESTED_TITLE`
- `KEEP_WORKING_TITLE_FOR_NOW`

## Nonblocking Behavior

The task is nonblocking for Editorial Review approval. The author may approve the Editorial Review while keeping `Untitled` for now.

## Idempotency

The task idempotency key is stable for the same title, gate, source artifact, and source checksum:

`author-title-selection:<titleId>:<gateId>:<sourceArtifactId>:<sourceChecksum>`
