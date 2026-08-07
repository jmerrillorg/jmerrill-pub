# System of Record Map

| Publishing data object | Single authoritative system | Claimants found | Status | Evidence |
| --- | --- | --- | --- | --- |
| Title | Dataverse `jm1pub_title` | Dataverse; SharePoint folders; repository evidence | SINGLE_WITH_SUPPORTING_EVIDENCE | docs/architecture/generated/JMP-SLICE-3-IMPLEMENTATION-PLANNING-v1.0/01-canonical-entity-mapping.md |
| Edition / Product Form instance | Dataverse `jm1pub_edition` | `jm1pub_edition`; `jm1pub_publishingasset`; artifact records | RULED | Jackie executive ruling 2026-08-07: `jm1pub_edition` owns elected Product Form/edition lifecycle; assets/files support the edition. |
| Commercial catalog item | Dataverse `jm1pub_commercialcatalogitem` / Slice 2 seed authority | Dataverse; `lib/commercial/catalog.ts`; website package projections | SINGLE_WITH_SOURCE_PROJECTION | docs/architecture/generated/JMP-CATALOG-RECONCILIATION-FINAL-2026-08-05/00-executive-disposition.md |
| Pricing | Final pricing authority register | Matrix v1.1; catalog rows; website package source | SINGLE_WITH_SOURCE_PROJECTION | docs/architecture/generated/JMP-CATALOG-RECONCILIATION-FINAL-2026-08-05/07-pricing-authority-register.csv |
| Agreement template | Implementation HQ Agreement Templates | Generated corrective release; Implementation HQ; repo evidence copies | SINGLE_WITH_SUPERSEDED_COPIES | docs/operations/generated/JMP-AGREEMENT-GOVERNED-FILING-AND-PIPELINE-AUTOMATION-2026-08-05/agreement-template-version-register.md |
| Generated agreement artifact | Governed generated agreement artifact storage | Azure Function output; SharePoint/Implementation HQ; execution manifest | SINGLE_PENDING_OPERATIONAL_STORAGE_POLICY | docs/operations/generated/JMP-AGREEMENT-GOVERNED-FILING-AND-PIPELINE-AUTOMATION-2026-08-05/00-executive-summary.md |
| Author contact | Dataverse contact | Dataverse; Outlook; SharePoint evidence | SINGLE_WITH_IDENTITY_HOLDS | docs/operations/generated/2026-07-17-JM1-2026-Royalty-Author-Identity-Final-Register.csv |
| Manuscript source | SharePoint governed title folder | SharePoint; generated repo copies; local files | RULED | Jackie executive ruling 2026-08-07: governed SharePoint title file is manuscript authority; repo/local copies are evidence or working artifacts. |
| Editorial artifact | SharePoint governed artifact/file location | `jm1pub_editorialartifact`; publishing asset; SharePoint files | RULED | Jackie executive ruling 2026-08-07: governed file is artifact authority; Dataverse classifies/tracks it. |
| Execution log | Dataverse `jm1_executionlog` | Dataverse; repository evidence packages | SINGLE_WITH_REPOSITORY_EVIDENCE_COPY | docs/architecture/generated/JMP-SLICE-3-DESIGN-PACKAGE-v1.0/02-ExecutionLog-Taxonomy.md |
| Distribution job | Dataverse `jm1_executionlog` | Distribution command center; execution log; proposed `jm1_distributionjob` | RULED | Jackie executive ruling 2026-08-07: distribution attempts/outcomes are execution events unless a future ruled design creates another authority. |
| Release plan | Dataverse title/edition authority | title fields; proposed release-plan row; edition dates | RULED | Jackie executive ruling 2026-08-07: release anchor, submission, and confirmed-live dates remain on title/edition authority. |
| Royalty statement | Dataverse royalty statement/line authority | CSV manifests; Dataverse schema; Business Central | RULED_WITH_BC_BOUNDARY | Jackie executive ruling 2026-08-07: Dataverse owns operational author/title royalty statement; Business Central remains accounting/payable/posting/payment/GL authority. |
| Payment evidence | Stripe | Stripe; Dataverse; Business Central | RULED | Jackie executive ruling 2026-08-07: Stripe owns transaction truth; Dataverse projects status and Business Central records financial consequence. |
| Complimentary copy entitlement | PUB-STD Author Copy Policy | policy doc; agreement addendum code; package pages | SINGLE_POLICY_WITH_PROJECTIONS | docs/governance/publishing/PUB-STD-Author-Copy-Policy.md |
| Marketing profile | Author Operating Center marketing profile | Dataverse/Core log; author portal; manual notes | PARTIAL | docs/implementation/JM1-Capability-Maturity-Registry.md |
| Newsletter signup | Power Automate target after route acceptance | website route; newsletter flow; fallback email | PARTIAL | docs/audits/issue-12-form-integration-audit.md |
| Microsoft entitlement state | Microsoft tenant/license readback | Program 004 matrix; Annex A entitlement register | RULED | Jackie executive ruling 2026-08-07: tenant/license source is live entitlement authority; repo matrices are evidence. |

Conflicts ruled: 8 / 8. No blank system-of-record conflict rulings remain.

Royalty boundary: Dataverse owns the operational royalty statement/line authority for the author/title relationship. Business Central remains authoritative for accounting liability, payable/posting/payment, and general-ledger records.
