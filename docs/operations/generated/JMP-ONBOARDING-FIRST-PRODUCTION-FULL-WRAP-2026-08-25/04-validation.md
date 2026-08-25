# Validation

Local validation performed in clean worktree:

`/Volumes/UsersExternal/Developer/codex-worktrees/jmerrill-pub-onboarding-production-fullwrap-20260825`

## Commands

```text
cd azure-functions/diagnostic-ai-runner
npm ci
npm test -- --test-reporter=spec test/fullWrapExecutor.test.js
npm run lint
npm test -- --test-reporter=dot

cd ../..
npm ci
npm run type-check
npm run lint
```

## Results

- Focused Full Wrap tests: 11 / 11 PASS
- Diagnostic Runner lint: PASS
- Diagnostic Runner full test suite: PASS
- Root type-check: PASS
- Root lint: PASS with pre-existing `app/layout.tsx` custom-font warning

## Local Environment Notes

- Root package declares Node `>=24 <25`; local shell used Node 26 and emitted an engine warning.
- Diagnostic Runner declares Node `>=22 <25`; local shell used Node 26 and emitted an engine warning.
- Production health prior to this branch was on Node 22 for the Diagnostic Runner.
