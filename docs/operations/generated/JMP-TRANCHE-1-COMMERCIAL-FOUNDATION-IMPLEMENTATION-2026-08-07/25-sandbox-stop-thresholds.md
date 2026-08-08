# Sandbox Stop Thresholds

Last verified: 2026-08-08T04:20:00+00:00

Scope: PR #438 Tranche 1 technical evidence only.

This record preserves the sandbox stop thresholds and records the approved sandbox outcome. It does not authorize production cloning, production import, Business Central posting, Stripe mutation, workflow activation, author communication, Tranche 2 work, or client-title automation thaw.

## Original Dependency Baseline

| Measure | Count | Evidence |
| --- | ---: | --- |
| Original dependency edges | 692 | `powerplatform/solutions/JM1PublishingSales/evidence/dependency-edges-jm1-dev-2026-08-07.csv` |
| Original unique dependencies | 335 | `powerplatform/solutions/JM1PublishingSales/evidence/dependency-register-jm1-dev-2026-08-07.json` |
| Original ungoverned JM1 Active-layer prerequisites | 38 | `17-active-layer-prerequisite-reconciliation.md` |

## Post-Pruning Required Baseline

The pruning pass removed Account/Contact production-export residue, inherited interaction customizations, legacy Opportunity fields, legacy Project relationships, ungoverned option-set-backed Opportunity fields, and static production-export missing-dependency metadata from the proposed Tranche 1 package.

| Measure | Required after pruning | Threshold | Result |
| --- | ---: | ---: | --- |
| Required unique dependency groups | 5 | 100 | PASS |
| Required ungoverned JM1 Active-layer prerequisites | 4 | 12 | PASS |

The five required dependency groups are:

1. Microsoft Dynamics Sales table/application baseline.
2. `jm1pub_submission`.
3. `jm1pub_editorialdiagnostic`.
4. `jm1pub_imprint`.
5. `jm1_manuscripttype` / `opportunity.jm1pub_manuscripttype`, required by the preserved Publishing Opportunity Process BPF.

## Sandbox Decision

Threshold result: PASS.

Sandbox decision: `JM1-ENTERPRISE-DEV ESTABLISHED / DEV IMPORT PASS`.

The threshold analysis showed that the high-cost dependency threshold was not crossed after pruning. Executive authority then allowed a governed Dynamics-capable sandbox rather than JM1-Dev rehabilitation. JM1-Enterprise-Dev was created, Dynamics Sales was installed, source-boundary prerequisites were recovered, and JM1PublishingSales import/publish passed.

Active stop: CLEARED by protected workflow run `31247571393`.

## Stop Conditions Preserved

- Do not clone production.
- Do not import broad unrelated first-party applications.
- Do not manually reconstruct unmanaged production components.
- Do not use PR #431 client titles as validation data.
- Do not thaw client-title automation.
- Do not start Tranche 2.
- Do not perform Business Central posting.
- Do not activate Strategic Marketing journeys.
- Do not perform agreement, pricing, catalog, or JMF work under PR #438.
