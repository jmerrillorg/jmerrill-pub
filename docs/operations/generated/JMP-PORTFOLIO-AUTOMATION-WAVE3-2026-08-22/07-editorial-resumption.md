# Editorial Resumption

Last Verified: 2026-08-25T02:04:22.235Z

The General's Will and The Long Watch are evaluated independently. If Line runtime/capacity permits, they are queueable through `QUEUE_COMMISSIONED_EDITORIAL_JOB`; if not, the exact runtime/capacity blocker is preserved.

| Title | Stage | Waiting | Action | Result |
| --- | --- | --- | --- | --- |
| The General's Will | EDITORIAL_PRODUCTION | AUTO_EXECUTABLE | Queue commissioned Line stage worker | QUEUE_ALREADY_PRESENT |
| The General’s Will | EDITORIAL_PRODUCTION | AUTO_EXECUTABLE | Queue commissioned Line stage worker | QUEUE_ALREADY_PRESENT |
| The Long Watch | EDITORIAL_PRODUCTION | WAITING_ON_JMP | Create structured operator task to commission/select runtime before movement | OPERATOR_TASK_ALREADY_PRESENT |
