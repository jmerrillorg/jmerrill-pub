# Final Control Matrix

| Control | State |
| --- | --- |
| Bootstrap | PRODUCTION / MANDATORY |
| ECR | PRODUCTION / MANDATORY |
| Deployment Bootstrap enforcement | ACTIVE |
| Protected dispatch Bootstrap enforcement | ACTIVE |
| Publishing workflow categories | 12 / 12 ECR-BACKED |
| Bootstrap bypasses | 0 |
| Legacy renderers in commissioned Publishing paths | 0 |
| Unknown legacy modes | FAIL CLOSED |
| Repository evidence-only advancement | ALLOWED |
| Production redeployment for evidence | NO |
| Runtime files changed | 0 |
| Workflow files changed | 0 |
| Author communications | 0 |
| Production data mutations | 0 |
| Secret values retained | 0 |

## Protected Endpoints

Unauthenticated protected-route probes returned fail-closed responses:

- `/api/publishing/dispatch/author-package`: 401.
- `/api/publishing/dispatch/author-package/certify`: 401.
- `/api/publishing/executive-recovery/dispatch`: 401.
- `/api/publisher/operating-center`: 401.
