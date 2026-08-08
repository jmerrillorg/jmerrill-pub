# DEV Import Proof

Last verified: 2026-08-08T03:36:37.099920+00:00

JM1PublishingSales DEV import: FAIL

Failure sequence:

1. Original production-exported package failed with 692 dependency edges and 335 unique dependencies.
2. Pruned package packed successfully.
3. Pruned package import failed because the `Opportunity` table/application baseline is not present in JM1-Dev.
4. Attempted Dynamics Sales first-party remediation failed.

Current DEV import state: BLOCKED.

No async solution import job ID was created for the successful target state because import did not reach success.
