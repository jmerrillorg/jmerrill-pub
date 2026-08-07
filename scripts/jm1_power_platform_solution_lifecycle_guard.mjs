#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const solutionRoot = 'powerplatform/solutions/JM1PublishingSales'
const trancheEvidenceRoot =
  'docs/operations/generated/JMP-TRANCHE-1-COMMERCIAL-FOUNDATION-IMPLEMENTATION-2026-08-07'
const required = [
  `${solutionRoot}/solution-manifest.md`,
  `${solutionRoot}/environment-map.md`,
  `${solutionRoot}/connection-references-and-environment-variables.md`,
  `${solutionRoot}/evidence/dependency-register-jm1-dev-2026-08-07.json`,
  `${solutionRoot}/evidence/dependency-register-jm1-dev-2026-08-07.csv`,
  `${solutionRoot}/src/Other/Solution.xml`,
  `${solutionRoot}/src/Entities/Lead/Entity.xml`,
  `${solutionRoot}/src/Entities/Opportunity/Entity.xml`,
  `${solutionRoot}/src/Entities/Quote/Entity.xml`,
  `${solutionRoot}/src/Entities/jm1pub_publishingopportunityprocess/Entity.xml`,
  `${solutionRoot}/src/Workflows/PublishingOpportunityProcess-5242571D-D8C6-F011-BBD3-6045BDA81E56.xaml`,
  'docs/governance/JM1-POWER-PLATFORM-SOLUTION-LIFECYCLE-v1.0.md',
  `${trancheEvidenceRoot}/17-dependency-parity-register.md`,
  `${trancheEvidenceRoot}/18-environment-strategy-and-stop.md`,
  `${trancheEvidenceRoot}/19-bpf-and-connection-dependency-proof.md`,
  `${trancheEvidenceRoot}/20-parity-preflight-and-remaining-holds.md`,
  '.github/workflows/publishing-power-platform-solution-deploy.yml',
]

const errors = []

for (const path of required) {
  if (!existsSync(path)) errors.push(`missing:${path}`)
}

const solutionXmlPath = `${solutionRoot}/src/Other/Solution.xml`
if (existsSync(solutionXmlPath)) {
  const xml = readFileSync(solutionXmlPath, 'utf8')
  for (const text of [
    '<UniqueName>JM1PublishingSales</UniqueName>',
    '<CustomizationPrefix>jm1pub</CustomizationPrefix>',
    'schemaName="jm1pub_publishingopportunityprocess"',
    '<Version>1.0.0.0</Version>',
  ]) {
    if (!xml.includes(text)) errors.push(`solution_xml_missing:${text}`)
  }
}

const workflowPath = '.github/workflows/publishing-power-platform-solution-deploy.yml'
if (existsSync(workflowPath)) {
  const workflow = readFileSync(workflowPath, 'utf8')
  for (const text of [
    'workflow_dispatch:',
    'jm1-power-platform-production',
    'pac solution pack',
    'pac solution import',
    'jm1-power-platform-solution-lifecycle-guard',
  ]) {
    if (!workflow.includes(text)) errors.push(`workflow_missing:${text}`)
  }
}

const manifestPath = `${solutionRoot}/solution-manifest.md`
if (existsSync(manifestPath)) {
  const manifest = readFileSync(manifestPath, 'utf8')
  for (const text of [
    'JM1PublishingSales',
    'JM1-Dev',
    'JM1-Core',
    'DEVELOPMENT_SANDBOX_REQUIRED',
    'EXTEND_EXISTING',
  ]) {
    if (!manifest.includes(text)) errors.push(`manifest_missing:${text}`)
  }
}

const dependencyRegisterPath = `${solutionRoot}/evidence/dependency-register-jm1-dev-2026-08-07.json`
if (existsSync(dependencyRegisterPath)) {
  const register = JSON.parse(readFileSync(dependencyRegisterPath, 'utf8'))
  const counts = register.classificationCounts ?? {}
  const records = register.records ?? []
  if (register.solution !== 'JM1PublishingSales') errors.push('dependency_register_wrong_solution')
  if (register.devEnvironment?.includes('JM1-Dev') !== true) {
    errors.push('dependency_register_missing_jm1_dev')
  }
  if (register.uniqueDependencies !== records.length) {
    errors.push('dependency_register_count_mismatch')
  }
  if ((counts.UNKNOWN ?? 0) !== 0) errors.push('dependency_register_has_unknown_classifications')
  for (const requiredClass of [
    'MICROSOFT_APP_REQUIRED',
    'JM1_UNMANAGED_PREREQUISITE',
    'NOT_REQUIRED_FOR_TRANCHE_1',
  ]) {
    if ((counts[requiredClass] ?? 0) < 1) {
      errors.push(`dependency_register_missing_classification:${requiredClass}`)
    }
  }
}

const secretPattern = /(client_secret|password|refresh_token|access_token|sk_live|sk_test|STRIPE_SECRET|DATAVERSE_CLIENT_SECRET)\s*[:=]\s*['"]?[A-Za-z0-9_\-]{12,}/i
for (const path of required.filter((item) => existsSync(item) && statSync(item).isFile())) {
  const body = readFileSync(path, 'utf8')
  if (secretPattern.test(body)) errors.push(`possible_secret:${path}`)
}

if (errors.length) {
  console.error('JM1_POWER_PLATFORM_SOLUTION_LIFECYCLE_GUARD FAIL')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('JM1_POWER_PLATFORM_SOLUTION_LIFECYCLE_GUARD PASS')
