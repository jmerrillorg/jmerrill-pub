# Minimum Dependency Baseline

Last verified: 2026-08-08T03:36:37.099920+00:00

## Original Population

Original dependency edges: 692

Original unique dependencies: 335

Original ungoverned JM1 Active-layer prerequisites: 38

## Pruning Performed

A reproducible pruning script was added:

`scripts/jm1_prune_publishing_sales_solution.mjs`

The script removed non-Tranche-1 production-export drag from the proposed DEV solution boundary:

- Account table customizations;
- Contact table customizations;
- inherited interaction-centric dashboard/form roots;
- legacy `jm1_` Lead fields;
- legacy `jm1_` and M6 Opportunity fields;
- Opportunity fields backed by ungoverned `jm1_*` option sets;
- legacy Project relationship dependency;
- static `MissingDependencies` manifest from the production export.

Pruned package:

`powerplatform/solutions/JM1PublishingSales/artifacts/packed/JM1PublishingSales_pruned_unmanaged_1_0_0_0.zip`

Pack evidence:

`powerplatform/solutions/JM1PublishingSales/evidence/pack-pruned-unmanaged-2026-08-07.log`

## Required After Pruning

Required ungoverned prerequisites after pruning: 3

Required Microsoft first-party baseline after pruning: Dynamics Sales tables/application baseline.

## Stop Finding

JM1-Dev could not satisfy the required Microsoft first-party Sales baseline through the available PAC install path. The pruned package import failed because `Opportunity` was not present as a Sales table in JM1-Dev.
