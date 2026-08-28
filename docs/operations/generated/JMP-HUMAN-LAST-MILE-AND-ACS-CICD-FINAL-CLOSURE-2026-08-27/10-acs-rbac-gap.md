# ACS RBAC Gap

Last Verified: 2026-08-27T18:43:03Z

## Initial Failure

The ACS relay workflow could authenticate through GitHub OIDC, but deployment could not complete without least-privilege rights to:

- update the exact ACS Function App configuration;
- upload the run-from-package zip to the existing package storage account;
- generate a durable read-only package reference for `WEBSITE_RUN_FROM_PACKAGE`.

## Failed Runs Preserved

| Run | Failure |
| --- | --- |
| `33101412359` | `az functionapp deployment source config-zip` failed with Azure CLI JSON decode error against SCM. |
| `33101761024` | `az webapp deploy` returned SCM 503. |
| `33101888195` | Retry path returned SCM 503. |
| `33102172289` | User-delegation SAS exceeded the seven-day limit. |
| `33102349373` | Same user-delegation expiry issue before storage-key path was adopted. |

## Root Cause

The ACS relay is a Linux Consumption Function App with an existing run-from-package storage model. The reliable deployment path is package upload to the existing storage account plus `WEBSITE_RUN_FROM_PACKAGE`, not SCM zip deployment.

