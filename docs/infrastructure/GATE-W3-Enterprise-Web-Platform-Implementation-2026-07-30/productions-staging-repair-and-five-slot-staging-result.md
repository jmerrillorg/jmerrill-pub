# Productions Staging Deployment Path Repair and Staging Result

Program: JM1-INFRA-006  
Gate: GATE-W3  
Authority: Jackie Productions staging repair directive  
Primary target: `app-jm1-productions-prod/staging`  
Result: PRODUCTIONS STAGING RESTORED; FINAL STAGING SLOT BLOCKED

## Productions Staging Result

- Runtime: `NODE|22-lts`
- Deployment ID: `bcba8e89-fb60-479f-b760-3852caa1b5ce`
- Deployment history: CREATED
- `/`: 200
- `/api/health`: 10/10 PASS
- Property: `jmerrill.productions`
- Environment: `staging`
- Release: `GATE-W3-MINIMAL-RUNTIME-20260730-001`
- `traffic_migrated`: `false`
- SCM Basic: DISABLED
- FTP Basic: DISABLED

## Root Cause

The Productions staging failure was not caused by a material configuration difference from the healthy Foundation staging control. The machine-readable comparison found matching Node 22 runtime, startup command, SCM type, Basic publishing state, access posture, and health-check configuration.

The observed failure was a OneDeploy client/control-plane response timeout: Azure CLI returned `504.0 GatewayTimeout`, but the backend OneDeploy operation later completed, created deployment history, and served the governed minimal runtime. No stale deployment lock, arbitrary filesystem cleanup, or slot recreation was required based on the evidence available through the supported CLI/readback path.

## Repair Performed

No destructive repair was performed. Cody verified delayed OneDeploy completion through deployment history and runtime health, then certified the target with 10 consecutive valid `/api/health` probes.

## Healthy Peer Comparison

Control peer: `app-jm1-foundation-prod/staging`.

Material deployment/runtime settings matched:

- `NODE|22-lts`
- `node server.js`
- `healthCheckPath=/`
- `scmType=None`
- SCM Basic disabled
- FTP Basic disabled
- `WEBSITE_RUN_FROM_PACKAGE` present
- Oryx/build-disabled settings present
- Public network/access restriction posture equivalent

Machine-readable comparison: `productions-staging-peer-comparison.json`.

## Five Staging Slot Result

| Target | Result | Deployment ID |
| --- | --- | --- |
| `app-jm1-one-prod/staging` | HEALTHY | `e778a85f-543b-4652-be09-8934bdd15ee9` |
| `app-jm1-fin-prod/staging` | HEALTHY | `a784a1df-35d9-48b2-a00c-0719f1c0fcca` |
| `app-jm1-foundation-prod/staging` | HEALTHY | `d5205a38-d8df-4fe7-bfe9-593fcdc2f3e1` |
| `app-jm1-productions-prod/staging` | HEALTHY | `bcba8e89-fb60-479f-b760-3852caa1b5ce` |
| `app-jm1-jackiesmithjr-prod/staging` | BLOCKED - health timeout | `9fda3481-e057-451c-a5d8-e11718563da5` |

## Final Staging Slot Blocker

After Productions staging passed, the directive allowed proceeding only to `app-jm1-jackiesmithjr-prod/staging`. That deployment path also returned `504.0 GatewayTimeout`. A deployment-history row was created, but the slot did not return a valid health response during the full warmup window or the late follow-up health check.

Current blocker: `app-jm1-jackiesmithjr-prod/staging` health timeout after OneDeploy history creation.

## Safe Next Action

Open a narrowly scoped follow-up for `app-jm1-jackiesmithjr-prod/staging` using the same comparison and delayed-completion model applied to Productions staging. Do not begin production app rollout until all five staging slots are certified.

## Boundary Confirmation

No production app was modified. No DNS, customer traffic, Static Web Apps retirement, real website deployment, App Service Plan resize, SCM Basic enablement, FTP Basic enablement, Publishing change, credential retention, secret exposure, or evidence deletion occurred.
