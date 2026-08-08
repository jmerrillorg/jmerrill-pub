# Guard Validation

Required checks for this bootstrap branch:

- `npm ci`
- `npm run type-check`
- `npm run jm1-bootstrap-guard`
- `npm run jm1-canon-consistency-guard`
- `npm run jm1-canon-guard-enforcement`
- `npm run commercial-architecture-guard`
- `npm run slice3-implementation-planning-guard`
- `npm run jm1-power-platform-solution-lifecycle-guard`
- `npm run dirty-worktree-scope-guard`
- `git diff --check`

`jm1-commissioning-guard` retains main-branch authority semantics. On this feature branch, a `COMMISSIONING_MAIN_AUTHORITY_STALE` result is an expected feature-branch hold, not a weakened guard.
