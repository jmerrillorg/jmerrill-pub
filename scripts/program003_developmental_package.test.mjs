import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildDevelopmentalReviewPackage,
  buildEditorialDashboardRollup,
} from '../lib/program003/editorial-command.ts'

function buildRecord() {
  return {
    publishingAssetId: 'c9dc862e-da7a-f111-ab0f-000d3a14673b',
    titleId: 'e797232b-da7a-f111-ab0f-00224820105b',
    contactId: 'a7801f4d-1d76-f111-ab0f-6045bdd69435',
    title: 'The Intentional Leader',
    authorName: 'Jackie Smith Jr.',
    stages: [
      {
        id: 'stage-review',
        publishingAssetId: 'c9dc862e-da7a-f111-ab0f-000d3a14673b',
        titleId: 'e797232b-da7a-f111-ab0f-00224820105b',
        contactId: 'a7801f4d-1d76-f111-ab0f-6045bdd69435',
        stageType: 'Editorial Review',
        stageStatus: 'Complete',
        stageSequence: 1,
        healthStatus: 'Healthy',
      },
      {
        id: 'stage-dev',
        publishingAssetId: 'c9dc862e-da7a-f111-ab0f-000d3a14673b',
        titleId: 'e797232b-da7a-f111-ab0f-00224820105b',
        contactId: 'a7801f4d-1d76-f111-ab0f-6045bdd69435',
        stageType: 'Developmental Editing',
        stageStatus: 'In Progress',
        stageSequence: 2,
        governingStyleGuide: 'CMOS + JMP devotional overlay',
        inheritedImprint: 'J Merrill Publishing',
        healthStatus: 'Watch',
        startedOn: '2026-07-11T12:00:00Z',
      },
    ],
    gates: [
      {
        id: 'gate-a2',
        publishingAssetId: 'c9dc862e-da7a-f111-ab0f-000d3a14673b',
        titleId: 'e797232b-da7a-f111-ab0f-00224820105b',
        stageId: 'stage-dev',
        gateCode: 'A2',
        gateDomain: 'Editorial',
        gateStatus: 'Approved',
        nextStageAuthorized: true,
        authorDecisionOn: '2026-07-10T14:00:00Z',
      },
    ],
    summaries: [],
    artifacts: [],
    exceptions: [],
  }
}

test('buildDevelopmentalReviewPackage assembles one current governed package', () => {
  const pkg = buildDevelopmentalReviewPackage(buildRecord())
  assert.ok(pkg)
  assert.equal(pkg.title, 'The Intentional Leader')
  assert.equal(pkg.status, 'In Progress')
  assert.equal(pkg.currentVersion, true)
  assert.equal(pkg.components.length, 7)
  assert.ok(pkg.crossReferences.length >= 8)
  assert.ok(pkg.qualityChecks.length >= 8)
})

test('cross references remain bidirectional at component level', () => {
  const pkg = buildDevelopmentalReviewPackage(buildRecord())
  assert.ok(pkg)
  const recommendationLinks = pkg.crossReferences.filter((item) => item.sourceComponent === 'Publisher Recommendation')
  const manuscriptLinks = pkg.crossReferences.filter((item) => item.targetComponent === 'Working Manuscript')
  assert.ok(recommendationLinks.length > 0)
  assert.ok(manuscriptLinks.length > 0)
  assert.ok(pkg.crossReferences.every((item) => item.integrityStatus === 'Valid'))
})

test('dashboard rollup includes developmental package counts', () => {
  const rollup = buildEditorialDashboardRollup([buildRecord()])
  assert.ok(rollup.packageCounts)
  assert.equal(rollup.packageCounts['In Progress'], 1)
})
