# Operating Center Alignment
Human-friendly naming: ALIGNED — internal codes are consistently translated to readable labels for Jackie.
Single truthful stage read-model: CONFLICT — deriveTitleOperatingStages is a third, independent stage enum that merges Cover and Interior Layout into one generic stage, and (like the other two enums) does not cross-validate against the others. It cannot itself detect the Proof/Layout ordering conflict. This is the same root cause documented in 07-layout-proof-boundary.md.
Cover Approved granularity: ALIGNED at the type level (FRONT COVER APPROVED / FULL WRAP APPROVED are distinct declared values) — but see 09-cover-alignment.md for why the value is not reliably populated end-to-end.
