import assert from 'node:assert/strict'
import test from 'node:test'

import { projectSummaryFromResolvedRow } from '../lib/server/author-portal-context.ts'
import { buildEditorialDisplayState } from '../lib/server/author-portal-status.ts'

test('approved developmental package preserves live publisher-progress summary', () => {
  const project = projectSummaryFromResolvedRow({
    title: 'The Intentional Leader',
    intakeReference: 'JMP-INT-202607-0W5PTQ',
    publishingAssetId: 'c9dc862e-da7a-f111-ab0f-000d3a14673b',
    workspaceState: 'developmental_editing',
    stageLabel: 'Developmental Editing',
    stageStatus: 'In Progress',
    summary:
      'Your approval has been received, and developmental work has begun on Volume I, covering January through March.',
    nextActionLabel:
      'No action is required from you at this time. We will contact you if your input is needed during the developmental process.',
    authorActionAvailable: false,
    authorDecisionOutstanding: false,
    authorDecision: 'Approve',
    gateStatus: 'Approved',
    releasedArtifactExists: true,
    releasePublished: true,
  })

  assert.equal(project.statusLabel, 'Developmental Editing - In Progress')
  assert.equal(
    project.summary,
    'Your approval has been received, and developmental work has begun on Volume I, covering January through March.',
  )
  assert.equal(
    project.nextActionLabel,
    'No action is required from you at this time. We will contact you if your input is needed during the developmental process.',
  )
  assert.equal(project.pendingApprovalLabel, undefined)
})

test('unreleased developmental package does not fabricate author action', () => {
  const project = projectSummaryFromResolvedRow({
    title: 'The Intentional Leader',
    intakeReference: 'JMP-INT-202607-0W5PTQ',
    publishingAssetId: 'c9dc862e-da7a-f111-ab0f-000d3a14673b',
    workspaceState: 'developmental_editing',
    stageLabel: 'Developmental Editing',
    stageStatus: 'Not Started',
    summary: 'Internal package draft only.',
    nextActionLabel: 'Review the recommendation and respond through the official email communication.',
    authorActionAvailable: false,
    authorDecisionOutstanding: false,
    gateStatus: 'Not Ready',
    releasedArtifactExists: true,
    releasePublished: false,
  })

  assert.equal(
    project.summary,
    'Developmental planning is being prepared for Volume I of the approved quarterly series.',
  )
  assert.equal(
    project.nextActionLabel,
    'No action is required from you at this time. We will update you when the developmental plan is ready for review.',
  )
  assert.equal(project.pendingApprovalLabel, undefined)
})

test('developmental editorial display preserves live in-progress summary when provided', () => {
  const display = buildEditorialDisplayState({
    workspaceState: 'developmental_editing',
    stageLabel: 'Developmental Editing',
    stageStatus: 'In Progress',
    summary:
      'Your approval has been received, and developmental work has begun on Volume I, covering January through March.',
    nextActionLabel:
      'No action is required from you at this time. We will contact you if your input is needed during the developmental process.',
  })

  assert.equal(display.stageLabel, 'Developmental Editing')
  assert.equal(display.stageStatus, 'In Progress')
  assert.equal(
    display.summary,
    'Your approval has been received, and developmental work has begun on Volume I, covering January through March.',
  )
  assert.equal(
    display.nextActionLabel,
    'No action is required from you at this time. We will contact you if your input is needed during the developmental process.',
  )
})
