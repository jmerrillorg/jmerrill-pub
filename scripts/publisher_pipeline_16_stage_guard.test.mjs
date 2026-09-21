import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  NONCURRENT_HISTORICAL_REFERENCES,
  isKnownNoncurrentHistoricalReferenceId,
} from '../lib/publishing/lifecycle/noncurrent-historical-reference-registry.ts'

const model = readFileSync('lib/publishing/lifecycle/human-pipeline-read-model.ts', 'utf8')
const page = readFileSync('app/publisher/pipeline/page.tsx', 'utf8')
const client = readFileSync('app/publisher/_components/PublisherPipelineClient.tsx', 'utf8')
const operatingCenterClient = readFileSync('app/publisher/_components/PublisherOperatingCenterClient.tsx', 'utf8')

function matchesSuppressionContract(card) {
  return (
    isKnownNoncurrentHistoricalReferenceId(card.key) &&
    card.confidence === 'RECONCILIATION_REQUIRED' &&
    card.resolutionClass === 'TRUE_DATA_DEFECT' &&
    card.ambiguityReason === 'DUPLICATE_HISTORICAL_RECORD_REFERENCE' &&
    card.safeToAutomate === 'YES_READ_MODEL_SUPPRESSION_ONLY'
  )
}

const expectedStages = [
  ['01_INQUIRY', '01', 'Inquiry'],
  ['02_INTAKE', '02', 'Intake'],
  ['03_EDITORIAL_REVIEW', '03', 'Editorial Review'],
  ['04_AUTHOR_DECISION', '04', 'Author Decision'],
  ['05_AGREEMENT_PAYMENT', '05', 'Agreement & Payment'],
  ['06_ONBOARDING', '06', 'Onboarding'],
  ['07_DEVELOPMENTAL_EDITING', '07', 'Developmental Editing'],
  ['08_LINE_EDITING', '08', 'Line Editing'],
  ['09_COPYEDITING', '09', 'Copyediting'],
  ['10_PROOFREADING', '10', 'Proofreading'],
  ['11_INTERIOR_LAYOUT', '11', 'Interior Layout'],
  ['12_COVER_DESIGN', '12', 'Cover Design'],
  ['13_PRODUCTION', '13', 'Production'],
  ['14_DISTRIBUTION', '14', 'Distribution'],
  ['15_PUBLICATION', '15', 'Publication'],
  ['16_POST_PUBLICATION', '16', 'Post-Publication'],
]

test('Publisher Pipeline declares exactly the 16 human-facing stages in order', () => {
  const stageCalls = [...model.matchAll(/stage\('([^']+)', '([^']+)', '([^']+)'/g)].map((match) => [
    match[1],
    match[2],
    match[3],
  ])

  assert.deepEqual(stageCalls, expectedStages)
})

test('Every human-facing stage exposes executable artifact and transition authority', () => {
  assert.match(model, /completionAuthority: EDITORIAL_SYSTEM_STAGE_CONTRACTS\[id\]/)
  assert.match(model, /type EditorialStageContract/)
})

test('Publisher Pipeline does not include 00 Template as a title stage', () => {
  assert.equal(model.includes('00_TEMPLATE'), false)
  assert.equal(model.includes("stage('00"), false)
})

test('Pipeline is a projection over the Operating Center snapshot, not a new lifecycle store', () => {
  assert.match(page, /buildPublisherOperatingCenterSnapshot/)
  assert.match(page, /buildHumanPublishingPipelineView\(snapshot\.titleOperatingView\.cards/)
  assert.doesNotMatch(client, /localStorage|indexedDB|IndexedDB/)
})

test('Ambiguous title state is surfaced for reconciliation instead of silently placed', () => {
  assert.match(model, /canonicalMappingStatus === 'CANONICAL_MAPPING_CONFLICT'/)
  assert.match(model, /canonicalMappingStatus === 'CANONICAL_MAPPING_INCOMPLETE'/)
  assert.match(model, /confidence: 'RECONCILIATION_REQUIRED'/)
  assert.match(client, /Titles not silently placed/)
})

test('Reconciliation cards expose reason, evidence, repair class, and automation safety', () => {
  assert.match(model, /ambiguityReason:/)
  assert.match(model, /evidenceAuthority:/)
  assert.match(model, /resolutionClass:/)
  assert.match(model, /safeToAutomate:/)
  assert.match(client, /Why Here/)
  assert.match(client, /Evidence/)
  assert.match(client, /Resolution/)
  assert.match(client, /Automation/)
})

test('Pipeline 004 inventories exactly 18 known noncurrent historical duplicate references', () => {
  assert.equal(NONCURRENT_HISTORICAL_REFERENCES.length, 18)
  const ids = new Set(NONCURRENT_HISTORICAL_REFERENCES.map((item) => item.WorkId))
  assert.equal(ids.size, 18)
  for (const item of NONCURRENT_HISTORICAL_REFERENCES) {
    assert.equal(item.ReferenceType, 'DUPLICATE_READ_MODEL_REFERENCE')
    assert.equal(item.Classification, 'DUPLICATE_READ_MODEL_REFERENCE')
    assert.equal(item.SafeDisposition, 'READ_MODEL_SUPPRESSION')
    assert.equal(item.HistoricalEvidencePreserved, true)
    assert.match(item.HistoricalSource, /JMP-PIPELINE-003-RECONCILIATION-QUEUE-TRIAGE/)
  }
})

test('Known noncurrent duplicate references are suppressed only when current-authority evidence remains exact', () => {
  assert.match(model, /function isSuppressedHistoricalReference/)
  assert.match(model, /isKnownNoncurrentHistoricalReferenceId\(card\.key\)/)
  assert.match(model, /card\.confidence === 'RECONCILIATION_REQUIRED'/)
  assert.match(model, /card\.resolutionClass === 'TRUE_DATA_DEFECT'/)
  assert.match(model, /card\.ambiguityReason === 'DUPLICATE_HISTORICAL_RECORD_REFERENCE'/)
  assert.match(model, /card\.safeToAutomate === 'YES_READ_MODEL_SUPPRESSION_ONLY'/)

  const card = {
    key: 'fad1c5d7-b389-f111-ab10-000d3a9eacee',
    confidence: 'RECONCILIATION_REQUIRED',
    resolutionClass: 'TRUE_DATA_DEFECT',
    ambiguityReason: 'DUPLICATE_HISTORICAL_RECORD_REFERENCE',
    safeToAutomate: 'YES_READ_MODEL_SUPPRESSION_ONLY',
  }
  assert.equal(isKnownNoncurrentHistoricalReferenceId(card.key), true)
  assert.equal(matchesSuppressionContract(card), true)

  assert.equal(matchesSuppressionContract({ ...card, safeToAutomate: 'NO' }), false)
  assert.equal(matchesSuppressionContract({ ...card, resolutionClass: 'HUMAN_BUSINESS_DECISION_REQUIRED' }), false)
  assert.equal(matchesSuppressionContract({ ...card, key: 'title:2026-royalty-backlog' }), false)
})

test('Pipeline 004 protects royalty decision and active workstream names from historical suppression registry', () => {
  const registryText = NONCURRENT_HISTORICAL_REFERENCES.map((item) => `${item.Title} ${item.Author}`).join('\n')
  assert.doesNotMatch(registryText, /2026 Royalty Decision Package/)
  assert.doesNotMatch(registryText, /\bWhole\b/)
  assert.doesNotMatch(registryText, /Before You Were Born/)
  assert.doesNotMatch(registryText, /Indomitable/)
  assert.doesNotMatch(registryText, /Establishing Glory/)
  assert.match(client, /Historical refs/)
  assert.match(client, /Archived duplicate references/)
})

test('Pipeline and Operating Center link to each other', () => {
  assert.match(client, /href="\/publisher\/operating-center"/)
  assert.match(operatingCenterClient, /href="\/publisher\/pipeline"/)
})
