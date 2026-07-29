# Deployment Validation

## Repository State

- Branch: codex/jm1-infra-006-phase2-staging-certification
- HEAD: de32218684f4f21fcba40a4fbf8812b30cd1cb73
- Base main at PR inspection: f3f2a9fc96627fc23327e58b7eddbe6f50365a93
- PR: #349, draft, open, clean merge state

## GitHub Actions

PR #349 check status at inspection:

- Azure Static Web Apps CI/CD / Build and Deploy Job: success on f80fab2fbbb0c641f5266d554a104b12823965a6 at 2026-07-29T03:46:58Z
- Azure Static Web Apps CI/CD / Close Pull Request Job: skipped

The Static Web Apps workflow still appears in the PR status rollup, but the Publishing App Service workflow is now present on the default branch and has executed successfully through governed manual dispatch with production promotion disabled.

Successful App Service workflow evidence:

- Current PR head deployment: run 30465444152, head `172779c04df6d7e7adf6ee1fad96664cbbf2ac61`, artifact SHA-256 `0e2a0a0e93813891ae708435240bb997b0c008e3a4fa0cd968afbe3422c6248b`, staging deployment log ID `eea98b20-a9af-4998-915b-cd1ec4021e8a`, health probe 18 reached 10/10 ready responses.
- Staging rollback proof: run 30466281742, rollback branch pinned to `bd5ada518a4b2307b49c01f8ef678f51ef6f5cee`, artifact SHA-256 `548a12d61ff9881c4cef61525187c85ffb71280ea51b9e62bec64e6150208fac`, health probe 17 reached 10/10 ready responses.
- Staging roll-forward proof: run 30466962103, head `172779c04df6d7e7adf6ee1fad96664cbbf2ac61`, artifact SHA-256 `20e3e86c478ca981397503b55bb025a74dfe633227413eba67606fe1d64bce76`, staging deployment log ID `4e0875bf-90c3-4c62-aa3d-ff97ec321d1e`, health probe 17 reached 10/10 ready responses.

The temporary rollback-proof branch was deleted after the roll-forward proof. No production promotion was run.

## App Service Deployment

The current branch was built with npm and packaged as a standalone Next.js artifact.

- Package: /tmp/jm1-gate-w1-appsvc-production-20260728T145044Z.zip
- Package SHA-256: 4f5ef6159127cbedf2ce8cdb57507de1efc68a651e15a192b9d1df30ab1bfe16
- Production deployment target: app-jm1-pub-prod
- Production deployment method: az webapp deploy, clean package deployment, restart
- Production release setting: JM1_RELEASE_SHA=fbb8ca6190543ec9ac60ed80af41a8d0c8f4883c

## Staging Deployment Refresh

On 2026-07-29, staging auto-swap was disabled after readback showed `autoSwapSlotName: production`. PR head `a3a006bcf8839326f4270e789c1697c0d1ad68b7` was built as a standalone App Service package and deployed to the staging slot only.

- Package: /tmp/jm1-appsvc-staging-a3a006bcf8839326f4270e789c1697c0d1ad68b7-20260729T111549Z.zip
- Package SHA-256: a6016c1e9b515f2af9a0f37ee0bfe9924b5a4db0030eb7353187eae3ab4c3815
- Active OneDeploy deployment ID: e9dec64d-f2df-4730-999b-424150dfc758
- Prior OneDeploy deployment ID: 6963673f-6cf1-4949-a501-70c67d9a6326
- Inactive OneDeploy record: 3f0c5031-fbb2-4e2f-9309-2f218fc679c1
- Staging release setting: JM1_RELEASE_SHA=a3a006bcf8839326f4270e789c1697c0d1ad68b7
- Auto-swap after correction: disabled

The App Service artifact is now assembled by `scripts/package-app-service-artifact.mjs` through the App Service workflow and local certification path. The package copies `.next/standalone`, `.next/static`, and `public`, writes `JM1_RELEASE_SHA`, removes the root package manifest from the deployable zip, and produces a SHA-256 checksum.

The App Service startup command was updated for staging to:

`node server.js`

Staging app settings now include `WEBSITE_WARMUP_PATH=/api/health`, `WEBSITE_WARMUP_STATUSES=200`, `WEBSITE_SKIP_NODE_MODULES_TAR=1`, `SCM_DO_BUILD_DURING_DEPLOYMENT=false`, and `ENABLE_ORYX_BUILD=false`. Sanitized Kudu logs for the unpacked deployment showed platform `NodeProjectOptimizer` zipping `node_modules` into `node_modules.tar.gz`, so the optimization appeared to be App Service platform behavior rather than source package manifest detection alone.

## Run-From-Package Staging Correction

Follow-up PR head `de32218684f4f21fcba40a4fbf8812b30cd1cb73` changed the governed App Service model to run the immutable ZIP directly with `WEBSITE_RUN_FROM_PACKAGE=1`.

- Package: /tmp/jm1-appsvc-staging-de32218684f4f21fcba40a4fbf8812b30cd1cb73-20260729T1235Z.zip
- Package SHA-256: 05662c5db772079db21f4f6f02cb4539b0a008ffef50b2c2317a7f561abaab7a
- Staging release setting: JM1_RELEASE_SHA=de32218684f4f21fcba40a4fbf8812b30cd1cb73
- Staging `WEBSITE_RUN_FROM_PACKAGE`: 1
- Staging payment gate: disabled

The Azure deploy command returned a control-plane 502, and deployment log ID `43ce9b15-34a2-4363-ba45-d3202ddaf4b7` still showed no end time during the evidence window. Runtime verification nevertheless showed the staging slot loaded the expected release and returned `/api/health` 200 ready. Because the deployment record did not finalize cleanly, this does not yet certify the governed deployment path.

## Production Health

Health check over the App Service target IP with canonical host headers:

- https://jmerrill.pub/api/health: 200, SSL verify result 0
- https://www.jmerrill.pub/api/health: 200, SSL verify result 0
- Reported service: jmerrill-pub
- Reported status: ready
- Reported release: fbb8ca6190543ec9ac60ed80af41a8d0c8f4883c
- Payment gate: disabled

## Staging

The staging slot recovered after the current standalone package deployment and after restoring Key Vault-backed author settings:

- https://app-jm1-pub-prod-staging.azurewebsites.net/api/health: 200
- https://app-jm1-pub-prod-staging.azurewebsites.net/: 200
- https://app-jm1-pub-prod-staging.azurewebsites.net/join: 200
- https://app-jm1-pub-prod-staging.azurewebsites.net/books: 200
- https://app-jm1-pub-prod-staging.azurewebsites.net/authors: 200
- https://app-jm1-pub-prod-staging.azurewebsites.net/robots.txt: 200
- https://app-jm1-pub-prod-staging.azurewebsites.net/sitemap.xml: 200

Warm staging health returns 200 ready on the deployed PR head:

- Release: a3a006bcf8839326f4270e789c1697c0d1ad68b7
- Payment gate: disabled
- Route duration: 0-17 ms in sampled warm health responses

Restart-adjacent health failed on the unpacked `a3a006bcf8839326f4270e789c1697c0d1ad68b7` package:

- Probe file: /tmp/jm1-staging-a3a006b-restart-20probe-20260729T112057Z.jsonl
- Attempts 1-4 returned 200 ready on `a3a006bcf8839326f4270e789c1697c0d1ad68b7`.
- Attempts 5-10 timed out after 20 seconds with no response.
- Attempts 11-20 recovered to 200 ready; uptime reset to 9 seconds on attempt 11.
- Sanitized platform logs show startup probe failure, container stop, later restart, and eventual startup probe success.

Restart-adjacent health passed on the run-from-package `de32218684f4f21fcba40a4fbf8812b30cd1cb73` package:

- Probe file: /tmp/jm1-staging-de32218-runpkg-restart-10probe-20260729T1236Z.jsonl
- Attempts 1-10 returned 200 ready on `de32218684f4f21fcba40a4fbf8812b30cd1cb73`.
- No 500, 502, timeout, or restart loop was observed.
- Attempt timings: first probe completed in 8 seconds after restart; later probes returned within 0-2 seconds except one 155 ms route duration.
- Reported payment gate: disabled.

Auto-swap remains disabled for the staging slot. Production cutover was performed through DNS and direct production App Service package deployment, not through an automatic slot swap.

## Deployment Exception

Production slot-swap validation was intentionally not performed because this completion pass did not authorize production promotion of PR #349. A governed staging-only immutable-artifact rollback and roll-forward proof was completed instead:

`172779c04df6d7e7adf6ee1fad96664cbbf2ac61` -> `bd5ada518a4b2307b49c01f8ef678f51ef6f5cee` -> `172779c04df6d7e7adf6ee1fad96664cbbf2ac61`

This establishes the rollback pattern without moving public traffic. A production slot swap remains deferred until explicit production promotion authorization.

Final positive `/join` replay remains incomplete on a workflow-deployed authoritative release. This is tracked as GATE-W1-EX-007.
