# Evidence Index

Last verified: 2026-08-08T08:13:46Z

| Evidence | Source | Result |
| --- | --- | --- |
| Environment inventory | `pac admin list` | PASS |
| Production solution inventory | `pac solution list --environment https://jm1hq.crm.dynamics.com/` | PASS |
| JM1-Core solution list capture | `powerplatform/solutions/JM1PublishingSales/evidence/pac-solution-list-jm1-core-2026-08-07.log` | PASS / read-only |
| Initial production export | `export-prod-baseline.log` | FAIL / missing BPF entity in solution |
| BPF entity readback | `bpf-export-blocker-readback.json` | PASS / entity exists and workflow activated |
| Solution-boundary repair | `add-bpf-entity-to-prod-solution.log` | PASS / narrow solution-boundary repair only |
| Production unmanaged export retry | `export-prod-baseline-retry.log` | PASS |
| Production managed export | `export-prod-managed-baseline.log` | PASS |
| Unpack baseline | `unpack-prod-baseline.log` | PASS |
| Unmanaged pack validation | `pack-unmanaged-validation.log` | PASS |
| Dependency register | `dependency-register-jm1-dev-2026-08-07.json` and `.csv` | COMPLETE / 335 unique dependencies / 692 edges / 0 UNKNOWN |
| Dependency edges | `dependency-edges-jm1-dev-2026-08-07.csv` | COMPLETE / 692 edges |
| Environment strategy | `18-environment-strategy-and-stop.md` | STOP / DEVELOPMENT_SANDBOX_REQUIRED |
| BPF and connection dependency proof | `19-bpf-and-connection-dependency-proof.md` | COMPLETE / no redesign / no secrets |
| Lifecycle guard | `npm run jm1-power-platform-solution-lifecycle-guard` | PASS |
| Pruning script | `scripts/jm1_prune_publishing_sales_solution.mjs` | COMPLETE |
| Prune evidence | `prune-publishing-sales-solution-2026-08-07.json` | COMPLETE |
| Pruned package validation | `pack-pruned-unmanaged-2026-08-07.log` | PASS |
| Pruned DEV import | `import-dev-pruned-unmanaged-2026-08-07.log` | FAIL / Sales baseline missing |
| Sandbox stop thresholds | `25-sandbox-stop-thresholds.md` | COMPLETE / thresholds pass; JM1-Enterprise-Dev established |
| Enterprise DEV environment decision | `25-enterprise-dev-environment-decision.md` | COMPLETE / JM1-Enterprise-Dev created |
| Microsoft first-party baseline | `26-microsoft-first-party-baseline.md` | COMPLETE / Dynamics Sales installed |
| JM1 prerequisite governance | `27-jm1-prerequisite-governance.md` | COMPLETE / 4 required prerequisites governed after BPF preservation |
| Enterprise DEV import proof | `28-enterprise-dev-import-proof.md` | PASS / import and publish successful |
| Environment bindings | `29-environment-bindings.md` | COMPLETE / no secrets committed |
| Power Apps / Approvals ownership | `30-power-apps-approvals-ownership.md` | MODEL ESTABLISHED / no artifact creation |
| ALM end-to-end proof | `31-alm-end-to-end-proof.md` | COMPLETE |
| JM1-PRIME environment selection | `32-jm1-prime-environment-selection.md` | COMPLETE / DEV target class recorded |
| Tranche 1 resumption record | `33-tranche1-resumption-record.md` | SUPERSEDED BY 42 / RESUMED |
| Enterprise DEV create log | `powerplatform/solutions/JM1PublishingSales/evidence/create-jm1-enterprise-dev-2026-08-08.log` | PASS |
| Enterprise DEV create status log | `powerplatform/solutions/JM1PublishingSales/evidence/status-jm1-enterprise-dev-create-2026-08-08.log` | PASS |
| Enterprise DEV Sales install retry | `powerplatform/solutions/JM1PublishingSales/evidence/install-enterprise-dev-dynamics-sales-app-retry-2026-08-08.log` | PASS |
| Enterprise DEV final import log | `powerplatform/solutions/JM1PublishingSales/evidence/import-enterprise-dev-final-2026-08-08.log` | PASS |
| Enterprise DEV final solution readback | `powerplatform/solutions/JM1PublishingSales/evidence/pac-solution-list-jm1-enterprise-dev-final-2026-08-08.log` | PASS |
| Enterprise DEV export | `powerplatform/solutions/JM1PublishingSales/evidence/export-enterprise-dev-jm1publishingsales-2026-08-08.log` | PASS |
| Enterprise DEV unpack | `powerplatform/solutions/JM1PublishingSales/evidence/unpack-enterprise-dev-jm1publishingsales-2026-08-08.log` | PASS |
| Enterprise DEV optionset readback | `powerplatform/solutions/JM1PublishingSales/evidence/enterprise-dev-optionset-readback-2026-08-08.json` | PASS |
| Enterprise DEV business record sample | `powerplatform/solutions/JM1PublishingSales/evidence/enterprise-dev-business-record-sample-readback-2026-08-08.log` | PASS / sampled business tables empty |
| Production deployment identity | `34-production-deployment-identity.md` | COMMISSIONED |
| Deployment least privilege | `35-deployment-least-privilege.md` | PROVEN / System Customizer sufficient for protected proof |
| Protected production deployment proof | `36-protected-production-deployment-proof.md` | PASS |
| Power Apps ownership | `37-power-apps-ownership.md` | CLOSED AS GOVERNED OWNERSHIP MODEL |
| Approvals workflow ownership | `38-approvals-workflow-ownership.md` | CLOSED AS GOVERNED OWNERSHIP MODEL |
| Connection reference readback | `39-connection-reference-readback.md` | PARTIAL / runtime connections not created |
| Stripe projection final disposition | `40-stripe-projection-final-disposition.md` | EXTEND_EXISTING |
| Five-hold closeout | `41-five-hold-closeout.md` | 5 / 5 CLOSED |
| Tranche 1 runtime resumption | `42-tranche1-runtime-resumption.md` | RESUMED / AUTHORIZED TO CONTINUE |
| GitHub Power Platform production environment | `powerplatform/solutions/JM1PublishingSales/evidence/github-power-platform-production-environment-readback-2026-08-08.json` | PASS / branch policy present |
| Azure OIDC federated credential | `powerplatform/solutions/JM1PublishingSales/evidence/azure-oidc-federated-credential-readback-2026-08-08.json` | PASS |
| Dataverse deployment app user | `powerplatform/solutions/JM1PublishingSales/evidence/prod-deployment-appuser-final-readback-2026-08-08.json` | PASS |
| Dataverse deployment app user role | `powerplatform/solutions/JM1PublishingSales/evidence/prod-deployment-appuser-role-readback-2026-08-08.json` | PASS / System Customizer |
| Protected workflow default-branch bootstrap | PR #439 / merge `6043cc619cbfd94b566431d5a5db09294c947894` | PASS |
| Protected workflow run, async lock failure | `github-run-31246867991-production-log-2026-08-08.log` | FAIL / concurrent `EntityCustomization` operation |
| Protected workflow run, async duplicate import job | `github-run-31246998549-production-log-2026-08-08.log` | FAIL / async import job duplicate |
| Protected workflow run, synchronous import proof | `github-run-31247571393-production-log-2026-08-08.log` | PASS |
| Production readback artifact | `github-run-31247571393-production-artifact/solution-list.txt` | PASS / `JM1PublishingSales` version `1.0.0.0` |
