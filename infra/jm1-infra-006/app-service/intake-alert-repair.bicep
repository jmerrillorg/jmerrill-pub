targetScope = 'resourceGroup'

@description('Exact existing Premium Publishing App Service resource ID; no application or queue is created.')
param publishingAppResourceId string

@description('Existing governed Publishing operations action group. No recipient change is permitted here.')
param publishingActionGroupResourceId string

resource intakeFailureAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'alert-jm1-pub-appsvc-http5xx'
  location: 'global'
  properties: {
    description: 'Publishing submission/dependency failures. Inspect private intake reference and recovery queue; do not replay author submissions.'
    enabled: true
    severity: 1
    scopes: [publishingAppResourceId]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    autoMitigate: true
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [{
        name: 'intakeOrApplicationFailure'
        metricName: 'Http5xx'
        metricNamespace: 'Microsoft.Web/sites'
        operator: 'GreaterThan'
        threshold: 0
        timeAggregation: 'Total'
        criterionType: 'StaticThresholdCriterion'
      }]
    }
    actions: [{ actionGroupId: publishingActionGroupResourceId }]
  }
}

output alertResourceId string = intakeFailureAlert.id
