# PR #521 Crosscheck - Line Runtime

Last verified: 2026-08-20T13:22:13Z

## PR State

- PR: #521
- Title: `P0 Line runtime: use governed model output and QA`
- Head SHA: `0d9d98ddef8584e550fb29fa30289e455c97e083`
- Merge SHA: `c7fab9b64a2b1a5ae61d1763900c208e9e66e883`
- Merged at: 2026-08-20T11:36:33Z

## Crosscheck

- `invokeStageModelProvider` routes through governed provider selection with `allowFallback: false`.
- Line Editing uses `JM1_PROMPT_MODEL_DEPLOYMENT_ALIAS` or `AZURE_FOUNDRY_CLAUDE_DEPLOYMENT_NAME`.
- Line prompt includes source artifact identity, source checksum, upstream context, style guide context, and 95% to 100% preservation language.
- QA fails if retention ratio is below 0.95 or above 1.0.
- QA fails if the provider is not `microsoft-foundry-claude`.
- QA fails if model fallback occurred.
- The Line edited manuscript uses actual model output and is persisted as an output artifact.
- Author review gate creation leaves `nextStageAuthorized=false`.

## Evidence Source

- `azure-functions/diagnostic-ai-runner/src/editorial/editorialExecutionRuntime.js`

