# 18 - Shared Capabilities Consumed by CC-010

Last verified: 2026-08-14T01:41:41.767Z

| Capability | Canonical implementation | CC-010 disposition |
| --- | --- | --- |
| Intake handoff | /join -> Publishing Intake -> source/manuscript ready -> Stage 0 | Consumes; does not replace /join. |
| Artifact storage | Governed JM1-PUB SharePoint title folders plus Dataverse artifact references/checksums | Consumes; SharePoint remains artifact authority. |
| Model routing | governedRouteRegistry + editorialModelRoutingRegistry | Consumes centralized routing; no per-title provider choice. |
| Communication | Publishing dispatch / ACS governed communication services | Consumes; no CC-010 email fork. |
| Author response | authorReviewResponseConsumer / publishing mailbox reader | Consumes shared response capture and correlation. |
| Jackie notification | JACKIE_ACTION_REQUIRED notification model in Publisher Operating Center | Consumes reusable notification model. |
| Author Workspace | Author Operating Center / shared author auth/session | Consumes; no separate editorial portal. |
| Authentication | Durable Author/Publisher auth services | Consumes shared identity platform. |
| Execution logging | jm1_executionlog | Writes through canonical execution log discipline. |
| Public identity | author identity / public attribution resolver | Consumes; no separate name resolver. |
| E-sign | Governed agreement/e-sign lane upstream/downstream of editorial | Referenced only when relevant; not editorial authority. |

## Current Model Routing Preference

| CC-010 phase | Preferred provider |
| --- | --- |
| Stage 0 / Editorial Review | Claude via Microsoft Foundry |
| Developmental Editing | Claude via Microsoft Foundry |
| Line Editing | Claude via Microsoft Foundry |
| Copyediting | OpenAI |
| Proofreading | OpenAI |