# Production Readback

Initial Wave 4 merge completed through PR #704, but production deployment stopped before application rollout at the deployment guard.

Failure classification: LIFECYCLE_AUTHORITY_GUARD_REGISTRY_EXPANSION

The guard correctly rejected expansion of the canonical `WAITING_OWNERS` registry. Wave 4 richer Waiting/Timer semantics must remain in the Publisher Operating Center projection layer and must not mutate the lifecycle authority registry.

Corrective action: restore `WAITING_OWNERS` to the canonical five values and preserve semantic waiting values under `waitingTruth.waitingOn`, with `waitingTruth.broadWaitingOwner` bridging the projection back to the canonical owner set.

Corrective deployment: pending follow-up PR merge and production readback.

No title-record lifecycle mutation is authorized by Wave 4.
