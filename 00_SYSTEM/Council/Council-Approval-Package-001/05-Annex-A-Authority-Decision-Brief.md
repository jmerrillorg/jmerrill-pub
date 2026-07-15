# 05 - Annex A Authority Decision Brief

## Artifact Reviewed

ADR-JM1-V3-EXT-001 Annex A Validation v0.1

## Current Status

CANDIDATE - VALIDATED PARTIALLY

## Recommended Decision

APPROVE AS AUTHORITATIVE WITH EXCEPTIONS

This recommendation is narrower than full authority. Annex A may become an authoritative workload map only if Jackie accepts the named exceptions below and preserves follow-up review for unresolved entitlement, installation, capacity, provisioning, and ownership facts. If Jackie does not want an exception-based authority model, the correct decision is `REMAIN CANDIDATE`.

## Platform Row Classification

| Platform / Workload Area | Classification | Missing Fact | Materiality | Architecture Effect | Implementation Effect | May Remain Approved Exception | Recommended Next Evidence Source |
|---|---|---|---|---|---|---|---|
| Accepted ADR source and architecture direction | VERIFIED | None | High | Confirms architecture | Does not implement | Not needed | Repository ADR v0.4 |
| Microsoft 365 / Entra tenant foundation | PARTIALLY VERIFIED | Complete entitlement/ownership map by workload | High | Does not change canon | Blocks implementation details | Yes | Entra admin center and license exports |
| Dataverse / JM1-Core | PARTIALLY VERIFIED | Full production table/register implementation path | High | Does not change canon | Blocks schema execution | Yes | JM1-Core solution inventory |
| SharePoint governed document source | PARTIALLY VERIFIED | Full site/library ownership and retention map | Medium | Does not change canon | Affects provisioning and controls | Yes | SharePoint admin center and site permissions |
| Azure AI Foundry / Agent runtime | PARTIALLY VERIFIED | Capacity, model availability, runtime ownership | High | Does not change canon | Blocks runtime promotion | Yes | Azure portal, Foundry project, quota records |
| Power Automate / workflow orchestration | PARTIALLY VERIFIED | Flow ownership, environment strategy, premium entitlement | High | Does not change canon | Blocks workflow deployment | Yes | Power Platform admin center |
| Power BI / Fabric analytics | NOT VERIFIED | Entitlement, workspace, capacity, data-source ownership | Medium | Does not change canon | Blocks analytics implementation | Yes | Fabric/Power BI admin center |
| Business Central / financial operations | PARTIALLY VERIFIED | Cutover and opening-balance final proof | High | Does not change canon | Blocks financial production movements | Yes | Business Central and bank/QBO evidence |
| Agent 365 / AI workforce | PARTIALLY VERIFIED | Tenant entitlement, install state, commission path | High | Does not change canon | Blocks agent activation | Yes | Microsoft 365 admin center / Agent admin surface |
| Third-party or marketplace AI models | PARTIALLY VERIFIED | Marketplace deployment and quota/capacity proofs | Medium | Does not change canon | Blocks model routing | Yes | Azure marketplace and deployment records |
| Cross-pillar unified views | SEPARATE AUTHORITY | Jackie approval for cross-pillar unification | High | Boundary-preserving | Blocks unified-view implementation | No, requires separate authority | Jackie governance decision |
| AIC/JMF autonomy beyond A2 | SEPARATE AUTHORITY | Explicit separate approval | High | Boundary-preserving | Blocks autonomy expansion | No, requires separate authority | Jackie governance decision |

## Express Exception Model

| Workload | Exception | Operational Effect | Required Follow-Up | Review Date |
|---|---|---|---|---|
| Entra / Microsoft 365 | Full entitlement and owner export incomplete | Architecture may be authoritative; implementation must verify per workload | Export tenant/workload/license evidence | 2026-08-15 |
| Dataverse / JM1-Core | Register implementation not approved | Repository schemas cannot be treated as deployed tables | Separate implementation package | 2026-08-15 |
| Foundry / AI runtime | Capacity/runtime facts incomplete | Runtime promotion remains separately governed | Reconcile Foundry project, deployment, quota | 2026-08-15 |
| Power Platform | Flow ownership/environment strategy incomplete | Workflow implementation requires separate proof | Power Platform inventory | 2026-08-15 |
| Business Central | Opening-balance and cutover proof incomplete | Financial operations remain held where evidence is missing | CAP-007 evidence package | 2026-08-15 |
| Cross-pillar unified views | Separate authority required | No unified cross-pillar views | Jackie decision | 2026-08-15 |
| AIC/JMF autonomy beyond A2 | Separate authority required | No expanded autonomy | Jackie decision | 2026-08-15 |

## Proposed Decision Language - Retain Candidate

I direct Annex A to remain CANDIDATE - VALIDATED PARTIALLY. The validation record may guide future evidence collection, but Annex A is not authoritative and does not authorize implementation until remaining material entitlement, installation, capacity, provisioning, ownership, and separate-authority questions are resolved.

## Proposed Decision Language - Authoritative With Exceptions

I approve Annex A as authoritative with the named exceptions listed in Council-Approval-Package-001. This approval makes Annex A the governed workload map only where evidence is verified or where an exception is expressly accepted. It does not authorize implementation, cross-pillar unified views, AIC/JMF autonomy beyond approved boundaries, runtime deployment, schema changes, or agent commissioning. Each exception must be reviewed by the stated follow-up date before implementation depends on it.
