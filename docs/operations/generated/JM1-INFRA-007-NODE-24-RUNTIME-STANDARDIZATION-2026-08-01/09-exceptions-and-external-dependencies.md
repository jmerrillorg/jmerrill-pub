# Exceptions and External Dependencies

## Exceptions

| ID | Description | Blocking |
| --- | --- | --- |
| INFRA-007-EX-001 | Root npm audit reports 9 vulnerabilities. This is pre-existing dependency posture and not introduced by Node 24. Broad dependency remediation is outside this runtime wave. | No |
| INFRA-007-EX-002 | Diagnostic runner npm audit reports 4 moderate vulnerabilities. This is pre-existing dependency posture and not introduced by Node 24. | No |
| INFRA-007-EX-003 | `docx@9.7.1` depends on `@types/node@^25.2.3`; lockfile resolves Node 25 type metadata transitively. This is not an active runtime authority. | No |
| INFRA-007-EX-004 | Local health is degraded without governed Azure secrets. This is expected in local execution and staging must provide runtime-secret proof. | No |
| INFRA-007-EX-005 | Live Azure Function Apps accepted `Node|24` but returned 503 on safe protected-route probes; rollback to `Node|22` restored 401. Node 22 is retained as the current supported host-runtime posture. | No - documented hosting exception |
| INFRA-007-EX-006 | Azure Static Web Apps deploy rejected Node 24.13.0 and listed supported versions as 18, 20, and 22. SWA is retained at Node 22 as a legacy deployment path scheduled for retirement. | No - documented legacy platform exception |

## External Dependencies

| Dependency | Owner | Required action |
| --- | --- | --- |
| Function App host modernization | Jackie / Azure operator / Microsoft if needed | Future JM1-INFRA-010 discovery: diagnose the live Function host behavior and select Flex Consumption, Premium, Dedicated, or retained-host remediation. |
| Static Web Apps retirement | Microsoft / Jackie release governance | Retire the legacy SWA path under App Service migration governance, or revisit only if Microsoft adds Node 24 support before retirement. |
| Dependency vulnerability remediation | Jackie / engineering governance | Future JM1-INFRA-011 discovery: open separate dependency hygiene / modernization wave if audit posture must be remediated. |
| Next.js modernization | Jackie / engineering governance | Future JM1-INFRA-008 discovery only; no implementation began in INFRA-007. |
| Azure Monitor OpenTelemetry migration | Jackie / Azure operator | Future JM1-INFRA-009 discovery only; no implementation began in INFRA-007. |
