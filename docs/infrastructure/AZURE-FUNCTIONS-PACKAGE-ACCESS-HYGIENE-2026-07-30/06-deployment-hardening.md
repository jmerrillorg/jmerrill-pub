# Deployment Hygiene Hardening

## Implemented Guard

Added:

- `scripts/check-functions-package-access-hygiene.mjs`
- npm script `functions-package-access-guard`

The guard scans committed workflow, Azure Functions, docs, infra, and scripts files and fails if it finds:

- a `WEBSITE_RUN_FROM_PACKAGE` value containing a SAS-bearing URL;
- a committed `.zip` package URL containing SAS query credentials.

The guard does not prohibit governed package deployment globally. It specifically blocks secret-bearing package URLs from being committed, logged into evidence, or retained in source-controlled artifacts.

## Recurrence Prevention

- Supported `WEBSITE_RUN_FROM_PACKAGE=1` remains allowed where governed.
- SAS-bearing URLs must not be echoed by workflows or evidence collection.
- Evidence must record storage account, container, blob name, checksum, and disposition only.
- Rollback artifacts must use governed retention and access controls.

