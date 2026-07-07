# IS-009 - JM1-Dev Baseline Remediation Plan

**Program:** PAM-001 - Publishing Asset Management  
**Specification:** IS-009 - Publishing Asset Registry  
**Status:** Baseline remediation plan only; no deployment performed  
**Authority:** Jackie confirms PAM canon unchanged; missing JM1-Dev dependencies are an environment baseline gap  
**Boundary:** No schema deployment, no Dataverse writes, no data migration, no file movement, no royalty/payment activity  

## 1. Baseline Gap Analysis

IS-009 cannot safely proceed to schema build in JM1-Dev until two canonical baseline tables exist:

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

Conclusion:

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

Recommended:

1. In JM1-Core, create a new unmanaged filtered solution:
   - `JM1_PAM_BaselinePrerequisites`
2. Add existing table `jm1pub_contract` with selected required/PAM-relevant columns only.
3. Add existing table `jm1_executionlog` with selected required/proof-layer columns only.
4. Add required choice sets used by selected columns.
5. Add required direct dependencies only.
6. Do not add data rows.
7. Do not add flows, apps, connection references, Business Central components, Stripe components, SignNow components, or unrelated AI/editorial components.
8. Export unmanaged package for Dev import.
9. Import into JM1-Dev.
10. Publish customizations.
11. Run read-only validation.

Fallback if filtered export is not viable:

- Recreate the two baseline tables from their Core metadata in a dedicated Dev baseline solution only after Jackie approves recreation from canon metadata.
- Do not hand-design substitute tables.
- Do not alter PAM canon.

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

Validation must confirm:

- `jm1pub_contract` exists.
- `jm1_executionlog` exists.
- `contact` still exists.
- `jm1pub_title` still exists.
- `jm1pub_publishingasset` does not yet exist unless later IS-009 build is authorized.
- `jm1pub_assetmarketplace` does not yet exist unless later IS-009 build is authorized.
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

## 7. Blockers Requiring Jackie Only

| Blocker | Jackie Decision Needed |
| --- | --- |
| Filtered solution cannot exclude broad dependencies | Decide whether to accept dependencies, split package further, or recreate from canon metadata. |
| `jm1pub_contract` optional Opportunity lookup forces Sales package dependency | Decide whether to include the lookup/dependency now or defer it from the Dev baseline. |
| `jm1_executionlog` optional AI/prompt/skill lookups force AI/editorial dependency chain | Decide whether to include, defer, or recreate a dependency-light canonical execution log shape. |
| Recreating baseline tables becomes necessary | Approve recreation from Core metadata/canon specs. |
| Target environment changes | Approve alternate target environment if JM1-Dev should not receive the baseline. |

## 8. Readiness Recommendation

Proceed with a minimal filtered baseline solution package from JM1-Core to JM1-Dev.

Do not authorize IS-009 schema build until:

1. `jm1pub_contract` is present in JM1-Dev.
2. `jm1_executionlog` is present in JM1-Dev.
3. The IS-009 readiness script confirms both tables by metadata readback.
4. The proposed PAM tables still show no conflicts.

