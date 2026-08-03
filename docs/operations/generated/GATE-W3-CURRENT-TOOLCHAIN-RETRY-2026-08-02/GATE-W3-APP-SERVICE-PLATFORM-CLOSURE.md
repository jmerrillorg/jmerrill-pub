# GATE-W3 App Service Platform Closure

Generated: 2026-08-03

## Executive Result

| Field | Value |
| --- | --- |
| Original production failure | 503 |
| Current production | 200 / ready / production |
| Current staging | 200 / ready / staging |
| Root-cause class | `DEPLOYMENT_PACKAGE_DEFECT_OR_PRODUCTION_SLOT_CONTENT_DRIFT` |
| Microsoft support | NOT REQUIRED |
| Support ticket opened | NO |
| DNS changes | 0 |
| Traffic migration | 0 |
| Plan resize | 0 |
| Resource recreation | 0 |

GATE-W3 App Service platform readiness is closed. This does not imply the full J Merrill Productions website has been deployed or that DNS/customer traffic migration is authorized.

## PR #400 Mergeability

GitHub readback after current main reconciliation:

| Field | Value |
| --- | --- |
| PR | #400 |
| Branch | `codex/gate-w3-current-toolchain-retry` |
| Original referenced head | `b56658f737cfd1fde3a0eae13a0a3d785b7e6099` |
| Initial mergeability issue | GitHub previously reported not mergeable |
| Current mergeability | MERGEABLE |
| Draft | NO |
| Runtime / workflow changes before closure update | 0 |

This closure update adds the permanent slot-identity guard script, final two-slot evidence, and updated checksums.

## Production State Preserved

Before staging correction, production had already converged to the correct identity:

```json
{
  "status": "ready",
  "environment": "production",
  "release": "GATE-W3-MINIMAL-RUNTIME-20260730-001"
}
```

Production was not swapped again.

Successful swap correlation retained from the current-toolchain remediation:

`f668e224-ec6f-402c-8a41-13701d789ff8`

## Environment Identity Root Cause

`ENVIRONMENT_IDENTITY_ROOT_CAUSE: NON_STICKY_SLOT_IDENTITY_SETTINGS_AFTER_SWAP_WITH_STALE_NODE_ENV_AND_STAGING_CONTENT_DRIFT`

Finding:

- The minimal readiness application reads `JM1_SLOT_ENVIRONMENT` first, then `NODE_ENV`, then a fallback.
- Production eventually reported `environment: "production"` after the nonsecret production setting update propagated.
- `JM1_SLOT_ENVIRONMENT` and `NODE_ENV` were not slot-specific before closure.
- Staging inherited incorrect identity/configuration from the prior swap and also contained the formerly broken production content.
- Staging had `WEBSITE_RUN_FROM_PACKAGE=0` while the healthy production slot had `WEBSITE_RUN_FROM_PACKAGE=1`.

The response body was not a hard-coded staging string in the inspected minimal runtime source.

## Staging Slot Repair

Staging-only actions:

1. Set `JM1_SLOT_ENVIRONMENT=staging` and `NODE_ENV=staging` as slot-specific settings.
2. Preserved production `JM1_SLOT_ENVIRONMENT=production` and `NODE_ENV=production` as slot-specific settings.
3. Refreshed staging with the governed minimal readiness package.
4. Aligned staging `WEBSITE_RUN_FROM_PACKAGE=1`.
5. Redeployed staging using the current Azure App Service deployment command.

Deployment IDs:

| Action | Deployment ID | Result |
| --- | --- | --- |
| Initial staging zip refresh | `cb823b4f-e584-4288-b16d-cdb9e72dd37b` | Completed; startup was unstable during first probe window |
| Final staging OneDeploy refresh | `54b2eecb-b185-4964-ad24-e624cdd8d12b` | Completed; staging health passed |

Package:

| Field | Value |
| --- | --- |
| Package | `/private/tmp/gate-w3-minimal-runtime-20260730.zip` |
| SHA-256 | `913fd27cdac46baadffe636527dc5582ed23125f91468d056127887fd5293652` |
| Release | `GATE-W3-MINIMAL-RUNTIME-20260730-001` |

## Final Two-Slot Readback

| Probe | Status | Environment | Release |
| --- | --- | --- | --- |
| Production root | 200 / ready | production | `GATE-W3-MINIMAL-RUNTIME-20260730-001` |
| Production `/api/health` | 200 / ready | production | `GATE-W3-MINIMAL-RUNTIME-20260730-001` |
| Staging root | 200 / ready | staging | `GATE-W3-MINIMAL-RUNTIME-20260730-001` |
| Staging `/api/health` | 200 / ready | staging | `GATE-W3-MINIMAL-RUNTIME-20260730-001` |

Evidence:

- `two-slot-final-readback.json`
- `slot-specific-settings-readback.json`
- `package-drift-slot-register.json`
- `slot-identity-guard-validation.json`

Unexpected 5xx observed after final repair: 0

## Permanent Guards

Added source-controlled guard:

`scripts/gate_w3_slot_identity_guard.mjs`

Added package script:

`npm run gate-w3-slot-identity-guard`

Failure codes:

- `PRODUCTION_SLOT_IDENTITY_MISMATCH`
- `STAGING_SLOT_IDENTITY_MISMATCH`
- `SLOT_IDENTITY_MISSING`
- `DEPLOYED_PACKAGE_SLOT_DRIFT`

Live guard result:

`PASS`

## Hosting Boundary

| Boundary | Classification |
| --- | --- |
| App Service hosting path | CERTIFIED |
| Minimal readiness application | DEPLOYED |
| Full J Merrill Productions website | SEPARATE WORKSTREAM |
| Customer traffic migration | NOT AUTHORIZED |
| DNS migration | NOT AUTHORIZED |

## PR #358 Disposition

After PR #400 is merged, PR #358 should be closed without merge as superseded historical evidence. The PR #358 draft branch should not be wholesale-merged into main.

Final comment should identify:

- PR #400 current-toolchain remediation;
- production recovery;
- no Microsoft support requirement;
- historical evidence retained;
- no merge of the 64-file draft.

## Final Classification

`GATE-W3 APP SERVICE PLATFORM GATE: CLOSED`

Full Productions application deployment remains a separate Human-First workstream before DNS or customer traffic migration.
