# Runtime Change Plan

1. Add canonical authority inputs to the lifecycle projection contract.
2. Read Wave 1 authority fields from `jm1pub_title`.
3. Carry authority fields through Operating Center queue, workload, and portfolio items.
4. Compute last proven governed stage/substage only for current authority rows.
5. Suppress noncurrent authority rows to reconciliation-required projection.
