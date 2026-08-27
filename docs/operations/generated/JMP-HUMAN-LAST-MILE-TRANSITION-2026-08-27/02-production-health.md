# Production Health Evidence

Last Verified: 2026-08-27T11:06:33Z

## `/api/health`

- URL: https://jmerrill.pub/api/health
- Status: ready
- Reported release: 3f9d8a20b88ff69741a9022015968bf912f43495
- Dependencies: Dataverse, Graph, ACS, artifact, authorPortal, and stripeEnrollment reported ready.

## Interpretation

The production surface was healthy during this pass. The health endpoint release value does not equal PR #660 merge SHA because PR #660's preserved deployment evidence was function-level rather than a full web-app deployment.

## System-Blocker State

No new runtime health blocker was observed during this pass. Current system blockers remain closed unless a later production readback proves a new defect.

## Deployment Readback After Merge

- Premium App Service workflow: SUCCESS for main merge 985d2bff0f79452094c52855703900f1668d965b
- Diagnostic Runner: manually deployed dependency-inclusive package for main tip bdd8443569226ffaa28cefb11e67f1b97e2eed4b; `/api/health` reports release and productionRelease equal to bdd8443569226ffaa28cefb11e67f1b97e2eed4b.
- ACS Email Relay: manually deployed dependency-inclusive package for main tip bdd8443569226ffaa28cefb11e67f1b97e2eed4b; Function App readback reports Running and expected routes listed.
