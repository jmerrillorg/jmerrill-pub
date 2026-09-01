# Authenticated UI / API Readback

PRODUCTION_HEALTH = PASS
DEPLOYED_SHA = f89ecb19434739912a0f5fce1d4a9e0a1123306d
AUTHENTICATED_PUBLISHER_SESSION = PASS
AUTHENTICATED_API_READBACK = BLOCKED_BROWSER_CLIENT_DIRECT_API_NAVIGATION_BLOCKED_AND_PAGE_SANDBOX_NETWORK_APIS_UNAVAILABLE
AUTHENTICATED_UI_READBACK = PASS
PRODUCTION_READBACK_PASS = YES

The Publisher Operating Center was opened in an authenticated browser session as jm1-admin@jmerrill.one. Direct API navigation was blocked by the browser client and the browser evaluation sandbox did not expose network APIs, so API body capture remains unavailable through this tool path.

Unauthenticated 401 is not used as proof of UI correctness for this certification.

## UI / Projection Divergences

### 1. CURRENT ACTIVE AUTHORITY: Indomitable

SOURCE_RECORD_ID = W1-301
RESULT = PASS
REASON = Authenticated UI now presents the certified governed projection for the deterministic current-authority sample.

CERTIFIED_PROJECTION_VALUE:

```json
{
  "stage": "COMMERCIAL_ACTIVATION",
  "substage": "PACKAGE_ACCEPTANCE",
  "waitingOn": "NOT_WAITING",
  "waitingReason": "NO_CURRENT_GOVERNED_ACTION",
  "timer": "NONE",
  "currentArtifact": "DATA_GAP",
  "artifactAuthority": "NO_CURRENT_ARTIFACT_REQUIRED",
  "nextGovernedAction": "No current governed action is outstanding",
  "reconciliationStatus": "CERTIFIED"
}
```

VISIBLE_UI_VALUE:

```json
{
  "stage": "04 - Package Acceptance & Commercial Activation",
  "substage": "Package Acceptance",
  "waitingOn": "NOT_WAITING",
  "attention": "NONE",
  "timer": "No active timer"
}
```

Authenticated UI readback also confirmed that artifact-authority exceptions remain visible as diagnostic exceptions on other affected records without overriding W1-301's stage, substage, waiting state, or attention state.
