# Dependency Inventory

## Storage

| Function App | Storage account | Containers inspected | Stored access policies | Data-plane RBAC posture |
|---|---|---|---|---|
| func-jm1-acs-email-relay | stjm1acsrelay | azure-webjobs-hosts, azure-webjobs-secrets, function-releases, scm-releases | None found | Operator did not have Blob Data role; account key was used in memory for metadata only |
| func-jm1-diagnostic-ai-runner | stjm1diagrunner | azure-webjobs-hosts, azure-webjobs-secrets, function-releases, scm-releases, knowledge, publishing | None found | Function App has SystemAssigned identity; no storage RBAC assignments found for that identity |

## Current References

| Source | Result |
|---|---|
| Function App app settings | WEBSITE_RUN_FROM_PACKAGE absent on both apps; no SAS-bearing or package URL settings |
| Function slots | No slots exist for either Function App |
| Key Vault jm1-core-vault | 36 secret values scanned in memory; 0 package/SAS reference hits; values printed: 0 |
| GitHub repository secrets | 16 secret names listed; 0 suspicious package/SAS names; values are not readable through GitHub |
| Committed repo scan | Only governed WEBSITE_RUN_FROM_PACKAGE=1 references in App Service workflow/IaC; 0 SAS-bearing package URLs |
| Deployment history | No Kudu deployment history rows returned for either Function App |

## Rollback Posture

The obsolete remote package blobs from the package-mode attempt were not current rollback artifacts. Current repaired deployment uses the extracted/remote-build path and the `scm-releases` container retains the current latest package metadata.

