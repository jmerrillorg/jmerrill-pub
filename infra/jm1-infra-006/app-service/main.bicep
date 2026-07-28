targetScope = 'resourceGroup'

@description('JM1 deployment environment name.')
@allowed([
  'prod'
  'staging'
])
param environmentName string = 'prod'

@description('Azure region for all regional resources.')
param location string = resourceGroup().location

@description('JM1 application code. Publishing uses pub.')
param appCode string = 'pub'

@description('App Service Plan SKU. S1 is the Phase 1 best-value recommendation; P1v3 is the balanced production upgrade.')
param appServicePlanSku string = 'S1'

@description('Existing governed Key Vault name. No secrets are created by this template.')
param keyVaultName string

@description('Resource ID of the Log Analytics workspace used for diagnostic settings.')
param logAnalyticsWorkspaceResourceId string

@description('Resource tags applied to all INFRA-006 resources.')
param tags object = {
  program: 'JM1-INFRA-006'
  system: 'jmerrill-pub'
  owner: 'J Merrill One'
  environment: environmentName
  managedBy: 'bicep'
}

var prefix = 'jm1-${appCode}-${environmentName}'
var appServicePlanName = 'asp-${prefix}-linux'
var webAppName = 'app-${prefix}'
var stagingSlotName = 'staging'
var appInsightsName = 'appi-${prefix}'
var diagnosticSettingName = 'diag-${prefix}'
var keyVaultUri = 'https://${keyVaultName}${environment().suffixes.keyvaultDns}/secrets/'
var stagingHostName = 'https://${webAppName}-${stagingSlotName}.azurewebsites.net'

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  tags: tags
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspaceResourceId
    IngestionMode: 'LogAnalytics'
  }
}

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  tags: tags
  sku: {
    name: appServicePlanSku
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: webAppName
  location: location
  kind: 'app,linux'
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    clientAffinityEnabled: false
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      alwaysOn: true
      http20Enabled: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      healthCheckPath: '/api/health'
      appCommandLine: 'node server.js'
      appSettings: appSettings(appInsights.properties.ConnectionString, keyVaultUri, environmentName)
    }
  }
}

resource stagingSlot 'Microsoft.Web/sites/slots@2023-12-01' = {
  parent: webApp
  name: stagingSlotName
  location: location
  kind: 'app,linux'
  tags: union(tags, {
    slot: stagingSlotName
  })
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    clientAffinityEnabled: false
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      alwaysOn: true
      http20Enabled: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      healthCheckPath: '/api/health'
      appCommandLine: 'node server.js'
      appSettings: appSettings(appInsights.properties.ConnectionString, keyVaultUri, 'staging')
    }
  }
}

resource slotConfigNames 'Microsoft.Web/sites/config@2023-12-01' = {
  parent: webApp
  name: 'slotConfigNames'
  properties: {
    appSettingNames: [
      'JM1_ENVIRONMENT'
      'JM1_RELEASE_SHA'
      'NEXTAUTH_URL'
      'AUTH_SECRET'
      'NEXTAUTH_SECRET'
      'AUTHOR_PORTAL_SESSION_SECRET'
      'AUTHOR_PORTAL_ACCESS_CODE_PEPPER'
      'AUTHOR_PORTAL_ACCESS_REGISTRY_JSON'
      'AUTHOR_PORTAL_MASTER_ACCESS_CODE'
      'TURNSTILE_SITE_KEY'
      'NEXT_PUBLIC_TURNSTILE_SITE_KEY'
      'TURNSTILE_SECRET_KEY'
      'INTAKE_ALLOWED_ORIGINS'
      'AZURE_STORAGE_CONNECTION_STRING'
      'INTAKE_DEADLETTER_QUEUE_NAME'
      'STRIPE_CONNECT_SECRET_KEY'
      'STRIPE_CHECKOUT_SECRET_KEY'
      'STRIPE_WEBHOOK_SECRET'
      'JM1_DIAGNOSTIC_RUNNER_KEY'
      'JM1_DIAGNOSTIC_RUNNER_URL'
      'JM1_ORCHESTRATION_WORKER_KEY'
    ]
  }
}

resource webDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: diagnosticSettingName
  scope: webApp
  properties: {
    workspaceId: logAnalyticsWorkspaceResourceId
    logs: [
      {
        category: 'AppServiceHTTPLogs'
        enabled: true
      }
      {
        category: 'AppServiceConsoleLogs'
        enabled: true
      }
      {
        category: 'AppServiceAppLogs'
        enabled: true
      }
      {
        category: 'AppServicePlatformLogs'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}

resource slotDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: '${diagnosticSettingName}-staging'
  scope: stagingSlot
  properties: {
    workspaceId: logAnalyticsWorkspaceResourceId
    logs: [
      {
        category: 'AppServiceHTTPLogs'
        enabled: true
      }
      {
        category: 'AppServiceConsoleLogs'
        enabled: true
      }
      {
        category: 'AppServiceAppLogs'
        enabled: true
      }
      {
        category: 'AppServicePlatformLogs'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}

func kvRef(secretName string) string => '@Microsoft.KeyVault(SecretUri=${keyVaultUri}${secretName})'

func setting(name string, value string, slotSetting bool) object => {
  name: name
  value: value
  slotSetting: slotSetting
}

func appSettings(appInsightsConnectionString string, vaultUri string, slotEnvironmentName string) array => [
  setting('NODE_ENV', 'production', false)
  setting('SCM_DO_BUILD_DURING_DEPLOYMENT', 'false', false)
  setting('ENABLE_ORYX_BUILD', 'false', false)
  setting('WEBSITE_RUN_FROM_PACKAGE', '0', false)
  setting('WEBSITE_SKIP_NODE_MODULES_TAR', '1', false)
  setting('WEBSITE_NODE_DEFAULT_VERSION', '~20', false)
  setting('JM1_ENVIRONMENT', slotEnvironmentName == 'prod' ? 'production' : 'staging', true)
  setting('JM1_RELEASE_SHA', 'set-by-deployment-pipeline', true)
  setting('NEXTAUTH_URL', slotEnvironmentName == 'prod' ? 'https://jmerrill.pub' : stagingHostName, true)
  setting('AUTH_SECRET', kvRef('AUTH-SECRET'), true)
  setting('NEXTAUTH_SECRET', kvRef('AUTH-SECRET'), true)
  setting('APPLICATIONINSIGHTS_CONNECTION_STRING', appInsightsConnectionString, false)
  setting('DATAVERSE_TENANT_ID', kvRef('DATAVERSE-TENANT-ID'), false)
  setting('DATAVERSE_CLIENT_ID', kvRef('DATAVERSE-CLIENT-ID'), false)
  setting('DATAVERSE_CLIENT_SECRET', kvRef('DATAVERSE-CLIENT-SECRET'), false)
  setting('DATAVERSE_ENVIRONMENT_URL', 'https://jm1hq.crm.dynamics.com', false)
  setting('DATAVERSE_RESOURCE_URL', 'https://jm1hq.crm.dynamics.com', false)
  setting('DATAVERSE_WEB_API_BASE_URL', 'https://jm1hq.crm.dynamics.com/api/data/v9.2', false)
  setting('DATAVERSE_PUBLISHING_INTAKE_ENTITY_SET', 'jm1_publishingintakes', false)
  setting('SHAREPOINT_TENANT_ID', kvRef('SHAREPOINT-TENANT-ID'), false)
  setting('SHAREPOINT_CLIENT_ID', kvRef('SHAREPOINT-CLIENT-ID'), false)
  setting('SHAREPOINT_CLIENT_SECRET', kvRef('SHAREPOINT-CLIENT-SECRET'), false)
  setting('JOIN_WORKSPACE_SITE_HOSTNAME', 'jmerrillfoundation.sharepoint.com', false)
  setting('JOIN_WORKSPACE_SITE_PATH', '/sites/publishing', false)
  setting('JOIN_WORKSPACE_DRIVE_NAME', 'Documents', false)
  setting('JOIN_WORKSPACE_INQUIRY_ROOT', '01_Pre-Pipeline/00_Inquiry', false)
  setting('AUTHOR_PORTAL_SESSION_SECRET', kvRef('AUTHOR-PORTAL-SESSION-SECRET'), true)
  setting('AUTHOR_PORTAL_ACCESS_CODE_PEPPER', kvRef('AUTHOR-PORTAL-ACCESS-CODE-PEPPER'), true)
  setting('AUTHOR_PORTAL_ACCESS_REGISTRY_JSON', kvRef('AUTHOR-PORTAL-ACCESS-REGISTRY-JSON'), true)
  setting('AUTHOR_PORTAL_MASTER_ACCESS_CODE', kvRef('AUTHOR-PORTAL-MASTER-ACCESS-CODE'), true)
  setting('TURNSTILE_SITE_KEY', kvRef('TURNSTILE-SITE-KEY'), true)
  setting('NEXT_PUBLIC_TURNSTILE_SITE_KEY', kvRef('TURNSTILE-SITE-KEY'), true)
  setting('TURNSTILE_SECRET_KEY', kvRef('TURNSTILE-SECRET-KEY'), true)
  setting('INTAKE_ALLOWED_ORIGINS', slotEnvironmentName == 'prod' ? 'https://jmerrill.pub' : stagingHostName, true)
  setting('INTAKE_RATE_LIMIT_ENABLED', 'true', false)
  setting('AZURE_STORAGE_CONNECTION_STRING', kvRef('AZURE-STORAGE-CONNECTION-STRING'), true)
  setting('INTAKE_DEADLETTER_QUEUE_NAME', slotEnvironmentName == 'prod' ? 'jm1-pub-intake-deadletter-prod' : 'jm1-pub-intake-deadletter-preview', true)
  setting('JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL', kvRef('JM1-JOIN-INTERNAL-NOTIFICATION-RELAY-URL'), false)
  setting('JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY', kvRef('JM1-JOIN-INTERNAL-NOTIFICATION-RELAY-KEY'), false)
  setting('STRIPE_CONNECT_SECRET_KEY', kvRef('STRIPE-CONNECT-SECRET-KEY'), true)
  setting('STRIPE_CHECKOUT_SECRET_KEY', kvRef('STRIPE-CHECKOUT-SECRET-KEY'), true)
  setting('STRIPE_WEBHOOK_SECRET', kvRef('STRIPE-WEBHOOK-SECRET'), true)
  setting('JM1_STRIPE_MODE', 'live', false)
  setting('JM1_STRIPE_CONNECT_ENABLED', 'true', false)
  setting('JM1_STRIPE_COMMISSIONING_PAYMENT_ENABLED', 'false', false)
  setting('JM1_DIAGNOSTIC_RUNNER_URL', 'https://func-jm1-diagnostic-ai-runner.azurewebsites.net', true)
  setting('JM1_DIAGNOSTIC_RUNNER_KEY', kvRef('jm1-int-pub-005-diagnostic-runner-key'), true)
  setting('JM1_ORCHESTRATION_WORKER_KEY', kvRef('JM1-ORCHESTRATION-WORKER-KEY'), true)
]

output webAppResourceId string = webApp.id
output webAppPrincipalId string = webApp.identity.principalId
output stagingSlotPrincipalId string = stagingSlot.identity.principalId
output appServicePlanName string = plan.name
output healthCheckPath string = '/api/health'
