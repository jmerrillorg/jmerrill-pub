# JM1 Five-Title Protected Dispatch Evidence

Date: 2026-08-02

This package records the protected production execution path created for the five-title executive recovery boundary.

The implementation does not export, print, copy, or require local Publisher session tokens, cookies, worker keys, ACS credentials, Dataverse credentials, or Key Vault values. Execution is constrained to a GitHub Actions OIDC identity bound to the `jmerrill-pub-production` environment and an exact five-title allowlist.

## Scope

- Before You Were Born
- The General's Will and Last Testament
- Establishing Glory: The Library
- The Long Watch
- The Intentional Leader

## Current Classification

- PR #379: merged and production deployed before this worker change.
- Remaining boundary: authenticated production mutation.
- New execution path: protected production worker using GitHub OIDC.
- Required sequence: dry-run first, then confirmed execution only with `EXECUTIVE_RECOVERY`.

## Secret Handling

- Local exported tokens: 0
- Secret values retained: 0
- Workflow repository secrets referenced: 0
- Production credentials remain server-side only.
