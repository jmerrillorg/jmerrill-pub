# Microsoft Architecture

Dataverse remains operational truth. Azure Functions / durable queueing should host controller execution where long-running work or retry/backoff is needed. Power Automate remains appropriate for Microsoft ecosystem workflow, notifications, approvals, and Dataverse event orchestration. Microsoft Foundry executes governed AI work but does not own lifecycle state.
