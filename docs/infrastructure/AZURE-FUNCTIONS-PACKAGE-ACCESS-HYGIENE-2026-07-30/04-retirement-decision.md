# Retirement Decision

## Classification

Old package access disposition: REVOKED / NON-REFERENCED

The old SAS was not available for safe re-display, and no current Function App setting, slot, Key Vault secret, GitHub secret name, workflow, deployment record, or committed configuration referenced a SAS-bearing package URL. The package source was identified by the two latest `function-releases` blobs created during the package-mode attempt.

## Action Selected

Case D - Package blob no longer needed.

The narrowest supported retirement action was selected:

1. Preserve blob metadata and SHA-256 checksum.
2. Confirm WEBSITE_RUN_FROM_PACKAGE is absent and no current references remain.
3. Delete only the two obsolete package blobs.
4. Preserve unrelated package blobs, containers, storage accounts, keys, and current `scm-releases` artifacts.

## Actions Not Taken

- Storage keys rotated: 0
- Stored access policies revoked: 0, none existed
- Containers deleted: 0
- Storage accounts deleted: 0
- Unrelated blobs deleted: 0
- Both account keys rotated together: no

