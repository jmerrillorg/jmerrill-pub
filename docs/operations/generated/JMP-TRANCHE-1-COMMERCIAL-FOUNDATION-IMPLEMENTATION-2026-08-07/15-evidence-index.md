# Evidence Index

Last verified: 2026-08-07T20:52:37.069456Z

| Evidence | Source | Result |
| --- | --- | --- |
| Environment inventory | `pac admin list` | PASS |
| Production solution inventory | `pac solution list --environment https://jm1hq.crm.dynamics.com/` | PASS |
| DEV solution inventory | `pac solution list --environment https://org52409ff2.crm.dynamics.com/` | PASS |
| TEST solution inventory | `pac solution list --environment https://jm1test.crm.dynamics.com/` | PASS |
| Initial production export | `export-prod-baseline.log` | FAIL / missing BPF entity in solution |
| BPF entity readback | `bpf-export-blocker-readback.json` | PASS / entity exists and workflow activated |
| Solution-boundary repair | `add-bpf-entity-to-prod-solution.log` | PASS |
| Production unmanaged export retry | `export-prod-baseline-retry.log` | PASS |
| Production managed export | `export-prod-managed-baseline.log` | PASS |
| Unpack baseline | `unpack-prod-baseline.log` | PASS |
| Unmanaged pack validation | `pack-unmanaged-validation.log` | PASS |
| Managed pack from unmanaged source | `pack-managed-validation.log` | NOT APPLICABLE / source package typed unmanaged |
| DEV import proof | `import-dev-unmanaged-baseline.log` | FAIL / dependency parity blocker |
| Lifecycle guard | `npm run jm1-power-platform-solution-lifecycle-guard` | PASS |
