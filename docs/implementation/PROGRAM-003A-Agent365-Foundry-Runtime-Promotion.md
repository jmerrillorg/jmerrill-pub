## PROGRAM-003A Agent365 / Foundry Runtime Promotion

Status: Promotion materially proven on 2026-07-10

Purpose
- Promote the existing governance model into live runtime behavior without redesigning the enterprise architecture.

Canonical path
- Human authority
- governed request boundary
- governed prompt from Dataverse
- Azure AI runtime execution
- Dataverse operational memory
- execution and AI audit evidence

Environment truth
- Environment: `JM1-Core`
- Org URL: `https://jm1hq.crm.dynamics.com`
- Web API: `https://jm1hq.crm.dynamics.com/api/data/v9.2`

Permanent governed writer
- Display: `JM1-INFRA-PAM-Automation`
- Application ID: `1e60cddf-dd28-4933-a927-dbc03bb89737`
- Service principal object ID: `cefcfa8f-5a3c-4fc7-afcb-8c76cfa77c8f`
- Dataverse system user ID: `b7d26c09-9a7c-f111-ab0f-7c1e525b15c2`

What was reconciled
- Runtime targets JM1-Core instead of Dev
- Permanent application user proven directly in JM1-Core
- Least-privilege editorial writeback role completed
- Governed prompt resolution reads Dataverse and stays visible when unresolved
- Controlled synthetic execution forces Azure OpenAI provider for governed Foundry proof
- Dependency telemetry now records Dataverse and Azure operations in Application Insights dependencies, not traces only

What is now proven
- Permanent application identity can:
  - read editorial gate, stage, summary, and artifact records
  - create editorial artifact records
  - create editorial summary records
  - patch editorial stage and gate records non-destructively
  - create and read execution log evidence
- Controlled Stage 0 transaction can:
  - resolve the active prompt from Dataverse
  - execute through Azure OpenAI
  - write AI request and execution audit rows
  - emit dependency telemetry with correlation evidence

Controlled proof reference
- See: `PROGRAM-003A-Controlled-Production-Proof.md`
- Correlation ID: `PROGRAM003A-FOUNDRY-PROOF-20260710-01`

Business boundary preserved
- The A2 approval slice for The Intentional Leader was not reopened
- Developmental Editing remains the live business lane
- Infrastructure work served the title rather than replacing title movement

Remaining completion items
- Source-control reconciliation into one governed PR from the relevant runtime files
- fresh authenticated browser validation showing The Intentional Leader as `Developmental Editing / In Progress`
- final deployment evidence for the truth guard / operating-center runtime if not already captured in this slice

Readiness decision
- Agent 365 governance plus Azure runtime execution is proven enough to support the first governed publishing transaction path.
- Remaining work is reconciliation and live UI confirmation, not architectural uncertainty.
