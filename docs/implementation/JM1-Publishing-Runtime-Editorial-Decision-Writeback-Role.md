## JM1 Publishing Runtime - Editorial Decision Writeback Role

Status: Proven in JM1-Core on 2026-07-10

Role
- Name: `JM1 Publishing Editorial Writeback - Core`
- Role ID: `53cf33ac-a07c-f111-ab0e-000d3a184b71`
- Assigned application user: `JM1-INFRA-PAM-Automation`
- Application ID: `1e60cddf-dd28-4933-a927-dbc03bb89737`
- System user ID: `b7d26c09-9a7c-f111-ab0f-7c1e525b15c2`

Purpose
- Permanent least-privilege editorial runtime writeback lane for governed JM1-Core operations.
- Replaces delegated admin as the normal write path for approved editorial runtime operations.

Baseline privileges already present
- `jm1pub_editorialapprovalgate`: Read, Update
- `jm1pub_editorialstage`: Read, Update
- `jm1pub_editorialsummary`: Read, Create, Update
- `jm1pub_editorialartifact`: Read, Create, Update
- `jm1_executionlog`: Create, Read

Additional least-privilege grants applied on 2026-07-10
- `prvAppendTojm1pub_PublishingAsset`
- `prvAppendTojm1pub_Title`
- `prvAppendToJm1pub_Editorialapprovalgate`
- `prvAppendTojm1pub_EditorialStage`
- `prvAppendToJm1pub_Editorialartifact`
- `prvAppendJm1pub_Editorialartifact`
- `prvAppendJm1pub_Editorialsummary`
- `prvAppendjm1_ExecutionLog`

Grant method
- Dataverse Web API bound action:
  `POST /api/data/v9.2/roles(53cf33ac-a07c-f111-ab0e-000d3a184b71)/Microsoft.Dynamics.CRM.AddPrivilegesRole`
- Result: HTTP `204 No Content`

Reason for added privileges
- Runtime proof initially failed with:
  - missing `prvAppendTojm1pub_PublishingAsset`
  - then missing `prvAppendTojm1pub_EditorialStage`
- These were the concrete relationship privileges required for controlled editorial artifact creation against live linked Core records.

Governed proof completed with permanent identity only
- Editorial artifact create: success
- Editorial summary create: success
- Editorial stage non-destructive patch: success
- Editorial approval gate non-destructive patch: success
- Execution log create: success
- Execution log readback: success

Proof records
- Proof artifact ID: `1670c216-a57c-f111-ab0f-000d3a14673b`
- Proof summary ID: `02029150-a57c-f111-ab0e-000d3a184b71`
- Proof execution log ID: `9a268c65-a57c-f111-ab0f-00224820105b`

Scope boundary
- No schema changes
- No table recreation
- No gate advancement
- No stage advancement
- No author-facing state change
- No delegated admin used for final proof

Readiness decision
- Permanent Core editorial writeback lane is functionally proven for the approved JM1-Core editorial runtime scope.
