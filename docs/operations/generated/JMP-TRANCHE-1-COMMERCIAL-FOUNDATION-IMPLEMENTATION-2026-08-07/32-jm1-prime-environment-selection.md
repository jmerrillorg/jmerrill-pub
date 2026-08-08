# JM1-PRIME Environment Selection

Last verified: 2026-08-08T04:34:00Z

## Selection Rule

JM1-PRIME / preflight must select the development environment based on solution requirements.

JM1-Dev remains valid for general Power Platform and Dataverse development where first-party Dynamics dependency parity is not required.

JM1-Enterprise-Dev is the canonical development target for Dynamics-capable, solution-aware JM1 workloads such as JM1PublishingSales.

## JM1PublishingSales Preflight

| Check | Result |
| --- | --- |
| Required development class | DYNAMICS_CAPABLE |
| Canonical DEV target | JM1-Enterprise-Dev |
| Required Microsoft apps | PRESENT |
| Required JM1 prerequisites | PRESENT after recovery |
| JM1PublishingSales importability | PASS |
| Source package | FOUND |
| Deployment workflow | FOUND / FAIL-CLOSED FOR PRODUCTION |
| Connection references | NONE IN BASELINE |
| Environment variables | NONE IN BASELINE |
| Deployment identity | COMMISSIONED |
| Protected workflow dispatch | PASS in run `31247571393` |
| Stripe projection | EXTEND_EXISTING |

## Status

JM1-PRIME preflight rule: UPDATED IN EVIDENCE.

Runtime implementation: AUTHORIZED TO CONTINUE.
