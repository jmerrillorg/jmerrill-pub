# JMP Foundry Editorial Capacity + Burst-Control Remediation

Last Verified: 2026-08-25T10:50:30Z

## Scope

This package records the governed remediation for the Foundry editorial capacity constraint affecting long-form Line work for *The General's Will and Last Testament* and *The Long Watch*.

## Result

- Foundry deployment resized from 25k TPM / 25 RPM to 100k TPM / 100 RPM.
- No PTU was introduced.
- Model, model version, deployment name, deployment type, resource, subscription, and region were preserved.
- Retry/backoff controls were updated so `Retry-After: 0` does not hot-loop.
- Line chunk execution now computes capacity-aware concurrency and adaptively reduces concurrency after 429 throttling.
- The current 8192 max-output-token ceiling was preserved because quality must not be reduced to fit the prior quota.

## Current Classification

JMP_FOUNDRY_EDITORIAL_CAPACITY_BURST_CONTROL_REMEDIATED

