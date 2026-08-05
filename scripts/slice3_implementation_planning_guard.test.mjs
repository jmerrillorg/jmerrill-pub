import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const packageDir =
  'docs/architecture/generated/JMP-SLICE-3-IMPLEMENTATION-PLANNING-v1.0'

const requiredFiles = [
  '00-executive-overview.md',
  '01-canonical-entity-mapping.md',
  '02-dataverse-schema-specification.md',
  '03-choice-and-status-register.csv',
  '04-relationship-and-key-design.md',
  '05-transition-enforcement-contract.md',
  '06-executionlog-event-contract.md',
  '07-api-and-service-contracts.md',
  '08-security-and-role-model.md',
  '09-migration-and-backfill-plan.md',
  '10-protected-deployment-plan.md',
  '11-test-and-certification-plan.md',
  '12-open-gap-and-decision-register.md',
  '13-slice3-implementation-backlog.csv',
  '14-slice3-readiness-scorecard.md',
  'evidence-index.json',
  'checksums.sha256',
]

function readPackageFile(name) {
  return readFileSync(join(packageDir, name), 'utf8')
}

function allPackageText() {
  return requiredFiles
    .filter((name) => name !== 'checksums.sha256')
    .map((name) => readPackageFile(name))
    .join('\n')
}

test('Slice 3 implementation planning package contains all required artifacts', () => {
  for (const file of requiredFiles) {
    assert.equal(existsSync(join(packageDir, file)), true, `${file} missing`)
  }
})

test('authority boundaries prohibit implementation, schema and runtime mutation', () => {
  const evidence = JSON.parse(readPackageFile('evidence-index.json'))
  assert.equal(evidence.implementationAuthority, 'NO')
  assert.equal(evidence.schemaMutationAuthority, 'NO')
  assert.equal(evidence.runtimeMutationAuthority, 'NO')
  assert.equal(evidence.dataverseMutations, 0)
  assert.equal(evidence.businessCentralMutations, 0)
  assert.equal(evidence.publicWebsiteChanges, 0)
  assert.equal(evidence.authorCommunications, 0)
  assert.equal(evidence.clientTitleAutomation, 'FROZEN')
  assert.equal(evidence.clientTitleProduction, 'MANUAL')
})

test('canonical entity names are used without reintroducing competing legacy names', () => {
  const text = allPackageText()
  for (const canonical of [
    'jm1pub_title',
    'jm1pub_edition',
    'jm1pub_commercialcatalogitem',
    'jm1_executionlog',
    'existing canonical artifact authority',
    'existing production-mode authority',
  ]) {
    assert.match(text, new RegExp(canonical))
  }

  for (const forbidden of [
    /\bjm1_title\b/,
    /\bjm1_titleproductform\b/,
    /\bjm1_artifact\b/,
  ]) {
    assert.equal(forbidden.test(text), false, `${forbidden} must not appear`)
  }
})

test('transition matrix coverage and fail-closed rules are preserved', () => {
  const contract = readPackageFile('05-transition-enforcement-contract.md')
  const matrix = readFileSync(
    'docs/architecture/generated/JMP-SLICE-3-DESIGN-PACKAGE-v1.0/09-JM1-Publishing-State-Transition-Matrix.csv',
    'utf8',
  )
    .trim()
    .split(/\r?\n/)
    .slice(1)

  for (const line of matrix) {
    const [object, from, to] = line.split(',')
    const id = `TR-${`${object}_${from}_${to}`
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '')}`
    assert.match(contract, new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }

  for (const failureCode of [
    'TRANSITION_NOT_AUTHORIZED',
    'TRANSITION_PRECONDITION_FAILED',
    'TRANSITION_EVIDENCE_MISSING',
    'TRANSITION_ACTOR_NOT_AUTHORIZED',
    'TRANSITION_IDEMPOTENCY_CONFLICT',
    'TRANSITION_CANON_VERSION_MISMATCH',
  ]) {
    assert.match(contract, new RegExp(failureCode))
  }
})

test('open gaps remain governed holds and client-title automation remains frozen', () => {
  const gaps = readPackageFile('12-open-gap-and-decision-register.md')
  for (const gap of [
    'Exact J0-J8 materialization gaps',
    'jm1pub_edition versus publishing asset authority',
    'Production-mode authority conflict',
    'Release-plan entity decision',
    'Distribution-job entity decision',
    'PF attribute storage model',
    'Companion Editions formal model',
    '21-day propagation exception policy',
    'contractable-after-approved-scope vocabulary',
    'Author-status projection persistence versus calculation',
    'Execution-log retention',
    'Exception-authority model',
    'Client-title automation thaw criteria',
  ]) {
    assert.match(gaps, new RegExp(gap.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }

  assert.match(allPackageText(), /Client-title automation: FROZEN|clientTitleAutomation": "FROZEN"/)
})

test('package does not add executable application runtime or route files', () => {
  const packageText = allPackageText()
  assert.match(packageText, /Routes created: 0/)
  assert.match(packageText, /Runtime implementation: 0/)
  assert.match(packageText, /Dataverse mutations: 0/)
})
