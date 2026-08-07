# Operator Burden

Tranche 1 target: Jackie handles qualification judgments, exceptions, special terms, relationship-sensitive decisions, and final approvals where required. Jackie does not handle routine routing, duplicate entry, status chasing, manual filing, payment reconciliation, or basic follow-up reminders.

| Metric | Count |
| --- | --- |
| Current Jackie actions | 12 |
| Target Jackie actions | 5 |
| Net removed | 7 |
| New burden introduced | 0 |


| Action | Classification | Assessment | Tranche 1 result |
| --- | --- | --- | --- |
| Accept/decline publishing project | JACKIE_DECIDES | appropriate | stays with Jackie |
| Select publishing track | JACKIE_DECIDES | appropriate | stays with Jackie |
| Approve special terms/discount/SOW | JACKIE_DECIDES | appropriate | stays with Jackie |
| Approve agreement issuance | JACKIE_REVIEWS | appropriate | stays as exception/review |
| Route inquiry to lead | SYSTEM_ROUTES | should-be-automated | removed from Jackie routine |
| Track lead/opportunity next activity | SYSTEM_TRACKS | should-be-automated | removed |
| Send/track routine follow-up reminder | SYSTEM_REMinds | should-be-automated | removed pending communication authority |
| Generate agreement from track/package | SYSTEM_GENERATES | should-be-automated | reuse existing pipeline |
| File generated agreement artifacts | SYSTEM_FILES | should-be-automated | removed |
| Log commercial state changes | SYSTEM_LOGS | should-be-automated | removed |
| Project Stripe payment status | SYSTEM_TRACKS | should-be-automated | removed |
| Evaluate fulfillment authorization | SYSTEM_ROUTES | should-be-automated with Jackie exception approval | removed except exceptions |
| Display daily queue | SYSTEM_TRACKS | should-be-automated | removed status reconstruction |
| Handle sensitive author concern | JACKIE_REVIEWS | appropriate | stays with Jackie |
