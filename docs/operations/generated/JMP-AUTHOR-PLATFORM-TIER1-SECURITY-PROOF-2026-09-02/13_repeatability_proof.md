# Repeatability Proof

Last verified: 2026-09-02T21:45:33Z

## Commands

Pre-merge PR #715 validation:

- `npm ci`: PASS
- `npm run jm1-canon-consistency-guard`: PASS
- `npm run type-check`: PASS
- `git diff --check origin/main...HEAD`: PASS
- ratification evidence checksum validation: PASS

Post-merge security proof:

- `npm ci`: PASS
- `npm run author-auth-guard`: PASS
- targeted author portal/security tests: `48 / 48 PASS`
- production unauthenticated fail-closed probes: PASS

## Runtime Versions

- Node: `v24.11.0`
- npm: `11.6.1`

## Note

`npm ci` reported audit vulnerabilities. That report is preserved as dependency hygiene evidence but was not part of the requested proof gate.
