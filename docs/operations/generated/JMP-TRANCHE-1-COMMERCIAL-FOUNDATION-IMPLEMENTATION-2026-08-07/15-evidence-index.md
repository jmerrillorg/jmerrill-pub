# Evidence Index

Last verified: 2026-08-07T23:41:26.306557+00:00

| Evidence | Source | Result |
| --- | --- | --- |
| Environment inventory | `pac admin list` | PASS |
| Production solution inventory | `pac solution list --environment https://jm1hq.crm.dynamics.com/` | PASS |
| DEV solution inventory | `pac solution list --environment https://org52409ff2.crm.dynamics.com/` | PASS |
| TEST solution inventory | `pac solution list --environment https://jm1test.crm.dynamics.com/` | PASS |
| JM1-Core solution list capture | `powerplatform/solutions/JM1PublishingSales/evidence/pac-solution-list-jm1-core-2026-08-07.log` | PASS / read-only |
| JM1-Dev solution list capture | `powerplatform/solutions/JM1PublishingSales/evidence/pac-solution-list-jm1-dev-2026-08-07.log` | PASS / read-only |
| JM1-Test solution list capture | `powerplatform/solutions/JM1PublishingSales/evidence/pac-solution-list-jm1-test-2026-08-07.log` | PASS / read-only |
| JM1-Dev application catalog capture | `powerplatform/solutions/JM1PublishingSales/evidence/pac-application-list-jm1-dev-2026-08-07.log` | PASS / read-only |
| JM1-Test application catalog capture | `powerplatform/solutions/JM1PublishingSales/evidence/pac-application-list-jm1-test-2026-08-07.log` | PASS / read-only |
| Initial production export | `export-prod-baseline.log` | FAIL / missing BPF entity in solution |
| BPF entity readback | `bpf-export-blocker-readback.json` | PASS / entity exists and workflow activated |
| Solution-boundary repair | `add-bpf-entity-to-prod-solution.log` | PASS / narrow solution-boundary repair only |
| Production unmanaged export retry | `export-prod-baseline-retry.log` | PASS |
| Production managed export | `export-prod-managed-baseline.log` | PASS |
| Unpack baseline | `unpack-prod-baseline.log` | PASS |
| Unmanaged pack validation | `pack-unmanaged-validation.log` | PASS |
| Managed pack from unmanaged source | `pack-managed-validation.log` | NOT APPLICABLE / source package typed unmanaged |
| DEV import proof | `import-dev-unmanaged-parity-rerun-2026-08-07.log` | FAIL / dependency parity blocker reproduced |
| Dependency register | `dependency-register-jm1-dev-2026-08-07.json` and `.csv` | COMPLETE / 335 unique dependencies / 692 edges / 0 UNKNOWN |
| Dependency edges | `dependency-edges-jm1-dev-2026-08-07.csv` | COMPLETE / 692 edges |
| Environment strategy | `18-environment-strategy-and-stop.md` | STOP / DEVELOPMENT_SANDBOX_REQUIRED |
| BPF and connection dependency proof | `19-bpf-and-connection-dependency-proof.md` | COMPLETE / no redesign / no secrets |
| Lifecycle guard | `npm run jm1-power-platform-solution-lifecycle-guard` | PASS |
| Commissioning guard | `npm run jm1-commissioning-guard` | EXPECTED FEATURE-BRANCH FAIL / `COMMISSIONING_MAIN_AUTHORITY_STALE` |

| Pruning script | `scripts/jm1_prune_publishing_sales_solution.mjs` | COMPLETE |
| Prune evidence | `prune-publishing-sales-solution-2026-08-07.json` | COMPLETE |
| Pruned package validation | `pack-pruned-unmanaged-2026-08-07.log` | PASS |
| Pruned DEV import | `import-dev-pruned-unmanaged-2026-08-07.log` | FAIL / Sales baseline missing |
| Dynamics Sales app install | `install-dev-dynamics-sales-app-2026-08-07.log` | FAIL |
| Core Sales package install | `install-dev-msdynce-sales-2026-08-07.log` | FAIL / package not found |
| Lead Management package install | `install-dev-msdynce-leadmanagement-2026-08-07.log` | FAIL / package not found |
| Product Management package install | `install-dev-msdynce-productmanagement-2026-08-07.log` | FAIL / package not found |

| JM1-Dev post-install-attempt solution list | `pac-solution-list-jm1-dev-after-sales-install-attempt-2026-08-07.log` | PASS / no Sales or JM1PublishingSales solution present |
| Sandbox stop thresholds | `25-sandbox-stop-thresholds.md` | COMPLETE / thresholds pass; JM1-Dev unsuitability stop remains |
