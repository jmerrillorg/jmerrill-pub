# Open Gap and Decision Register

Status: GOVERNED HOLDS CARRIED FORWARD
No gap is resolved by this package.

| Gap ID | Description | Impact | Affected Slice | Decision Owner | Required Evidence | Default Fail-Closed Behavior | Can Implementation Proceed Without It |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GAP-S3-001 | Exact J0-J8 materialization gaps | Affects binding of FTL, content freeze, submission and release events. | Slice 3 implementation | Executive / architecture authority | Approved expanded J0-J8 source or exact citation | Fail closed on ambiguous stage transitions | PARTIAL - unaffected transition design can proceed; affected runtime cannot. |
| GAP-S3-002 | jm1pub_edition versus publishing asset authority | Affects artifact/source/output relationship implementation. | Slice 3 schema | Architecture/data owner | Metadata readback and authority ruling | Do not create competing artifact table; store only references where approved | NO for artifact-specific implementation. |
| GAP-S3-003 | Production-mode authority conflict | Affects production mode field and runtime actor permissions. | Slice 3 schema/runtime | Executive / operations | Conflict resolution authority | Use MANUAL / AUTOMATION_FROZEN fail-closed posture | NO for affected runtime. |
| GAP-S3-004 | Release-plan entity decision | Affects many release plans and release anchor handling. | Slice 3 schema | Architecture owner | Entity decision and cardinality approval | Use title-level fields only in planning | NO for multi-plan entity work. |
| GAP-S3-005 | Distribution-job entity decision | Affects submission queue and readback records. | Slice 3 schema/runtime | Distribution owner | Entity decision and channel requirements | Use execution-log event design only | NO for job table work. |
| GAP-S3-006 | PF attribute storage model | Affects complexity/SOW attributes and extensibility. | Slice 3 schema | Architecture owner | Field versus child/config entity decision | Use edition fields only as proposed spec | NO for extensible attribute table. |
| GAP-S3-007 | Companion Editions formal model | Affects relationship, slot policy and release handling. | Slice 3 schema/runtime | Executive / architecture | Companion relationship and slot authority | Do not slot-swap; require distinct authority | NO for companion implementation. |
| GAP-S3-008 | 21-day propagation exception policy | Affects release anchor changes and exception handling. | Slice 3 runtime | Executive / distribution | Approved exception policy | Block exceptions absent approval | NO for exception automation. |
| GAP-S3-009 | contractable-after-approved-scope vocabulary | Affects PF-08 public/catalog/contract alignment. | Slice 3 schema/catalog dependency | Commercial authority | Vocabulary approval and surface policy | Treat PF-08 as SOW_GATED and fail closed without scope | YES for planning; NO for automated quoting. |
| GAP-S3-010 | Author-status projection persistence versus calculation | Affects author workspace read model. | Slice 3 schema/author surface | Architecture / author experience | Persistence decision and privacy review | Calculate only; do not persist until approved | YES for service design; NO for persistence. |
| GAP-S3-011 | Execution-log retention | Affects retention, archival and audit policy. | Slice 3 evidence | Compliance/executive | Retention authority | Preserve operational history; no destructive delete | YES if preserving all logs. |
| GAP-S3-012 | Exception-authority model | Affects manual exceptions and rollback approvals. | Slice 3 runtime/security | Executive | Approved exception model and approver roles | Reject exceptions unless approved by named authority | NO for exception runtime. |
| GAP-S3-013 | Client-title automation thaw criteria | Affects all client-title runtime automation. | Slice 3 runtime/operations | Executive | Explicit thaw criteria and production certification | Client-title automation remains FROZEN | NO for automation. |
