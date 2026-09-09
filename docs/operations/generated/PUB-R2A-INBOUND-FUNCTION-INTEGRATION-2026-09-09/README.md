# PUB-R2A Inbound Function Integration and Package Credential Containment

Date: 2026-09-09

## Result

PUB_R2A_PARTIAL

The current-required, read-only Phase 1 publishing mailbox foundation from
`801f5ecac5e0e45bbfb69e4667f0e4ef9cae2d0f` is integrated into a branch based
exactly on canonical main `3cf0ffd195593fb4a9cc74729689fa4522db4aa5`.
The integration commit is
`51531a3c300dd405191b3626fd6a8c81f9874434`.

The Phase 2 author-response endpoint is deliberately excluded. Founder
ratification established A2 authority in UAT, but the retained evidence records
the production activation precheck as failed and contains no later successful
production-activation proof contract. Registration in the current package is
not business authority. The endpoint is therefore retired from the proposed
canonical package pending a new, explicit production authority package.

No Azure, Dataverse, web, lifecycle, model, communication, or production
mutation was performed.

## Delta method

The tips diverge from merge base
`4b3bfea0116dfbd6d05824c89765dc4f59c0a3b9`. A direct tip-to-tip diff includes
thousands of unrelated main-line changes and is not a valid measure of the
801f inbound delta. The 801f side of the merge base contains 164 added files,
6 modified files, and 0 deleted files.

| Content | Classification | Disposition |
| --- | --- | --- |
| Phase 1 inbound runtime, excluding its old attachment route | CURRENT_REQUIRED_CAPABILITY | Integrated |
| Phase 1 inbound focused test | CURRENT_REQUIRED_CAPABILITY | Integrated |
| Old attachment readback implementation | ALREADY_SUPERSEDED_IN_MAIN | Keep main implementation |
| OP-000 Track A runtime and test | ALREADY_SUPERSEDED_IN_MAIN | Keep byte-equivalent main implementation |
| Phase 2 author-response runtime and tests | UNSAFE_OR_UNAUTHORIZED | Exclude pending a new production authority gate |
| Phase 1 and Phase 2 commissioning records | HISTORICAL_ONLY | Preserve in 801f history; do not copy into runtime integration |
| UAT-only deployment workflow | HISTORICAL_ONLY | Keep canonical OIDC workflow |
| Stage 03 reconstruction and corrected-delivery content | REVIEW_REQUIRED | Unrelated to PUB-R2A; do not integrate |
| Compiled reconstruction outputs | GENERATED | Do not integrate |
| Author onboarding, app, library, script, and general documentation drift | REVIEW_REQUIRED | Unrelated to PUB-R2A; do not integrate |

## Integrated files

- `.github/workflows/diagnostic-ai-runner.yml`
- `azure-functions/diagnostic-ai-runner/package.json`
- `azure-functions/diagnostic-ai-runner/src/index.js`
- `azure-functions/diagnostic-ai-runner/src/functions/runPublishingInboundDeltaReconciliation.js`
- `azure-functions/diagnostic-ai-runner/src/functions/runPublishingInboundNotification.js`
- `azure-functions/diagnostic-ai-runner/src/functions/runPublishingInboundReadback.js`
- `azure-functions/diagnostic-ai-runner/src/functions/runPublishingInboundSubscriptionManager.js`
- `azure-functions/diagnostic-ai-runner/src/mail/inbound/blobEvidenceStore.js`
- `azure-functions/diagnostic-ai-runner/src/mail/inbound/classifier.js`
- `azure-functions/diagnostic-ai-runner/src/mail/inbound/constants.js`
- `azure-functions/diagnostic-ai-runner/src/mail/inbound/correlator.js`
- `azure-functions/diagnostic-ai-runner/src/mail/inbound/defaultStore.js`
- `azure-functions/diagnostic-ai-runner/src/mail/inbound/evidenceModel.js`
- `azure-functions/diagnostic-ai-runner/src/mail/inbound/evidenceStore.js`
- `azure-functions/diagnostic-ai-runner/src/mail/inbound/graphClient.js`
- `azure-functions/diagnostic-ai-runner/src/mail/inbound/health.js`
- `azure-functions/diagnostic-ai-runner/src/mail/inbound/index.js`
- `azure-functions/diagnostic-ai-runner/src/mail/inbound/processor.js`
- `azure-functions/diagnostic-ai-runner/src/mail/inbound/queueProjection.js`
- `azure-functions/diagnostic-ai-runner/src/mail/inbound/senderResolver.js`
- `azure-functions/diagnostic-ai-runner/src/mail/inbound/subscriptionManager.js`
- `azure-functions/diagnostic-ai-runner/src/mail/inbound/util.js`
- `azure-functions/diagnostic-ai-runner/test/inbound/inboundOperationsCenter.test.js`

The workflow change normalizes package timestamps and entry ordering. It does
not change the deployment target, identity, trigger policy, or runtime behavior.

## Validation

- Full Function tests: 2,241 passed, 0 failed
- Canonical baseline: 2,203 passed, 0 failed
- Focused inbound tests: 38 passed, 0 failed
- Lint: PASS
- Function registrations: 52 total (43 HTTP, 8 timer, 1 queue)
- Newly integrated registrations: 8
- Function source modules in package: 45
- Inbound support modules in package: 15
- Package entries: 17,611
- Dependency entries: 17,356
- `/api/health`: HTTP 200, `status=ready`
- Duplicate message and attachment evidence: denied by stable IDs/upsert semantics
- Communication side effects: 0
- Dataverse authority: none in the integrated family
- Normalized package SHA-256: `7548804f5e7a406e7fc0b8c9f99861a6385bbb9ef89f192e4d0226b558ecac5d`
- Independent normalized package builds: byte-identical
- Secret-pattern scan: PASS
- Package-local settings/env content: 0

The local host reported expected storage-listener warnings because no local
Azure storage setting was supplied. All 52 registrations were enumerated and
the health route passed; no external storage, Graph, or Dataverse call was made.

`npm audit` reports the canonical lockfile's existing 6 findings (4 moderate,
2 high). The inbound integration does not change the lockfile. Dependency
remediation is outside this package and remains a separate review item.

## Redeployment readiness

FUNCTION_REDEPLOYMENT_NOT_READY

1. The integration branch has not been pushed, reviewed, or merged into main.
2. The exposed package locator has not been invalidated under separate Azure
   security-remediation authority.
3. No founder authorization permits production deployment, restart, trigger
   synchronization, or app-setting mutation.
4. The inherited dependency audit findings require an explicit risk decision
   or separate remediation package before production approval.

After review and separate authorization, deploy only through the canonical
GitHub Actions OIDC workflow. Require exact release markers, 52 Function
registrations, `/api/health` HTTP 200, inbound-health authorization denial
without the runner key, running app state, active subscription readback, and
zero duplicate evidence or communication effects.

Rollback must never reuse the exposed locator. Rebuild the retained 801f tree
as a fresh immutable artifact, issue a new bounded locator through the approved
deployment identity, and require explicit founder approval before using it.

PUBLISHING_ESTATE_E1B_READY = NO

Recommended next package: `PUB-R2B - Function Integration Review, Package
Locator Revocation, and Governed Production Redeployment Gate`.
