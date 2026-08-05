# Security and Role Model

Status: DESIGN ONLY
Security roles provisioned: 0
Authors and external users must have no direct access to internal PF-state tables or execution logs.

| Role | Expected authority | Table privileges | Field-level access | Transition permissions | Forbidden transitions | May approve exceptions | May see internal execution data | May affect author-facing status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Publishing Lifecycle Administrator | Full lifecycle configuration and governed mutation after implementation approval | CRUD on lifecycle config; title/edition update after approval | Can see internal lifecycle fields | All non-executive transitions; cannot self-approve executive holds/corrections | Executive-only FTL/correction approvals | No unless separately Executive Approver | Yes | May affect projection through governed state only |
| Publishing Operations | Limited state transitions | Read title/catalog/log; update permitted operational fields | Limited internal fields | REQUESTED, CONTRACTED, READY_FOR_PRODUCTION, holds by authority | Executive-only, schema/config changes, retirement | No | Limited | May update required action through projection rules |
| Editorial Lead | Editorial and author-review transitions | Read/update editorial fields and author-review state | Editorial fields only | content freeze, author review, approval, correction evidence preparation | Distribution submission/live, contract status | No | Limited | May trigger author review projection |
| Production Lead | PF production and QA transitions | Read/update production and QA fields | Production/QA fields only | IN_PRODUCTION, INTERNAL_QA, QA rework, production holds | Contracting, FTL approval, live confirmation | No | Limited | May affect in-production/internal-review projection |
| Distribution Lead | Distribution readiness, submission, live confirmation | Read title/edition; update distribution fields | Distribution fields only | DISTRIBUTION_READY, SUBMITTED, confirmed-live with readback | Editorial approval, correction approval, schema changes | No | Limited | May affect submitted/live projection |
| Executive Approver | FTL, correction, exceptions, release holds | Read all; approve governed authority records | Can see approval-sensitive fields | FTL, CORRECTION_AUTHORIZED, exceptions, cancellation, retirement | Routine production mutation as service operator | Yes | Yes | May authorize projection changes |
| Author Workspace Service | Read author-facing projection only | Read projection/calculated status only | No internal field access | None | All internal transitions and approvals | No | No | Displays projection only |
| Automation Service Identity | Exact protected transitions only after future approval | Only specific tables/actions granted by solution role | Only fields required for authorized action | None while client-title automation frozen; future exact transitions only | Any out-of-contract transition | No | Yes for its events only | May affect projection only through authorized event |
| Auditor | Read-only evidence and execution logs | Read title/edition/log/evidence | Read internal execution data | None | All mutation/approval | No | Yes | No |
