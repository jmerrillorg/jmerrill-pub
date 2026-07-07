# IS-009 - Dataverse Live Inventory Summary

**Environment:** JM1-Dev / `org52409ff2.crm.dynamics.com`  
**Inventory Date:** 2026-07-07 UTC  
**Access Method:** Delegated Azure CLI Dataverse token for metadata read  
**Boundary:** Read-only metadata inventory; no schema or data changes  

## Inventory Result

| Logical Name | Result | Entity Set | Attributes | Relationships | Keys | Notes |
| --- | --- | --- | ---: | ---: | ---: | --- |
| `contact` | Exists | `contacts` | 320 | 20 | 0 | Party/person master exists. |
| `jm1pub_contract` | Missing | - | 0 | 0 | 0 | Canonical agreement basis is not present in JM1-Dev under this logical name. |
| `jm1pub_title` | Exists | `jm1pub_titles` | 33 | 8 | 0 | Intellectual Work table exists but is minimal. |
| `jm1_executionlog` | Missing | - | 0 | 0 | 0 | Execution log table is not present in JM1-Dev under this logical name. |
| `jm1pub_publishingasset` | Missing | - | 0 | 0 | 0 | No conflict found for proposed IS-009 table. |
| `jm1pub_assetmarketplace` | Missing | - | 0 | 0 | 0 | No conflict found for proposed IS-009 table. |

## Nearby Table Discovery

| Search Term | Relevant Findings |
| --- | --- |
| execution | `jm1_executionevent` exists with entity set `jm1_executionevents`. |
| title | `jm1pub_title` exists; `jm1pub_titleownership` also exists. |
| contract | No matching table found by local metadata scan. |
| publishingasset | No matching table found. |
| assetmarketplace | No matching table found. |

## Relevant Existing Fields

### Contact

PAM-relevant fields found:

- `contactid`
- `fullname`
- `firstname`
- `lastname`
- `emailaddress1`
- `jm1pub_authorstatus`
- `jm1pub_billcomvendorid`
- `jm1pub_is1099required`
- `jm1pub_stripeaccountid`
- `jm1pub_stripekycstatus`
- `jm1pub_stripeonboardingcompletedon`

### `jm1pub_title`

Current custom title fields found:

- `jm1pub_titleid`
- `jm1pub_titlename`

System ownership/status fields also exist, including `ownerid`, `statecode`, `statuscode`, `createdon`, and `modifiedon`.

## Conflict Report

| Proposed IS-009 Artifact | Conflict Status |
| --- | --- |
| `jm1pub_publishingasset` table | No existing table conflict found. |
| `jm1pub_assetmarketplace` table | No existing table conflict found. |
| `jm1pub_title.jm1pub_certifiedimprint` | Missing; no field conflict found. |
| `jm1pub_title.jm1pub_assetregistrystatus` | Missing; no field conflict found. |
| `jm1pub_title.jm1pub_assetregistrylastverifiedon` | Missing; no field conflict found. |
| `jm1pub_publishingasset` -> `jm1pub_title` lookup | Buildable after table creation. |
| `jm1pub_publishingasset` -> `jm1pub_contract` lookup | Blocked until `jm1pub_contract` exists in JM1-Dev. |
| `jm1pub_assetmarketplace` -> `jm1pub_publishingasset` lookup | Buildable after `jm1pub_publishingasset` creation. |

## Access Diagnosis

Root cause of prior blocker:

- Local client-credential metadata authentication failed with `dataverse_token_failed:400`.
- Azure app setting names exist by name only, but the client-credential path still does not successfully acquire a Dataverse token from this workstation.
- Delegated Azure CLI token for `https://org52409ff2.crm.dynamics.com` succeeds and was used to complete this metadata inventory.

Credential posture:

- No secrets were printed.
- No secrets were committed.
- No app setting values were stored in the repo.
- The service-principal/client-credential path remains a separate automation-readiness issue.

## Readiness Impact

IS-009 can proceed to build planning, but schema build authorization should wait until Jackie resolves the baseline dependency:

- `jm1pub_contract` is canon but absent in JM1-Dev.
- `jm1_executionlog` is requested for proof logging but absent in JM1-Dev.
- `jm1_executionevent` exists and may be a Dev/Foundation substitute, but using it instead of `jm1_executionlog` would require explicit governance confirmation.

