# Next Action Engine

The controller assigns each active record to exactly one operational bucket and separates primary waiting owner from system execution state.

Operational buckets: AUTO_EXECUTE_NOW, AUTO_QUEUE_NOW, WAITING_ON_AUTHOR, WAITING_ON_PROSPECT, WAITING_ON_JMP_DECISION, WAITING_ON_EXTERNAL, SYSTEM_RECOVERY_IN_PROGRESS, SYSTEM_ATTENTION_REQUIRED, MAPPING_CONFLICT, TERMINAL.
