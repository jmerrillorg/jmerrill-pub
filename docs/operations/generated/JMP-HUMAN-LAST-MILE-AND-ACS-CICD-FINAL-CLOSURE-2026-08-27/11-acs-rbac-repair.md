# ACS RBAC Repair

Last Verified: 2026-08-27T18:43:03Z

## Target Resources

- Function App: `func-jm1-acs-email-relay`
- Resource group: `rg-jm1-communications`
- Function App resource ID: `/subscriptions/9ee13245-2303-4010-8b6d-35f7cbcfdc0e/resourceGroups/rg-jm1-communications/providers/Microsoft.Web/sites/func-jm1-acs-email-relay`
- Package storage account: `stjm1acsrelay`
- Storage account scope: `/subscriptions/9ee13245-2303-4010-8b6d-35f7cbcfdc0e/resourceGroups/rg-jm1-communications/providers/Microsoft.Storage/storageAccounts/stjm1acsrelay`

## Role Assignments

| Role | Scope | Assignment ID | Created |
| --- | --- | --- | --- |
| Website Contributor | Exact ACS Function App | `81f4e407-de95-424d-a77e-df6109aa554b` | `2026-08-27T18:01:16.260139+00:00` |
| Storage Blob Data Contributor | ACS package storage account | `34cd9764-5c65-412c-afdc-4ae998c110e7` | `2026-08-27T18:09:58.791140+00:00` |
| Storage Blob Delegator | ACS package storage account | `5445c623-3fc0-42cd-95f9-ed9a3e936541` | `2026-08-27T18:09:58.816419+00:00` |
| Storage Account Key Operator Service Role | ACS package storage account | `d36d0743-07fb-4da9-aeda-d9dc51527108` | `2026-08-27T18:13:57.939679+00:00` |

## Least-Privilege Boundary

No subscription Owner or broad subscription Contributor role was granted. Rights are scoped to the existing ACS Function App and the existing package storage account required by the run-from-package deployment model.

