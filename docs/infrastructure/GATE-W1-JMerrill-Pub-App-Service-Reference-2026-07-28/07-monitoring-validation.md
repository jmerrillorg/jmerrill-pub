# Monitoring Validation

## Application Insights

- Component: appi-jm1-pub-prod
- Application type: web
- App ID: 6f8fa746-f7ef-470e-9098-93c81293568a

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

## Exception

Dependency-specific availability alerts and scheduled-query rules were not completed in this pass. Basic App Service monitoring is operational, but reference-grade dependency monitoring remains an exception.
