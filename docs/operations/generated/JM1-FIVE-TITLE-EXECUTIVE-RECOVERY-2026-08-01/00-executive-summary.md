# Five-Title Executive Recovery

Generated: 2026-08-01

## Executive Directive

Jackie authorized Executive Recovery for the five live author projects with a deadline of 2026-08-03. The directive supersedes discretionary holds, pilot pauses, internal cadence delays, and invalid blocker rediscovery for these titles.

## Current Outcome

PARTIALLY COMPLETE - ENGINEERING DEPLOYED; LIVE TITLE DELIVERY REQUIRES AUTHENTICATED PUBLISHER OR WORKER EXECUTION

This execution completed the internal recovery preparation that can be done from the current local worktree:

- PR #378 merged at 2026-08-01T23:38:21Z with merge commit `43522c4d527c731fe7bd2fbfcfba304ad57aae01`.
- PR #378 was promoted through the Publishing App Service workflow run `30724080697`.
- Production `/api/health` returned `status=ready` and `release=43522c4d527c731fe7bd2fbfcfba304ad57aae01`.
- Production health reported Dataverse, SharePoint/Graph, ACS, artifact, author portal, and Stripe enrollment dependency classes ready.
- PR #379 now carries the executive-recovery controls and evidence created after PR #378 merged.
- Invalid blocker rules were implemented in code and tested.
- The three authority corrections from Jackie were applied to the recovery board.
- The live delivery boundary was verified without printing or retaining secret values.
- No title was falsely advanced.
- No duplicate gates or communications were created.

## Protected Boundary

Live Dataverse mutation and governed ACS relay delivery require production credentials that are not present in this execution environment.

Missing credential classes:

- Dataverse tenant/client/secret/url
- ACS relay key
- Azure Communication Services connection string

No values were printed, retained, or inferred.

## PR #378

PR: #378

Branch: codex/five-title-publishing-operations-closeout

Merged head: 9609bdd478e0faf7096e068d24ad8c2ce033f7d8

State: MERGED

Merged at: 2026-08-01T23:38:21Z

Merge commit: 43522c4d527c731fe7bd2fbfcfba304ad57aae01

## PR #379

PR: #379

Branch: codex/five-title-executive-recovery

Head at evidence update: see current PR #379 readback

State: OPEN

Draft: false

Merge state: CLEAN

Required next action: review PR #379, then run the authenticated publisher or worker package-dispatch operation for each title.

## PR #378 Production Promotion

Workflow: Publishing App Service CI/CD

Run: 30724080697

Run result: SUCCESS

Build artifact: PASS

Staging deployment: PASS

Production slot swap: PASS

Production observation: PASS

Production release SHA: 43522c4d527c731fe7bd2fbfcfba304ad57aae01

Health readback:

- service: jmerrill-pub
- status: ready
- paymentGate: disabled
- dataverse: ready
- graph: ready
- acs: ready

## Delivery Status

Packages sent: 0

Reason: no authenticated Publisher Operating Center session or `JM1_ORCHESTRATION_WORKER_KEY` was available to Cody in this local execution environment. Production has the required service dependencies, but the exposed package/action routes require either an authenticated publisher session or a protected worker key. No unauthenticated production mutation was attempted.

Duplicate communications: 0

Duplicate gates: 0

Manual stage changes: 0

Response clocks started: 0
