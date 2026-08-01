# Exceptions and External Dependencies

## Exceptions

| ID | Description | Blocking |
| --- | --- | --- |
| INFRA-007-EX-001 | Root npm audit reports 9 vulnerabilities. This is pre-existing dependency posture and not introduced by Node 24. Broad dependency remediation is outside this runtime wave. | No |
| INFRA-007-EX-002 | Diagnostic runner npm audit reports 4 moderate vulnerabilities. This is pre-existing dependency posture and not introduced by Node 24. | No |
| INFRA-007-EX-003 | `docx@9.7.1` depends on `@types/node@^25.2.3`; lockfile resolves Node 25 type metadata transitively. This is not an active runtime authority. | No |
| INFRA-007-EX-004 | Local health is degraded without governed Azure secrets. This is expected in local execution and staging must provide runtime-secret proof. | No |

## External Dependencies

| Dependency | Owner | Required action |
| --- | --- | --- |
| Production App Service runtime update | Jackie / governed release approver | Approve production runtime update after staging certification and PR review |
| Function App runtime deployment | Jackie / Azure operator | Authorize and execute Function App runtime deployment using governed Function App release process |
| Dependency vulnerability remediation | Jackie / engineering governance | Open separate dependency hygiene wave if audit posture must be remediated |

