# Evidence Index

Last verified: 2026-08-07T11:55:01.206540Z

| Evidence | Source | Result |
| --- | --- | --- |
| PR #437 merge on main | `git log` / `origin/main` | PASS |
| Repository type-check | `npm run type-check` | PASS |
| Bootstrap guard | `npm run jm1-bootstrap-guard` | PASS |
| Canon consistency guard | `npm run jm1-canon-consistency-guard` | PASS |
| Canon enforcement guard | `npm run jm1-canon-guard-enforcement` | PASS |
| Commissioning guard | `npm run jm1-commissioning-guard` | PASS |
| Commercial architecture guard | `npm run commercial-architecture-guard` | PASS |
| Slice 3 planning guard | `npm run slice3-implementation-planning-guard` | PASS |
| Dirty worktree scope guard | `npm run dirty-worktree-scope-guard` | PASS |
| JM1-PRIME preflight | `scripts/infra003_preflight.sh` | PASS |
| PAC solution readback | `pac solution list` | `JM1PublishingSales` present |
| Dataverse metadata readback | read-only Web API via Azure token | PASS |
