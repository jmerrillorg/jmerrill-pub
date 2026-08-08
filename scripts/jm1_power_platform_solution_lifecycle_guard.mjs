#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'

const required = [
  '.github/workflows/publishing-power-platform-solution-deploy.yml',
  'docs/governance/JM1-POWER-PLATFORM-SOLUTION-LIFECYCLE-v1.0.md',
  'powerplatform/solutions/JM1PublishingSales/solution-manifest.md',
  'powerplatform/solutions/JM1PublishingSales/environment-map.md',
  'powerplatform/solutions/JM1PublishingSales/connection-references-and-environment-variables.md',
  'docs/operations/generated/JM1-POWER-PLATFORM-ALM-BOOTSTRAP-2026-08-08/00-bootstrap-summary.md',
  'docs/operations/generated/JM1-POWER-PLATFORM-ALM-BOOTSTRAP-2026-08-08/01-bootstrap-file-scope.md',
  'docs/operations/generated/JM1-POWER-PLATFORM-ALM-BOOTSTRAP-2026-08-08/02-workflow-validation.md',
  'docs/operations/generated/JM1-POWER-PLATFORM-ALM-BOOTSTRAP-2026-08-08/03-identity-binding.md',
  'docs/operations/generated/JM1-POWER-PLATFORM-ALM-BOOTSTRAP-2026-08-08/04-guard-validation.md',
]

const errors = []

for (const path of required) {
  if (!existsSync(path)) errors.push(`missing:${path}`)
}

const workflowPath = '.github/workflows/publishing-power-platform-solution-deploy.yml'
if (existsSync(workflowPath)) {
  const workflow = readFileSync(workflowPath, 'utf8')
  for (const text of [
    'workflow_dispatch:',
    'jm1-power-platform-production',
    'approved_source_sha',
    '97891ed1-6623-487c-b890-633bea440e22',
    '352d075e-8e17-4169-9f8e-22e6946ce66d',
    'dc4b2a13-3dbb-e0d1-95b8-f0e7d3a26e10',
    '9dafb403-b493-f011-a700-000d3a106f37',
    'pac auth create',
    '--githubFederated',
    'pac solution pack',
    'pac solution import',
    'pac solution list',
  ]) {
    if (!workflow.includes(text)) errors.push(`workflow_missing:${text}`)
  }
}

const manifestPath = 'powerplatform/solutions/JM1PublishingSales/solution-manifest.md'
if (existsSync(manifestPath)) {
  const manifest = readFileSync(manifestPath, 'utf8')
  for (const text of [
    'ALM / DEPLOYMENT ENABLEMENT ONLY',
    'JM1PublishingSales',
    'JM1-Enterprise-Dev',
    'JM1-Core',
    'Runtime implementation: 0',
  ]) {
    if (!manifest.includes(text)) errors.push(`manifest_missing:${text}`)
  }
}

const secretPattern = /(client_secret|password|refresh_token|access_token|sk_live|sk_test|STRIPE_SECRET|DATAVERSE_CLIENT_SECRET)\s*[:=]\s*['"]?[A-Za-z0-9_\-]{12,}/i
for (const path of required.filter((item) => existsSync(item))) {
  const body = readFileSync(path, 'utf8')
  if (secretPattern.test(body)) errors.push(`possible_secret:${path}`)
}

if (errors.length) {
  console.error('JM1_POWER_PLATFORM_SOLUTION_LIFECYCLE_GUARD FAIL')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('JM1_POWER_PLATFORM_SOLUTION_LIFECYCLE_GUARD PASS')
