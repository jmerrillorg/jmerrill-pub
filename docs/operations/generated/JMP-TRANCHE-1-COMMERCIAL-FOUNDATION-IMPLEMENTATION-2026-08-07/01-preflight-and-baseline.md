# Preflight and Baseline

Last verified: 2026-08-07T20:52:37.069456Z

## Result

PREFLIGHT PASS / LIFECYCLE SOURCE BASELINE ACTIVE / DEV IMPORT BLOCKED

## Environment Topology

| Lane | Environment | URL | Type | Status |
| --- | --- | --- | --- | --- |
| DEV | JM1-Dev | `https://org52409ff2.crm.dynamics.com/` | Sandbox | FOUND / DEPENDENCY PARITY BLOCKED |
| TEST/UAT | JM1-Test | `https://jm1test.crm.dynamics.com/` | Sandbox | FOUND / NOT SELECTED |
| PROD | JM1-Core | `https://jm1hq.crm.dynamics.com/` | Production | FOUND |

## Verified

- PR #437 merge SHA present on main.
- JM1-PRIME preflight passed.
- `JM1PublishingSales` exists in JM1-Core.
- Production solution was repaired to include the generated BPF entity needed for export.
- Production unmanaged export succeeded.
- Production managed export succeeded.
- Source-controlled unpack succeeded.
- Unmanaged pack validation succeeded.

## Blocked

- JM1-Dev import failed due missing dependencies.
- Production import proof was not attempted.
- Tranche 1 runtime implementation remains stopped.
