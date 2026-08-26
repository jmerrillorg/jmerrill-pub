# Editorial Resumption

Last Verified: 2026-08-26T20:52:30.391Z

The General's Will and The Long Watch are evaluated independently. If Line runtime/capacity permits, they are queueable through `QUEUE_COMMISSIONED_EDITORIAL_JOB`; if not, the exact runtime/capacity blocker is preserved.

| Title | Stage | Waiting | Action | Result |
| --- | --- | --- | --- | --- |
| The General's Will | EDITORIAL_PRODUCTION | AUTO_EXECUTABLE | Queue commissioned Line stage worker | QUEUE_ALREADY_PRESENT |
| The General’s Will | EDITORIAL_PRODUCTION | AUTO_EXECUTABLE | Queue commissioned Line stage worker | QUEUE_ALREADY_PRESENT |
| The Long Watch | EDITORIAL_REVIEW_RECOMMENDATION | AUTO_EXECUTABLE | Queue Line stage when capacity policy permits; do not depend on Jackie memory | QUEUE_ALREADY_PRESENT |
