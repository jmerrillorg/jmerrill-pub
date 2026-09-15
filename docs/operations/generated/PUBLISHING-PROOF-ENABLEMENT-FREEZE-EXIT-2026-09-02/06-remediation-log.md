# Remediation Log

Last Verified: 2026-09-02T04:47:24.358308Z

## Remediation performed

1. Created a fresh worktree from `origin/main` to avoid contaminating dirty local work or prior generated evidence.
2. Installed diagnostic-runner dependencies from `azure-functions/diagnostic-ai-runner/package-lock.json` using `npm ci`.
3. Accidentally ran diagnostic-runner `npm ci` twice. This had no source effect; it is recorded for operator honesty.
4. Installed root dependencies from `package-lock.json` using `npm ci`.
5. Re-ran proof-relevant guards after dependency remediation.

## Remediation not performed

- No source code changes.
- No runtime implementation changes.
- No Dataverse writes.
- No schema/workflow/config/deployment changes.
- No ACS send.
- No mailbox search or mutation.
- No lifecycle/title mutation.
- No freeze lift.

## Dependency observations

- Root `npm ci` emitted an engine warning: repository declares Node `>=24 <25`; local runtime was Node v22.23.1/npm 10.9.8.
- Root `npm ci` reported existing audit findings: 12 vulnerabilities.
- Diagnostic-runner `npm ci` reported existing audit findings: 5 vulnerabilities.
- No `npm audit fix` was run because dependency upgrades/remediation are outside this proof-enablement pass.
