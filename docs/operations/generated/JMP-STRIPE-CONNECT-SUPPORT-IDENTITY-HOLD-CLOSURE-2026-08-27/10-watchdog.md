# Watchdog

Last Verified: 2026-08-28T01:12:00Z

Watchdog findings:

| Watch | State | Action |
| --- | --- | --- |
| Identity/email hold aging | ACTIVE | Keep 14 rows visible to JMP identity review |
| Active support aging | ACTIVE | Derrick and Mildred require support after ACS relay recovery |
| Missing Day 0 | PASS | Count is 0 |
| Stripe readback failure | PASS | Live readback passed |
| Activation-code regression | PASS | Tests block activation-code fallback |
| Duplicate Connect attempt | PASS | Duplicate account groups 0; tests block duplicate creation |
| Relay availability | FAIL | ACS relay endpoint returned HTTP 503 |

The relay failure is now the deterministic debt preventing support closure.
