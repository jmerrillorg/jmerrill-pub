# Validation Readback

## Web Repository Checks

- `npm ci --cache /Volumes/UsersExternal/Developer/.npm-cache-jmerrill-pub-auth003`: PASS
- `npm run jmp-auth-003-managed-identity-runtime-guard`: PASS, 6 tests
- `npm run type-check`: PASS
- `npm run workflow-engine-guard`: PASS
- `npm run lint`: PASS with existing `app/layout.tsx` custom-font warning
- `npm run author-auth-guard`: PASS, 21 tests plus static guard checks
- `npm run jmp-dist-003-provider-auth-guard`: PASS, 7 tests
- `npm run build`: PASS
- `git diff --check`: PASS

## Azure Function Checks

- `npm --prefix azure-functions/acs-email-relay run lint`: PASS
- `npm --prefix azure-functions/diagnostic-ai-runner run lint`: PASS
- `npm --prefix azure-functions/acs-email-relay test`: PASS, 91 tests
- Initial `npm --prefix azure-functions/diagnostic-ai-runner test`: failed before product assertions because the function package dependencies were not installed in that package folder.
- `npm ci --cache /Volumes/UsersExternal/Developer/.npm-cache-jmerrill-pub-auth003` in `azure-functions/diagnostic-ai-runner`: PASS
- Rerun `npm --prefix azure-functions/diagnostic-ai-runner test`: PASS, 2,268 tests across 452 suites

## Environment Notes

The shell running these checks used Node v22.23.1 and npm 10.9.8. The root package declares Node >=24 <25 and npm >=11 <12. The install emitted an engine warning, but the lockfile install, type-check, lint, build, and tests completed successfully.
