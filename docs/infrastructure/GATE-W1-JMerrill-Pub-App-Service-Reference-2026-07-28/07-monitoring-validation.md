# Monitoring Validation

## Application Insights

No Publishing App Service-specific Application Insights component was present in `rg-jm1-pub-prod-appsvc` during final certification. App Service diagnostic settings and Log Analytics alerts are the active GATE-W1 monitoring authority.

## Log Analytics

Production App Service diagnostic setting:

- Name: diag-jm1-pub-prod
- Workspace: /subscriptions/9ee13245-2303-4010-8b6d-35f7cbcfdc0e/resourceGroups/rg-jm1-core/providers/Microsoft.OperationalInsights/workspaces/9ee13245-2303-4010-8b6d-35f7cbcfdc0e-rg-jm1-core-EUS

Enabled logs:

- AppServiceHTTPLogs
- AppServiceConsoleLogs
- AppServiceAppLogs
- AppServiceAuditLogs
- AppServiceIPSecAuditLogs
- AppServicePlatformLogs
- AppServiceAuthenticationLogs

Enabled metrics:

- AllMetrics

## Alerts

Enabled App Service metric alerts:

- alert-jm1-pub-appsvc-http5xx, severity 2, metric Http5xx
- alert-jm1-pub-appsvc-response-time, severity 3, metric AverageResponseTime
- alert-jm1-pub-appsvc-healthcheck, severity 2, metric HealthCheckStatus
- alert-jm1-pub-appsvc-staging-healthcheck, severity 3, metric HealthCheckStatus

Enabled scheduled-query alerts:

- alert-jm1-pub-appsvc-deployment-events
- alert-jm1-pub-appsvc-restart-events
- alert-jm1-pub-turnstile-failures
- alert-jm1-pub-author-gate-failures
- alert-jm1-pub-orchestration-failures
- alert-jm1-pub-rollback-events

Action group:

- ag-jm1-pub-infra006-ops

## Exception

No blocking monitoring exception remains for GATE-W1. Future GATE-W2 work should decide whether Publishing receives a dedicated Application Insights component or remains on App Service diagnostics plus Log Analytics scheduled-query rules.
