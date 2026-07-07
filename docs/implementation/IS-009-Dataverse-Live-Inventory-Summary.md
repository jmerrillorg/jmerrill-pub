# IS-009 - Dataverse Live Inventory Summary

**Environment:** JM1-Dev / `org52409ff2.crm.dynamics.com`
**Inventory Date:** 2026-07-07 UTC
**Access Method:** Delegated Azure CLI Dataverse token for metadata read/build validation
**Boundary:** JM1-Dev metadata validation; no data import, file movement, royalty/payment activity, or production modification

## Inventory Result

| Logical Name | Result | Entity Set | Attributes | Relationships | Keys | Notes |
| --- | --- | --- | ---: | ---: | ---: | --- |
| `contact` | Exists | `contacts` | 320 | 20 | 0 | Party/person master exists. |
| `jm1pub_contract` | Exists | `jm1pub_contracts` | 58 | Readback validated | 0 | Canonical agreement basis seeded into JM1-Dev under the canonical logical name. |
| `jm1pub_title` | Exists | `jm1pub_titles` | 38 | Readback validated | 0 | Intellectual Work table exists and now includes PAM registry fields. |
| `jm1_executionlog` | Exists | `jm1_executionlogs` | 50 | Readback validated | 0 | Canonical execution proof layer seeded into JM1-Dev under the canonical logical name. |
| `jm1pub_publishingasset` | Exists | `jm1pub_publishingassets` | 75 | Readback validated | 0 | IS-009 format/edition/ISBN asset layer created. |
| `jm1pub_assetmarketplace` | Exists | `jm1pub_assetmarketplaces` | 50 | Readback validated | 0 | IS-009 marketplace/distribution presence layer created. |

## Nearby Table Discovery

| Search Term | Relevant Findings |
| --- | --- |
| execution | `jm1_executionevent` exists with entity set `jm1_executionevents`. |
| title | `jm1pub_title` exists; `jm1pub_titleownership` also exists. |
| contract | `jm1pub_contract` now exists after baseline remediation. |
| publishingasset | `jm1pub_publishingasset` now exists after IS-009 build. |
| assetmarketplace | `jm1pub_assetmarketplace` now exists after IS-009 build. |

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

Current PAM-relevant title fields found:

- `jm1pub_titleid`
- `jm1pub_titlename`
- `jm1pub_certifiedimprint`
- `jm1pub_assetregistrystatus`
- `jm1pub_assetregistrylastverifiedon`

System ownership/status fields also exist, including `ownerid`, `statecode`, `statuscode`, `createdon`, and `modifiedon`.

## Conflict Report

| Proposed IS-009 Artifact | Conflict Status |
| --- | --- |
| `jm1pub_publishingasset` table | Created and validated. |
| `jm1pub_assetmarketplace` table | Created and validated. |
| `jm1pub_title.jm1pub_certifiedimprint` | Created and validated. |
| `jm1pub_title.jm1pub_assetregistrystatus` | Created and validated. |
| `jm1pub_title.jm1pub_assetregistrylastverifiedon` | Created and validated. |
| `jm1pub_publishingasset` -> `jm1pub_title` lookup | Created and validated as `jm1pub_titleid`. |
| `jm1pub_publishingasset` -> `jm1pub_contract` lookup | Created and validated as `jm1pub_contractid`. |
| `jm1pub_assetmarketplace` -> `jm1pub_publishingasset` lookup | Created and validated as `jm1pub_publishingassetid`. |

## Required Field Readback

Readback validation passed for:

| Table | Required Fields Validated |
| --- | --- |
| `jm1pub_contract` | `jm1pub_contractname`, `jm1pub_title`, `jm1pub_status`, `jm1pub_esignprovider`, `jm1pub_provideragreementid` |
| `jm1_executionlog` | `jm1_name`, `jm1_actiondescription`, `jm1_actiontype`, `jm1_executionstatus`, `jm1_sourceentity`, `jm1_humanapprovedby` |
| `jm1pub_title` | `jm1pub_titlename`, `jm1pub_certifiedimprint`, `jm1pub_assetregistrystatus`, `jm1pub_assetregistrylastverifiedon` |
| `jm1pub_publishingasset` | `jm1pub_name`, `jm1pub_titleid`, `jm1pub_contractid`, `jm1pub_assetformat`, `jm1pub_normalizedisbn`, `jm1pub_assethealthstatus` |
| `jm1pub_assetmarketplace` | `jm1pub_name`, `jm1pub_publishingassetid`, `jm1pub_marketplace`, `jm1pub_marketplaceidentifier`, `jm1pub_marketplacestatus` |

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

IS-009 Dev schema is now ready for migration-engine staging and validation.

Remaining automation-readiness note:

- `jm1_executionevent` remains present in JM1-Dev as a Dev/Foundation sandbox support table.
- PAM does not use it as a substitute.
- The service-principal/client-credential metadata path still needs hardening before unattended promotion or scheduled inventory runs.
