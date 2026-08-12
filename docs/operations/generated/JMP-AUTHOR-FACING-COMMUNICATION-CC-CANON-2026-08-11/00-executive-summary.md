# Author-Facing Communication CC Canon

Last verified: 2026-08-11T22:20:00Z

Status: COMPLETE - AUTHOR-FACING COMMUNICATION CC CANON GLOBALLY ENFORCED / LIVE SEND HISTORY AUDITED / FUTURE AUTHOR EMAILS GUARDED

Canonical rule:

`IF communication.audience == AUTHOR AND communication.channel == EMAIL THEN CC MUST INCLUDE publishing@jmerrill.one`

Summary:

- Central Publishing email canon now injects and validates one effective `publishing@jmerrill.one` CC for author-facing email.
- ACS relay boundaries now inject and validate the same CC rule for author acknowledgements, approved author responses/review packages, and agreement package sends.
- Existing author package, dispatch, orchestration, and package-release paths now carry `cc: ["publishing@jmerrill.one"]` instead of relying on hidden BCC evidence.
- Internal-only notifications remain governed by their own routing and do not receive the author-facing CC rule.
- Historical live sends were inspected; no duplicate send or resend was performed.

Quanishia acknowledgement CC: HISTORICAL FAILURE / GLOBAL REMEDIATION COMPLETE

Negative proof:

- Quanishia duplicate acknowledgements: 0
- Iyorwuese duplicate sends: 0
- The Intentional Leader duplicate cover review sends: 0
- Author emails without required CC after remediation: 0 in covered send paths
- Duplicate Publishing CC recipients after remediation: 0 in covered send paths
- Unrelated title mutations: 0
- PR #431 progression: 0

