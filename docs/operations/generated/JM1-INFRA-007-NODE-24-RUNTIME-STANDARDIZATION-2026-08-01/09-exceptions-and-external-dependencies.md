# Exceptions and External Dependencies

## Exceptions

| ID | Description | Blocking |
| --- | --- | --- |
| INFRA-007-EX-001 | Root npm audit reports 9 vulnerabilities. This is pre-existing dependency posture and not introduced by Node 24. Broad dependency remediation is outside this runtime wave. | No |
| INFRA-007-EX-002 | Diagnostic runner npm audit reports 4 moderate vulnerabilities. This is pre-existing dependency posture and not introduced by Node 24. | No |
| INFRA-007-EX-003 | `docx@9.7.1` depends on `@types/node@^25.2.3`; lockfile resolves Node 25 type metadata transitively. This is not an active runtime authority. | No |
| INFRA-007-EX-004 | Local health is degraded without governed Azure secrets. This is expected in local execution and staging must provide runtime-secret proof. | No |
| INFRA-007-EX-005 | Live Azure Function Apps accepted `Node|24` but returned 503 on safe protected-route probes; rollback to `Node|22` restored 401. | Yes for estate-wide Node 24 completion |
| INFRA-007-EX-006 | Azure Static Web Apps deploy rejected Node 24.13.0 and listed supported versions as 18, 20, and 22. | Yes for SWA Node 24 completion |

## External Dependencies

| Dependency | Owner | Required action |
| --- | --- | --- |
| Production App Service runtime update | Jackie / governed release approver | Approve production runtime update after staging certification and PR review |
| Function App Node 24 runtime remediation | Jackie / Azure operator / Microsoft if needed | Diagnose why `Node|24` host runtime returns 503 despite function indexing; complete separate Function-host certification before claiming full estate-wide Node 24 completion |
| Static Web Apps Node 24 support or retirement | Microsoft / Jackie release governance | Keep SWA preview on Node 22 until Microsoft supports Node 24 or the App Service path fully replaces SWA preview requirements |
| Dependency vulnerability remediation | Jackie / engineering governance | Open separate dependency hygiene wave if audit posture must be remediated |
