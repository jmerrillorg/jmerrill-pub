# Conflict Register

| Conflict ID | Concept | Conflict | Evidence | Required disposition |
|---|---|---|---|---|
| CR-001 | `jm1_titleproductform` | Would duplicate `jm1pub_edition` and operational `jm1pub_publishingasset` if implemented as a new table. | Commercial Architecture Crosswalk; IS-009 PAM spec | `EXTEND_EXISTING_ENTITY` |
| CR-002 | `jm1_titleproductform` | Could move edition-level ISBN away from approved edition/asset authority. | Title Edition required field set; Title-Pubs Canonical Identifier Model | `EXTEND_EXISTING_ENTITY` |
| CR-003 | `jm1_productformattribute` | Could become a ninth product-form route if PF-05 complexity or PF-04 narration is modeled as product form instead of attribute. | `PF-05C` prohibited by guard; PF-04/PF-05 attributes in catalog | `NEW_ENTITY_REQUIRED` |
| CR-004 | `jm1_releaseplan` | Could assert release state without distributor submission/live evidence. | OP-008/OP-009 boundaries; Edition Lifecycle Execution Log spec | `NEW_ENTITY_REQUIRED` |
| CR-005 | `jm1_productionmode` | Conflicts with Publishing Track if used to decide payer, funding, author billing, or SKU identity. | `authorBillableAmount()` Traditional $0 resolver; Contract Pricing Schedule Mapping | `CONFLICT` |
| CR-006 | `jm1_productionmode` | Conflicts with quote/SOW and program-only boundaries if treated as production authorization. | BC Item Classification; PF-07/PF-08 program-only enforcement | `CONFLICT` |
| CR-007 | `jm1_artifact` | Generic artifact table would duplicate `jm1pub_editorialartifact`. | PROGRAM-003 schema activation | `CONFLICT` |
| CR-008 | `jm1_artifact` | Generic artifact table would blur title-level and PF-level artifact authority. | Editorial artifact relationships to title, stage, gate, and publishing asset | `CONFLICT` |
| CR-009 | `jm1_artifact` | Could imply Dataverse stores files instead of references, contrary to SharePoint file evidence doctrine. | PAM File Storage Doctrine | `CONFLICT` |
| CR-010 | `jm1_distributionjob` | No conflict if new job entity is subordinate; conflict only if it replaces `jm1pub_assetmarketplace` or `jm1_executionlog`. | PAM model; Edition Lifecycle Execution Log spec | `NEW_ENTITY_REQUIRED` |
| CR-011 | all Path B concepts | Path B currently lacks explicit author-facing status projection. | PROGRAM-002 workspace commissioning removed internal labels from author surfaces | `EXTEND_EXISTING_ENTITY` |
| CR-012 | all Path B concepts | Path B cannot implement before catalog reconciliation and Slice 2 without hardening draft taxonomy into schema. | Commercial catalog says Dataverse operational source pending Slice 2; catalog reconciliation worksheet remains critical | `RESEARCH_REQUIRED` |

