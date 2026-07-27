#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const intakeRoute = readFileSync('app/api/publishing/intake/route.ts', 'utf8')
const autostartRoute = readFileSync('app/api/publishing/orchestration/intake-autostart/route.ts', 'utf8')
const publisher = readFileSync('lib/server/publisher-operating-center.ts', 'utf8')

test('join intake receipt sends author acknowledgment and writes Dataverse status without blocking receipt on recoverable downstream failure', () => {
  assert.match(intakeRoute, /sendJoinAuthorAcknowledgment\(acceptedIntake\)/)
  assert.match(intakeRoute, /markPublishingIntakeAcknowledgmentSent\(dataverse\.recordId\)/)
  assert.match(intakeRoute, /failedOperationType: 'AUTHOR_ACKNOWLEDGMENT'/)
  assert.match(intakeRoute, /failedOperationType: 'ACKNOWLEDGMENT_WRITEBACK'/)
  assert.match(intakeRoute, /enqueuePublishingIntakeRecovery\(\{/)
  assert.match(intakeRoute, /return json\(\{ status: 'received', reference \}, 201/)
})

test('intake autostart endpoint is worker-key protected and validates only safe identifiers', () => {
  assert.match(autostartRoute, /JM1_ORCHESTRATION_WORKER_KEY/)
  assert.match(autostartRoute, /x-jm1-orchestration-worker-key/)
  assert.match(autostartRoute, /Worker authorization failed/)
  assert.match(autostartRoute, /GUID_PATTERN\.test\(intakeId\)/)
  assert.match(autostartRoute, /CORRELATION_ID_PATTERN\.test\(correlationId\)/)
  assert.doesNotMatch(autostartRoute, /authorEmail|manuscriptUrl|secret|token/i)
})

test('automatic outside inquiry initialization uses governed publisher initialization logic with JM1 Automation ownership', () => {
  assert.match(publisher, /export async function autoInitializeOutsideInquiryEditorialReview/)
  assert.match(publisher, /intakeChannel !== 'INT-PUB-005 \/join'/)
  assert.match(publisher, /blocker: 'intake_missing_contact'/)
  assert.match(publisher, /blocker: 'intake_missing_manuscript_evidence'/)
  assert.match(publisher, /initializePublisherEditorialReview\(\{/)
  assert.match(publisher, /operatorEmail: 'JM1 Automation'/)
  assert.match(publisher, /findPublisherExecutionLog\(config, 'PUBLISHER_EDITORIAL_REVIEW_INITIALIZED', input\.intakeId\)/)
})

test('eligible complete outside inquiries are not rendered as manual publisher review work', () => {
  assert.match(publisher, /currentBlocker === 'Ready for publisher intake review' && hasContact && hasManuscript/)
  assert.match(publisher, /executionMode: 'AUTOMATIC_SCHEDULED'/)
  assert.match(publisher, /executionOwner: 'JM1 Automation'/)
  assert.match(
    publisher,
    /currentBlocker === 'Ready for publisher intake review' && hasContact && hasManuscript\s+\? 'system'/,
  )
})
