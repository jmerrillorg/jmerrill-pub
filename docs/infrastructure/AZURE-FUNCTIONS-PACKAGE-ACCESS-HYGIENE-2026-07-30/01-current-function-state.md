# Current Function App State

Validated before and after package-access retirement.

| Function App | Resource Group | Runtime | State | Identity | Slots | WEBSITE_RUN_FROM_PACKAGE | Function Count | Current Deployment Mode |
|---|---|---:|---|---|---:|---|---:|---|
| func-jm1-acs-email-relay | rg-jm1-communications | Node\|22 | Running | None | 0 | Absent | 5 | Extracted/remote-build path; no package URL setting |
| func-jm1-diagnostic-ai-runner | rg-jm1-ai | Node\|22 | Running | SystemAssigned | 0 | Absent | 24 | Extracted/remote-build path; no package URL setting |

## App Settings Read Method

App setting names were exported. Values were parsed only in memory for classification and were not printed or retained.

| Function App | Setting Count | SAS-bearing setting names | Package URL setting names | Referenced storage accounts | Key Vault reference count | Account-key connection-string setting count |
|---|---:|---|---|---|---:|---:|
| func-jm1-acs-email-relay | 12 | None | None | stjm1acsrelay | 0 | 1 |
| func-jm1-diagnostic-ai-runner | 80 | None | None | stjm1diagrunner | 1 | 1 |

## Function Indexing

| Function App | Indexed Functions | Expected | Result |
|---|---:|---:|---|
| func-jm1-acs-email-relay | 5 | 5 | PASS |
| func-jm1-diagnostic-ai-runner | 24 | 24 | PASS |

