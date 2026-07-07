# IS-009 - JM1-Dev Baseline Remediation Plan

**Program:** PAM-001 - Publishing Asset Management
**Specification:** IS-009 - Publishing Asset Registry
**Status:** Baseline remediation completed in JM1-Dev
**Authority:** Jackie confirms PAM canon unchanged; missing JM1-Dev dependencies are an environment baseline gap
**Boundary:** JM1-Dev metadata deployment only; no data migration, no file movement, no royalty/payment activity

## 1. Baseline Gap Analysis

IS-009 could not safely proceed to schema build in JM1-Dev until two canonical baseline tables existed:

- `jm1pub_contract`
- `jm1_executionlog`

Read-only metadata checks show:

| Environment | `jm1pub_contract` | `jm1_executionlog` | `jm1_executionevent` | `jm1pub_title` | Notes |
| --- | --- | --- | --- | --- | --- |
| JM1-Core / `jm1hq.crm.dynamics.com` | Exists | Exists | Exists | Exists | Canonical source environment for missing baseline tables. |
| JM1-Dev / `org52409ff2.crm.dynamics.com` | Missing | Missing | Exists | Exists | Dev baseline gap. |
| JM1-Test / `jm1test.crm.dynamics.com` | Missing | Missing | Exists | Exists | Test has the same baseline gap as Dev. |
| JM1-CRM-Core / `jm1crm.crm.dynamics.com` | Missing | Missing | Missing | Missing | Not a source for PAM baseline. |
| One Dynamics Environment / `jmerrillone.crm.dynamics.com` | Missing | Missing | Missing | Missing | Not a source for PAM baseline. |

Original conclusion:

- The source of truth for the missing baseline is JM1-Core.
- JM1-Dev and JM1-Test are incomplete relative to current PAM / PROGRAM-002 canon.
- This is an environment baseline issue, not a canon change.

## 2. Source Solution / Package Findings

Read-only solution membership checks in JM1-Core found:

### `jm1pub_contract`

| Solution Unique Name | Friendly Name | Managed | Notes |
| --- | --- | --- | --- |
| `JM1_Publishing` | JM1_Publishing | false | Recommended source solution family for publishing contract table. |
| `JM1_Core` | JM1_Core | false | Contains broad enterprise dependencies; do not import wholesale. |
| `JMerrillOne` | J Merrill One | false | Broad enterprise solution; do not import wholesale. |
| `Default` | Default Solution | false | Not a governed deployment source. |

### `jm1_executionlog`

| Solution Unique Name | Friendly Name | Managed | Notes |
| --- | --- | --- | --- |
| `JM1_Foundation` | JM1_Foundation | false | Canonical foundation source for execution log, but prior dependency history requires filtering. |
| `JM1_Publishing` | JM1_Publishing | false | Also contains execution log; useful if packaging PAM publishing prerequisites together. |
| `JM1_Core` | JM1_Core | false | Broad enterprise dependencies; do not import wholesale. |
| `Default` | Default Solution | false | Not a governed deployment source. |

Recommendation:

- Do not import full `JM1_Core`, `JMerrillOne`, or Default.
- Create a filtered remediation solution exported from JM1-Core.
- Suggested solution name: `JM1_PAM_BaselinePrerequisites`.
- Include only the minimum required contract/log components and their direct dependencies.

## 2.1 Remediation Execution Result

The recommended filtered package was attempted first.

Created/exported from JM1-Core:

- Solution: `JM1_PAM_BaselinePrerequisites`
- Export: `artifacts/is009-baseline/JM1_PAM_BaselinePrerequisites_unmanaged.zip`
- SHA-256: `1ae8fe8bf8ac30ee7c7fc7d011e8816c8e283fd96d749dc9cde0813c66ea624f`

Import result into JM1-Dev:

- Failed due to missing dependency chain.
- The package pulled Sales/Opportunity dependencies plus AI/editorial dependencies from Core metadata.
- Evidence: `docs/implementation/evidence/IS-009/JM1_PAM_BaselinePrerequisites_import.log`

Controlled fallback used:

- Same-logical-name Dev baseline seed from canon/Core metadata.
- `jm1pub_contract` created in JM1-Dev.
- `jm1_executionlog` created in JM1-Dev.
- Optional dependency-heavy chains were intentionally not imported:
  - Sales/Opportunity package chain
  - optional AI prompt/skill/agent lookup chain
  - broad editorial dependencies

Governance posture:

- This does not replace the canonical entities.
- PAM still uses `jm1pub_contract`.
- PAM still uses `jm1_executionlog`.
- `jm1_executionevent` remains a Dev/Foundation sandbox support table and is not used as the PAM proof-layer replacement.

## 3. Existing Core Field Inventory

### `jm1pub_contract`

JM1-Core metadata:

- Entity set: `jm1pub_contracts`
- Display name: Contract
- Ownership: User-owned
- Attributes: 75
- Many-to-one relationships: 15
- Alternate keys: 0

PAM-relevant custom fields:

| Field | Type | Required Level | Notes |
| --- | --- | --- | --- |
| `jm1pub_contractid` | Uniqueidentifier | SystemRequired | Primary ID |
| `jm1pub_contractname` | String | ApplicationRequired | Primary/name field |
| `jm1pub_contracttype` | Picklist | None | Contract classification |
| `jm1pub_status` | Picklist | None | Contract/agreement status |
| `jm1pub_title` | Lookup | None | Links contract to `jm1pub_title` |
| `jm1pub_opportunity` | Lookup | None | Links to Opportunity; dependency may pull Sales components if included |
| `jm1pub_docurl` | String | None | Document URL/reference |
| `jm1pub_esignprovider` | Picklist | None | E-sign provider |
| `jm1pub_agreementsenton` | DateTime | None | Sent timestamp |
| `jm1pub_signeddate` | DateTime | None | Signed timestamp |
| `jm1pub_provideragreementid` | String | None | Provider agreement/envelope ID |
| `jm1pub_providerinviteid` | String | None | Provider invite ID |
| `jm1pub_providerstatus` | String | None | Provider status |
| `jm1pub_templateversionreference` | String | None | Template/version evidence |
| `jm1pub_selectedpackagecode` | String | None | Package selection evidence |
| `jm1pub_standardpackageprice` | Money | None | Standard package price |
| `jm1pub_commissioningtransactionamount` | Money | None | Commissioning transaction override |
| `jm1pub_paymentpath` | String | None | Payment path evidence |
| `jm1pub_royaltypercent` | Decimal | None | Royalty-related field; do not automate royalties in this pass |

Dependencies observed:

- `contact`
- `account`
- `jm1pub_title`
- `jm1_brand`
- `opportunity`
- `transactioncurrency`
- standard owner/team/user/business-unit system tables

Dependency guidance:

- For IS-009 baseline, the critical dependency is the table itself and a future lookup target from `jm1pub_publishingasset`.
- Avoid importing optional Sales/Opportunity-dependent subcomponents unless required by Dataverse packaging.
- If the existing `jm1pub_opportunity` lookup cannot be excluded from the table package, pause and assess whether the dependency chain remains acceptable.

### `jm1_executionlog`

JM1-Core metadata:

- Entity set: `jm1_executionlogs`
- Display name: Execution Log
- Ownership: User-owned
- Attributes: 56
- Many-to-one relationships: 12
- Alternate keys: 0

Core execution-log fields:

| Field | Type | Required Level | Notes |
| --- | --- | --- | --- |
| `jm1_executionlogid` | Uniqueidentifier | SystemRequired | Primary ID |
| `jm1_name` | String | None | Name/label |
| `jm1_actiondescription` | Memo | ApplicationRequired | Safe event description |
| `jm1_actiontype` | String | ApplicationRequired | Event/action key |
| `jm1_agentname` | String | ApplicationRequired | Actor/agent name |
| `jm1_agentmodel` | String | None | Optional model/agent metadata |
| `jm1_bandlevel` | Picklist | ApplicationRequired | Execution band |
| `jm1_executionstatus` | Picklist | ApplicationRequired | Success/failure/status |
| `jm1_startedon` | DateTime | ApplicationRequired | Start timestamp |
| `jm1_completedon` | DateTime | None | Completion timestamp |
| `jm1_sourceentity` | String | None | Source entity logical name |
| `jm1_sourcerecordid` | String | None | Source record ID/reference |
| `jm1_errordetail` | Memo | None | Safe error detail |
| `jm1_approvaltimestamp` | DateTime | None | Approval evidence |
| `jm1_humanapprovedby` | Lookup | None | Human approver |
| `jm1_agentregistry` | Lookup | None | Optional dependency |
| `jm1_prompttemplate` | Lookup | None | Optional AI/prompt dependency |
| `jm1_skill` | Lookup | None | Optional AI/skill dependency |

Dependencies observed:

- `systemuser`
- `jm1_agentregistry`
- `jm1_aiprompttemplate`
- `jm1_aiskill`
- standard owner/team/user/business-unit system tables

Dependency guidance:

- The core proof layer can be restored with required scalar fields first.
- Optional AI registry/prompt/skill lookups are dependency-heavy and should be excluded from the minimal baseline package if Dataverse permits selected subcomponents.
- If Dataverse packaging forces the AI dependency chain, stop and prepare a separate foundation dependency decision rather than importing broad AI/editorial components silently.

## 4. `jm1_executionevent` Relationship to `jm1_executionlog`

`jm1_executionevent` exists in JM1-Dev and JM1-Test. It also exists in JM1-Core, with solution membership:

- `JM1_EnterpriseFoundation`
- Default Solution

Governance interpretation:

| Question | Answer |
| --- | --- |
| Dev sandbox artifact? | Yes. It is the dependency-light execution proof table created for portable Dev/Foundation ALM. |
| Replacement for `jm1_executionlog`? | No. Jackie explicitly confirmed not to replace `jm1_executionlog`. |
| Parallel proof layer? | Only as a foundation/ALM sandbox support table. It is not the canonical PROGRAM-002/PAM operational proof layer. |
| Obsolete? | No evidence that it is obsolete. It remains useful for dependency-light Dev/Foundation scenarios. |
| Should PAM switch to it? | No. PAM should continue to require `jm1_executionlog` unless Jackie separately changes canon. |

Clean rule:

- `jm1_executionevent` may remain in JM1-Dev.
- IS-009 should not use it as a substitute.
- Restoring `jm1_executionlog` to JM1-Dev is the correct baseline remediation.

## 5. Remediation Plan

### 5.1 Required Baseline Tables

| Table | Action |
| --- | --- |
| `jm1pub_contract` | Import/seed from JM1-Core filtered baseline package. |
| `jm1_executionlog` | Import/seed from JM1-Core filtered baseline package. |

### 5.2 Required Fields

Minimum required field posture:

- Include all system-required and application-required fields.
- Include PAM/PROGRAM-002 agreement fields needed by existing canon.
- Include execution-log scalar fields needed for safe proof logging.
- Exclude optional dependency-heavy lookup fields where possible.

Minimum `jm1pub_contract` field set:

- `jm1pub_contractid`
- `jm1pub_contractname`
- `jm1pub_contracttype`
- `jm1pub_status`
- `jm1pub_title`
- `jm1pub_docurl`
- `jm1pub_esignprovider`
- `jm1pub_agreementsenton`
- `jm1pub_signeddate`
- `jm1pub_provideragreementid`
- `jm1pub_providerinviteid`
- `jm1pub_providerstatus`
- `jm1pub_templateversionreference`
- package/payment evidence fields already present in Core, excluding live payment activity

Minimum `jm1_executionlog` field set:

- `jm1_executionlogid`
- `jm1_name`
- `jm1_actiondescription`
- `jm1_actiontype`
- `jm1_agentname`
- `jm1_agentmodel`
- `jm1_bandlevel`
- `jm1_executionstatus`
- `jm1_startedon`
- `jm1_completedon`
- `jm1_sourceentity`
- `jm1_sourcerecordid`
- `jm1_errordetail`
- `jm1_approvaltimestamp`
- `jm1_humanapprovedby`

### 5.3 Deployment Method

Executed:

1. In JM1-Core, created a new unmanaged filtered solution:
   - `JM1_PAM_BaselinePrerequisites`
2. Added existing table `jm1pub_contract`.
3. Added existing table `jm1_executionlog`.
4. Add required choice sets used by selected columns.
5. Add required direct dependencies only.
6. Do not add data rows.
7. Do not add flows, apps, connection references, Business Central components, Stripe components, SignNow components, or unrelated AI/editorial components.
8. Exported unmanaged package for Dev import.
9. Import into JM1-Dev failed because Dataverse dependency resolution pulled excluded broad packages.
10. Used authorized fallback to seed the canonical logical names directly in JM1-Dev.
11. Published customizations.
12. Ran read-only validation.

Fallback execution:

- Recreated/seeded the two baseline tables from canon/Core metadata in JM1-Dev under canonical logical names.
- Did not hand-design substitute tables.
- Did not alter PAM canon.
- Did not point PAM to `jm1_executionevent`.

Not recommended:

- Import full `JM1_Core`.
- Import full `JM1_Publishing`.
- Import from Default Solution.
- Repoint PAM to `jm1_executionevent`.

### 5.4 Validation

After import into JM1-Dev, run:

```bash
DATAVERSE_RESOURCE_URL=https://org52409ff2.crm.dynamics.com \
DATAVERSE_WEB_API_BASE_URL=https://org52409ff2.crm.dynamics.com/api/data/v9.2 \
DATAVERSE_ACCESS_TOKEN=<delegated-read-token> \
node scripts/is009_build_readiness.mjs
```

Validation confirmed:

- `jm1pub_contract` exists.
- `jm1_executionlog` exists.
- `contact` still exists.
- `jm1pub_title` still exists.
- `jm1pub_publishingasset` exists after authorized IS-009 build.
- `jm1pub_assetmarketplace` exists after authorized IS-009 build.
- No production data was moved.
- No flows/apps/connection references were imported.
- No Business Central, Stripe, SignNow, royalty, or payment components were imported.

## 6. Source-of-Truth Recommendation

Use JM1-Core as the source-of-truth environment for the missing baseline metadata.

Build the remediation package from:

- `JM1_Publishing` for `jm1pub_contract`
- `JM1_Foundation` / `JM1_Publishing` for `jm1_executionlog`

But package them into a new minimal filtered baseline solution for Dev import:

- `JM1_PAM_BaselinePrerequisites`

Do not recreate from scratch unless filtered export/import fails or creates an unavoidable dependency chain.

## 7. Resolved / Remaining Blockers

| Blocker | Status |
| --- | --- |
| Filtered solution cannot exclude broad dependencies | Resolved by same-logical-name Dev baseline seed; broad dependencies were not imported. |
| `jm1pub_contract` optional Opportunity lookup forces Sales package dependency | Resolved by omitting optional Opportunity lookup from the Dev baseline seed. |
| `jm1_executionlog` optional AI/prompt/skill lookups force AI/editorial dependency chain | Resolved by omitting optional AI registry/prompt/skill lookups from the Dev baseline seed. |
| Recreating baseline tables becomes necessary | Completed under full PAM/IS-009 implementation authority. |
| Target environment changes | Not required; JM1-Dev remains the target. |
| Service-principal metadata access | Still requires hardening before unattended automation/promotion. |

## 8. Readiness Recommendation

Baseline remediation is complete.

IS-009 schema build has also completed in JM1-Dev and validated by metadata readback.

Next operational step:

1. Build source staging/validation scripts.
2. Generate migration profiles from frozen source files.
3. Validate matching and exception rules before any import.
