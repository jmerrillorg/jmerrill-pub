# Authenticated UI / API Readback

PRODUCTION_HEALTH = PASS
DEPLOYED_SHA = 2330cf2df2973b42cac211b18410a403ff2a5ac1
AUTHENTICATED_PUBLISHER_SESSION = PASS
AUTHENTICATED_API_READBACK = BLOCKED_BROWSER_CLIENT_DIRECT_API_NAVIGATION_BLOCKED_AND_PAGE_SANDBOX_NETWORK_APIS_UNAVAILABLE
AUTHENTICATED_UI_READBACK = FAIL
PRODUCTION_READBACK_PASS = NO

The Publisher Operating Center was opened in an authenticated browser session as jm1-admin@jmerrill.one. Direct API navigation was blocked by the browser client and the browser evaluation sandbox did not expose network APIs, so API body capture remains unavailable through this tool path.

Unauthenticated 401 is not used as proof of UI correctness for this certification.

## UI / Projection Divergences

### 1. CURRENT ACTIVE AUTHORITY: Indomitable

SOURCE_RECORD_ID = W1-301
RESULT = FAIL
REASON = Authenticated UI presents a later/different operational lifecycle state and responsibility than the certified projection for the deterministic current-authority sample.

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
  "stage": "05 - Join the Family & Author Onboarding",
  "substage": "Author Onboarding Tasks",
  "waitingOn": "JMP/System",
  "attention": "ARTIFACT_AUTHORITY_UNRESOLVED",
  "age": "0 days",
  "nextVisibleText": "BLOCKED - PROOFREADING"
}
```
