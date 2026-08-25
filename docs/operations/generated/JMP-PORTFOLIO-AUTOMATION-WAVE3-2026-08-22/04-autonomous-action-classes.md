# Autonomous Action Classes

Last Verified: 2026-08-25T02:04:22.235Z

| Action class | Count |
| --- | ---: |
| CREATE_OPERATOR_TASK_FOR_EXTERNAL_MANUAL_STEP | 250 |
| CREATE_NEXT_PRODUCTION_WORK_ITEM | 2 |
| QUEUE_COMMISSIONED_EDITORIAL_JOB | 1 |

Enabled classes are deterministic, idempotent, and evidence-gated. Execution-log entries are not treated as completed contracts, completed editorial jobs, sent communications, or final production approval.
