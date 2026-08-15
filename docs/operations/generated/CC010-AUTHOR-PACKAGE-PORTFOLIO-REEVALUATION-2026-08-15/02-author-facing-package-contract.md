# 02 - Author-Facing Package Contract

Last verified: 2026-08-15T11:28:21.670Z

Contract source: lib/server/author-facing-editorial-review-package.ts

| Requirement | State |
| --- | --- |
| Reusable Editorial Review package transformer | IMPLEMENTED |
| No internal Markdown sent to author | GUARDED |
| Author Workspace preferred | SUPPORTED |
| Package version-bound to title/intake/gate/source/checksum/diagnostic/timestamp | IMPLEMENTED |
| Working title display | Working Title: Untitled |
| Title suggestions | EXACTLY 3 REQUIRED / CLAUDE ROUTE / NO FALLBACK |
| Title task | NONBLOCKING FOR EDITORIAL APPROVAL |
| Editorial approval | FULL APPROVAL REQUIRED; title choice does not substitute for stage approval |
