targetScope = 'resourceGroup'

@description('Existing diagnostic Function Application Insights resource ID.')
param publishingInsightsResourceId string

@description('Existing Publishing operations action group; no recipient is added or changed.')
param publishingActionGroupResourceId string

param location string = resourceGroup().location

resource intakeFailureAlert 'Microsoft.Insights/scheduledQueryRules@2023-12-01' = {
  name: 'jm1-publishing-commissioning-intake-failure'
  location: location
  properties: {
    description: 'Bounded Jackie-title linked intake failure. References and fixed codes only; no manuscript or inquiry content.'
    enabled: true
    severity: 2
    scopes: [publishingInsightsResourceId]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    autoMitigate: true
    criteria: {
      allOf: [{
        query: '''
traces
| where message startswith "Publishing commissioning intake: "
| extend result = parse_json(substring(message, indexof(message, "{")))
| summarize arg_max(timestamp, *)
| where array_length(result.failures) > 0
| project timestamp
'''
        timeAggregation: 'Count'
        operator: 'GreaterThan'
        threshold: 0
        failingPeriods: { minFailingPeriodsToAlert: 1, numberOfEvaluationPeriods: 1 }
      }]
    }
    actions: { actionGroups: [publishingActionGroupResourceId] }
  }
}

output alertResourceId string = intakeFailureAlert.id
