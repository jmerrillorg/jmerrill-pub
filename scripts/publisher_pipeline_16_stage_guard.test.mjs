import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const model = readFileSync('lib/publishing/lifecycle/human-pipeline-read-model.ts', 'utf8')
const page = readFileSync('app/publisher/pipeline/page.tsx', 'utf8')
const client = readFileSync('app/publisher/_components/PublisherPipelineClient.tsx', 'utf8')
const operatingCenterClient = readFileSync('app/publisher/_components/PublisherOperatingCenterClient.tsx', 'utf8')

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

test('Pipeline and Operating Center link to each other', () => {
  assert.match(client, /href="\/publisher\/operating-center"/)
  assert.match(operatingCenterClient, /href="\/publisher\/pipeline"/)
})
