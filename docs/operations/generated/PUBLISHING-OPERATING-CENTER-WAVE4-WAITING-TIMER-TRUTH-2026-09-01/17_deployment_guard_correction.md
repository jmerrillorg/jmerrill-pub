# Deployment Guard Correction

Wave 4 PR #704 merged, but production deployment failed before rollout during the lifecycle authority guard.

The rejected change expanded the canonical lifecycle `WAITING_OWNERS` registry beyond the approved values:

- Prospect
- Author
- JMP
- JMP/System
- External

Corrected design:

- Canonical lifecycle owner registry remains unchanged.
- Rich Waiting/Timer semantics are exposed only in the Publisher Operating Center read model.
- `waitingTruth.waitingOn` carries the specific Wave 4 semantic state.
- `waitingTruth.broadWaitingOwner` maps that semantic state back to the canonical owner registry.
- Top-level `waitingOn` remains registry-compatible.

Validation required before corrective merge:

- `npm run jmp-lifecycle-authority-guard`
- `npm run jm1-canon-consistency-guard`
- `npm run type-check`
- Wave 2/Wave 3/Wave 4 Operating Center regression tests
- `npm run lint`
- `npm run build`
- `git diff --check`
- evidence checksum verification

No title-record lifecycle mutation, author communication, workflow activation, schema change, or client-title automation thaw is authorized by this correction.
