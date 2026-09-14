# Cutover and Observation

## Cutover

The production App Service was cut over by setting:

- setting = PUBLISHER_RUNTIME_AUTH_MODE
- value = MANAGED_IDENTITY
- set at = 2026-09-14 16:59:55 EDT

The runtime has one global selector for Publisher runtime auth. Dataverse and Graph/SharePoint therefore cut over atomically under this work package.

Initial health probes timed out during the expected App Service restart. Production recovered by bounded retry attempt 5:

- status = ready
- release = 235339ccad0f213e248786ebee2f950bf7ef7a34
- Dataverse runtime auth mode = MANAGED_IDENTITY
- Graph/SharePoint runtime auth mode = MANAGED_IDENTITY

After the later successful production deployment:

- release = 28b2e6fd988c92d5b0045593d43a78b6aa97daac
- Dataverse runtime auth mode = MANAGED_IDENTITY
- Graph/SharePoint runtime auth mode = MANAGED_IDENTITY

## Bounded web route probes

Observed routes returned 200:

- /api/health
- /api/public-catalog
- /books
- /author/portal
- /publisher/operating-center
- /api/auth/providers

Bounded observation loop:

- 2026-09-14T21:05:02Z = health 200, catalog 200, books 200, auth providers 200
- 2026-09-14T21:05:14Z = health 200, catalog 200, books 200, auth providers 200
- 2026-09-14T21:05:26Z = health 200, catalog 200, books 200, auth providers 200
- 2026-09-14T21:05:38Z = health 200, catalog 200, books 200, auth providers 200
- 2026-09-14T21:05:50Z = health 200, catalog 200, books 200, auth providers 200
- 2026-09-14T21:06:02Z = health 200, catalog 200, books 200, auth providers 200
- 2026-09-14T21:06:14Z = health 200, catalog 200, books 200, auth providers 200
- 2026-09-14T21:06:25Z = health 200, catalog 200, books 200, auth providers 200
- 2026-09-14T21:06:37Z = health 200, catalog 200, books 200, auth providers 200
- 2026-09-14T21:06:49Z = health 200, catalog 200, books 200, auth providers 200
- 2026-09-14T21:07:00Z = health 200, catalog 200, books 200, auth providers 200
- 2026-09-14T21:07:12Z = health 200, catalog 200, books 200, auth providers 200

## Impact classification

- PRODUCTION_INTERRUPTION = brief bounded restart during app-setting changes; no sustained outage observed
- BUSINESS_NONREGRESSION = PASS_BOUNDED
- AUTHOR_IMPACT = 0
- CLIENT_IMPACT = 0
- EXTERNAL_COMMUNICATIONS = 0
