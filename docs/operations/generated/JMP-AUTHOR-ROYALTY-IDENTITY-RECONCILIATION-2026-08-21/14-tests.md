# Tests

Last Verified: 2026-08-22T01:10:22.863Z
Evidence Source: local Node 24 test execution.

Runtime pin:

```bash
PATH=/Users/jmerrillone/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node --version
# v24.19.0
```

Validation commands:

```bash
PATH=/Users/jmerrillone/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm run author-royalty-connect-migration-source-guard
PATH=/Users/jmerrillone/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm run author-royalty-identity-reconciliation-guard
```

Result: PASS

| Guard | Tests | Pass | Fail |
| --- | ---: | ---: | ---: |
| author-royalty-connect-migration-source-guard | 3 | 3 | 0 |
| author-royalty-identity-reconciliation-guard | 10 | 10 | 0 |
| Combined direct Node 24 execution | 13 | 13 | 0 |

The validation includes the existing PR #555 source-population guard and the new redacted identity-reconciliation classification guard.
