# App Service Configuration

## Azure Context

- Subscription: JM1 - Nonprofit Core (2025 Grant)
- Subscription ID: 9ee13245-2303-4010-8b6d-35f7cbcfdc0e
- Tenant ID: 352d075e-8e17-4169-9f8e-22e6946ce66d
- Resource group: rg-jm1-pub-prod-appsvc
- App Service: app-jm1-pub-prod
- Staging slot: staging
- App Service Plan: asp-jm1-pub-prod-linux
- Runtime: NODE|20-lts
- Startup command: node server.js
- Health check path: /api/health

## Runtime Configuration

- Production app state: Running
- Staging slot state: Running after restore restart
- Always On: enabled
- HTTPS only: enabled
- HTTP/2: enabled
- Minimum TLS: 1.2
- FTPS: disabled
- System-assigned managed identity: enabled
- Production principal ID: 3b468411-65a4-4371-84bd-921acb133fb5
- Tenant: 352d075e-8e17-4169-9f8e-22e6946ce66d

## Configuration Classification

Production application settings:

- Total settings: 48
- Key Vault references: 23
- Direct non-secret settings: 25

Staging application settings:

- Total settings: 48
- Key Vault references: 23
- Direct non-secret settings: 25

Sensitive Publishing settings remain represented as Key Vault references where appropriate. Direct settings are environment labels, public endpoints, entity-set names, feature flags, rate limits, allowed origins, release metadata, or non-secret platform configuration.

## Key Vault

- Vault: jm1-core-vault
- Publishing secrets are referenced through Key Vault references.
- No secret values were printed, copied into evidence, source, Dataverse, or logs during this gate.

## App Service Reference Impact

The App Service runtime pattern is materially established, but not reference-certified because two business-path proofs remain open.
