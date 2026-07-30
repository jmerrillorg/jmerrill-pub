# GATE-W3 Operational Completion Stop

Date: 2026-07-30
Execution owner: Cody
Gate: GATE-W3 Enterprise Web Platform Implementation
Mode: Controlled implementation

## Classification

PARTIAL - PRODUCTIONS PRODUCTION RUNTIME REMAINS BLOCKED

The GATE-W3 rollout advanced through Financial and Foundation production certification, then stopped at `app-jm1-productions-prod` as required. `app-jm1-jackiesmithjr-prod` was not modified during this pass because the directive required sequential validation and stop-on-material-failure behavior.

## Completed Certifications

| Target | Runtime | Result | Evidence |
| --- | --- | --- | --- |
| `app-jm1-fin-prod` | `NODE|22-lts` | PASS | `/` and `/api/health` returned 200 for `jmerrill.financial`, `production`, `traffic_migrated=false`, 10/10 probes |
| `app-jm1-foundation-prod` | `NODE|22-lts` | PASS | `/` and `/api/health` returned 200 for `jmerrill.foundation`, `production`, `traffic_migrated=false`, 10/10 probes |

## Productions Failure

Target: `app-jm1-productions-prod`

Observed production runtime state:

- Azure control plane reports `state=Running`.
- Azure control plane reports `availabilityState=Normal`.
- Runtime stack is `NODE|22-lts`.
- Startup command is `node server.js`.
- FTPS remains disabled.
- SCM type remains `None`.
- Public endpoint does not return the governed minimal runtime.

Initial failing path:

1. Productions was configured to match the healthy Foundation production runtime pattern.
2. OneDeploy created deployment row `ad9a559e-39c4-4623-8790-88aac7fce8b5`.
3. Deployment log reported `Deployment successful`.
4. Runtime returned 503.
5. Startup log showed `Error: Cannot find module '/home/site/wwwroot/server.js'`.
6. Startup log showed the package mount was skipped: `Skipping optional volume mount 'Package' at /home/site/wwwroot`.

Targeted repair attempted:

1. Captured healthy peer comparison against `app-jm1-foundation-prod`.
2. Confirmed no material app-setting divergence except property identity and telemetry values.
3. Changed only `app-jm1-productions-prod` from `WEBSITE_RUN_FROM_PACKAGE=1` to `WEBSITE_RUN_FROM_PACKAGE=0` to force extracted ZIP deployment for the governed minimal runtime.
4. Submitted one fresh OneDeploy deployment.
5. Deployment `e5153a3d-759e-4332-a860-ec23e7067d17` completed successfully.
6. Restarted `app-jm1-productions-prod` after deployment.

Post-repair result:

- `/api/health` did not return 200.
- Public runtime requests timed out after the post-deployment restart.
- SCM hostname remained reachable and returned the expected authentication challenge.
- Control plane still reported `Running` and `Normal`.

## Root Cause Assessment

The proven cause of the first runtime failure was target-specific App Service content/package attachment failure: the runtime started `node server.js` but `server.js` was absent from `/home/site/wwwroot`.

After the extracted deployment repair, the deployment record succeeded but the public worker still did not return health. The remaining failure is therefore classified as a target-specific App Service runtime/content state issue for `app-jm1-productions-prod`, not an artifact defect. The same governed artifact is already serving correctly on Financial and Foundation.

## Stop Condition

The next available remediation would be deeper target-specific production app repair or production app recreation. Production app recreation is explicitly not authorized. The rollout stopped before touching `app-jm1-jackiesmithjr-prod`.

## Non-Actions Confirmed

- Production DNS changes: 0
- Customer traffic migration: 0
- Static Web Apps retirement: 0
- Real production website deployment: 0
- App Service Plan resize: 0
- SCM Basic enablement: 0
- FTP Basic enablement: 0
- Publishing app changes: 0
- JackieSmithJr production changes in this pass: 0
- Secret exposure: 0
- Evidence deletion: 0

## Recommended Safe Next Action

Prepare a Microsoft/App Service support package for `app-jm1-productions-prod` using:

- healthy peer: `app-jm1-foundation-prod`;
- failing app: `app-jm1-productions-prod`;
- artifact SHA-256: `913fd27cdac46baadffe636527dc5582ed23125f91468d056127887fd5293652`;
- failed package-mount evidence;
- successful extracted OneDeploy evidence;
- post-restart timeout evidence;
- control-plane Running/Normal evidence.

Do not proceed to `app-jm1-jackiesmithjr-prod` or perform production app recreation without Jackie authorization.
