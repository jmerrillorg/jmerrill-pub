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
  `${solutionRoot}/evidence/import-dev-pruned-unmanaged-2026-08-07.log`,
  `${solutionRoot}/evidence/install-dev-dynamics-sales-app-2026-08-07.log`,
  `${solutionRoot}/evidence/import-enterprise-dev-final-2026-08-08.log`,
  `${solutionRoot}/evidence/export-enterprise-dev-jm1publishingsales-2026-08-08.log`,
  `${solutionRoot}/evidence/unpack-enterprise-dev-jm1publishingsales-2026-08-08.log`,
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
  `${trancheEvidenceRoot}/17-active-layer-prerequisite-reconciliation.md`,
  `${trancheEvidenceRoot}/18-minimum-dependency-baseline.md`,
  `${trancheEvidenceRoot}/19-prerequisite-solution-map.md`,
  `${trancheEvidenceRoot}/20-jm1-dev-parity-proof.md`,
  `${trancheEvidenceRoot}/21-dev-import-proof.md`,
  `${trancheEvidenceRoot}/22-alm-lifecycle-proof.md`,
  `${trancheEvidenceRoot}/23-stripe-projection-disposition.md`,
  `${trancheEvidenceRoot}/24-tranche1-resumption-record.md`,
  `${trancheEvidenceRoot}/25-sandbox-stop-thresholds.md`,
  `${trancheEvidenceRoot}/25-enterprise-dev-environment-decision.md`,
  `${trancheEvidenceRoot}/26-microsoft-first-party-baseline.md`,
  `${trancheEvidenceRoot}/27-jm1-prerequisite-governance.md`,
  `${trancheEvidenceRoot}/28-enterprise-dev-import-proof.md`,
  `${trancheEvidenceRoot}/29-environment-bindings.md`,
  `${trancheEvidenceRoot}/30-power-apps-approvals-ownership.md`,
  `${trancheEvidenceRoot}/31-alm-end-to-end-proof.md`,
  `${trancheEvidenceRoot}/32-jm1-prime-environment-selection.md`,
  `${trancheEvidenceRoot}/33-tranche1-resumption-record.md`,
  'docs/governance/JM1-PUB-CAPABILITY-REGISTER-MAINTENANCE-v1.0.md',
  'scripts/jm1_prune_publishing_sales_solution.mjs',
  '.github/workflows/publishing-power-platform-solution-deploy.yml',
  `${solutionRoot}/src/OptionSets/jm1pub_imprint.xml`,
  `${solutionRoot}/src/OptionSets/jm1_manuscripttype.xml`,
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
    'jm1-power-platform-solution-lifecycle-guard',
  ]) {
    if (!workflow.includes(text)) errors.push(`workflow_missing:${text}`)
  }
  if (!/solution\s+pack/.test(workflow)) errors.push('workflow_missing:solution pack')
  if (!/solution\s+import/.test(workflow)) errors.push('workflow_missing:solution import')
}

const manifestPath = `${solutionRoot}/solution-manifest.md`
if (existsSync(manifestPath)) {
  const manifest = readFileSync(manifestPath, 'utf8')
  for (const text of [
    'JM1PublishingSales',
    'JM1-Enterprise-Dev',
    'JM1-Core',
    'PRODUCTION DEPLOYMENT IDENTITY BLOCKED',
    'EXTEND_EXISTING',
  ]) {
    if (!manifest.includes(text)) errors.push(`manifest_missing:${text}`)
  }
}

const sandboxThresholdsPath = `${trancheEvidenceRoot}/25-sandbox-stop-thresholds.md`
if (existsSync(sandboxThresholdsPath)) {
  const thresholds = readFileSync(sandboxThresholdsPath, 'utf8')
  for (const text of [
    'Original unique dependencies | 335',
    'Original ungoverned JM1 Active-layer prerequisites | 38',
    'Required unique dependency groups | 5 | 100 | PASS',
    'Required ungoverned JM1 Active-layer prerequisites | 4 | 12 | PASS',
    'JM1-ENTERPRISE-DEV ESTABLISHED / DEV IMPORT PASS',
    'Active stop: CLEARED by protected workflow run `31247571393`.',
  ]) {
    if (!thresholds.includes(text)) errors.push(`sandbox_thresholds_missing:${text}`)
  }
}

const enterpriseDevProofPath = `${trancheEvidenceRoot}/28-enterprise-dev-import-proof.md`
if (existsSync(enterpriseDevProofPath)) {
  const proof = readFileSync(enterpriseDevProofPath, 'utf8')
  for (const text of [
    'JM1PublishingSales DEV IMPORT PASS',
    'JM1-Enterprise-Dev',
    'Production client data copied: 0',
  ]) {
    if (!proof.includes(text)) errors.push(`enterprise_dev_proof_missing:${text}`)
  }
}

const almProofPath = `${trancheEvidenceRoot}/31-alm-end-to-end-proof.md`
if (existsSync(almProofPath)) {
  const alm = readFileSync(almProofPath, 'utf8')
  for (const text of [
    'Full ALM lifecycle proof: COMPLETE',
    'Protected production import | PASS',
    'Production import executed: YES, limited to `JM1PublishingSales`.',
  ]) {
    if (!alm.includes(text)) errors.push(`alm_proof_missing:${text}`)
  }
}

const capabilityMaintenancePath = 'docs/governance/JM1-PUB-CAPABILITY-REGISTER-MAINTENANCE-v1.0.md'
if (existsSync(capabilityMaintenancePath)) {
  const maintenance = readFileSync(capabilityMaintenancePath, 'utf8')
  for (const text of [
    'Any future proposal to ABSORB or SUPERSEDE an existing capability requires explicit Jackie ruling.',
    'Do not bulk-apply consolidation classifications during quarterly delta maintenance.',
    'This maintenance rule does not reopen already ruled capability classifications.',
  ]) {
    if (!maintenance.includes(text)) errors.push(`capability_maintenance_missing:${text}`)
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
