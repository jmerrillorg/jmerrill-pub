# System of Record Map

| Publishing data object | Single authoritative system | Claimants found | Status | Evidence |
| --- | --- | --- | --- | --- |
| Title | Dataverse `jm1pub_title` | Dataverse; SharePoint folders; repository evidence | SINGLE_WITH_SUPPORTING_EVIDENCE | docs/architecture/generated/JMP-SLICE-3-IMPLEMENTATION-PLANNING-v1.0/01-canonical-entity-mapping.md |
| Edition / Product Form instance | Dataverse `jm1pub_edition` target, implementation held | `jm1pub_edition`; `jm1pub_publishingasset`; artifact records | CONFLICT | docs/architecture/generated/JMP-SLICE-3-IMPLEMENTATION-PLANNING-v1.0/12-open-gap-and-decision-register.md |
| Commercial catalog item | Dataverse `jm1pub_commercialcatalogitem` / Slice 2 seed authority | Dataverse; `lib/commercial/catalog.ts`; website package projections | SINGLE_WITH_SOURCE_PROJECTION | docs/architecture/generated/JMP-CATALOG-RECONCILIATION-FINAL-2026-08-05/00-executive-disposition.md |
| Pricing | Final pricing authority register | Matrix v1.1; catalog rows; website package source | SINGLE_WITH_SOURCE_PROJECTION | docs/architecture/generated/JMP-CATALOG-RECONCILIATION-FINAL-2026-08-05/07-pricing-authority-register.csv |
| Agreement template | Implementation HQ Agreement Templates | Generated corrective release; Implementation HQ; repo evidence copies | SINGLE_WITH_SUPERSEDED_COPIES | docs/operations/generated/JMP-AGREEMENT-GOVERNED-FILING-AND-PIPELINE-AUTOMATION-2026-08-05/agreement-template-version-register.md |
| Generated agreement artifact | Governed generated agreement artifact storage | Azure Function output; SharePoint/Implementation HQ; execution manifest | SINGLE_PENDING_OPERATIONAL_STORAGE_POLICY | docs/operations/generated/JMP-AGREEMENT-GOVERNED-FILING-AND-PIPELINE-AUTOMATION-2026-08-05/00-executive-summary.md |
| Author contact | Dataverse contact | Dataverse; Outlook; SharePoint evidence | SINGLE_WITH_IDENTITY_HOLDS | docs/operations/generated/2026-07-17-JM1-2026-Royalty-Author-Identity-Final-Register.csv |
| Manuscript source | SharePoint governed title folder | SharePoint; generated repo copies; local files | CONFLICT_IF_GENERATED_COPY_TREATED_AS_SOURCE | docs/operations/publishing-successor-operations-hub/03-Standard-Operating-Procedures.md |
| Editorial artifact | SharePoint artifact plus Dataverse/reference evidence | `jm1pub_editorialartifact`; publishing asset; SharePoint files | CONFLICT | docs/architecture/generated/JMP-PATH-B-SCHEMA-DIVERGENCE-INVENTORY-2026-08-04/01-entity-mapping.csv |
| Execution log | Dataverse `jm1_executionlog` | Dataverse; repository evidence packages | SINGLE_WITH_REPOSITORY_EVIDENCE_COPY | docs/architecture/generated/JMP-SLICE-3-DESIGN-PACKAGE-v1.0/02-ExecutionLog-Taxonomy.md |
| Distribution job | Future execution-log event first, child entity if approved | Distribution command center; execution log; proposed `jm1_distributionjob` | CONFLICT | docs/architecture/generated/JMP-PATH-B-SCHEMA-DIVERGENCE-INVENTORY-2026-08-04/01-entity-mapping.csv |
| Release plan | Undecided | title fields; proposed release-plan row; edition dates | CONFLICT | docs/architecture/generated/JMP-SLICE-3-IMPLEMENTATION-PLANNING-v1.0/12-open-gap-and-decision-register.md |
| Royalty statement | Dataverse royalty tables after authorized load | CSV manifests; Dataverse schema; Business Central | CONFLICT_UNTIL_LOAD_AUTHORITY | docs/implementation/JM1-PAY-001-Author-Payout-Royalty-Governance-Standard-v1.0.md |
| Payment evidence | Stripe / Dataverse opportunity payment status | Stripe; Dataverse; Business Central | CONFLICT_UNTIL_BC_HANDOFF | lib/server/dataverse-execution-log.ts |
| Complimentary copy entitlement | PUB-STD Author Copy Policy | policy doc; agreement addendum code; package pages | SINGLE_POLICY_WITH_PROJECTIONS | docs/governance/publishing/PUB-STD-Author-Copy-Policy.md |
| Marketing profile | Author Operating Center marketing profile | Dataverse/Core log; author portal; manual notes | PARTIAL | docs/implementation/JM1-Capability-Maturity-Registry.md |
| Newsletter signup | Power Automate target after route acceptance | website route; newsletter flow; fallback email | PARTIAL | docs/audits/issue-12-form-integration-audit.md |
| Microsoft entitlement state | Tenant admin/license evidence | Program 004 matrix; Annex A entitlement register | UNKNOWN_FOR_SOME_PRODUCTS | docs/operations/generated/JM1-WAVE-2-ENTERPRISE-STANDARD-APPROVALS-2026-08-01/09-annex-a-entitlement-evidence-register.md |

Conflicts counted: 8.
