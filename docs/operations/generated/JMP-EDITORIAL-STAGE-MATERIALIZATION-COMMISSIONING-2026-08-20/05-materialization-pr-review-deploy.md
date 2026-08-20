# Materialization PR Review and Deploy

## PR #527

- PR: `#527`
- Purpose: governed editorial next-stage materialization.
- Commit: `65e4612e4a4fd46dda079e21d7872ad6e1fee098`
- Merge SHA: `6a7f709a2bfebd899bd614c15869a49fa6e1344c`
- Function App deployment blob: `20260820-6a7f709a2bfebd899bd614c15869a49fa6e1344c-diagnostic-ai-runner-withdeps.zip`

## PR #528

- PR: `#528`
- Purpose: resolve SharePoint source URL through Graph when drive/item identity is absent.
- Head: `2a4394dabc4475732be6bc2e7ab4b91a86c3bc3e`
- Merge SHA: `b5de53f9fa678523c2cf28c27f51ca37ef3bc37c`
- Function App deployment blob: `20260820-b5de53f9fa678523c2cf28c27f51ca37ef3bc37c-20260820192247-diagnostic-ai-runner-withdeps.zip`

## PR #529

- PR: `#529`
- Purpose: allow retry after repaired source Graph identity while preserving substantive exact blockers.
- Head: `0c209e4af2d06d1f0ef2be7dec03968eaa0f1857`
- Merge SHA: `739b5a4f667008d1aa40f191b224a5a375a3846b`
- Function App deployment blob: `20260820-739b5a4f667008d1aa40f191b224a5a375a3846b-20260820193041-diagnostic-ai-runner-withdeps.zip`

## Production Proof

- `JM1_RELEASE_SHA`: `739b5a4f667008d1aa40f191b224a5a375a3846b`
- `JM1_PRODUCTION_RELEASE_SHA`: `739b5a4f667008d1aa40f191b224a5a375a3846b`
- `run-editorial-next-stage-materialization` POST without key: `401`
- `run-targeted-editorial-execution` POST without key: `401`

