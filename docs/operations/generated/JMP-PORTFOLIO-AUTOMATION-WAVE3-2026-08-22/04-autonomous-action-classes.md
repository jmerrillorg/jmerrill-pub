# Autonomous Action Classes

Last Verified: 2026-08-26T20:52:30.391Z

| Action class | Count |
| --- | ---: |
| CREATE_OPERATOR_TASK_FOR_EXTERNAL_MANUAL_STEP | 249 |
| CREATE_NEXT_PRODUCTION_WORK_ITEM | 2 |
| QUEUE_COMMISSIONED_EDITORIAL_JOB | 2 |

Enabled classes are deterministic, idempotent, and evidence-gated. Execution-log entries are not treated as completed contracts, completed editorial jobs, sent communications, or final production approval.
