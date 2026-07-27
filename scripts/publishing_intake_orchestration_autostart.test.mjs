#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const intakeRoute = readFileSync('app/api/publishing/intake/route.ts', 'utf8')
const autostartRoute = readFileSync('app/api/publishing/orchestration/intake-autostart/route.ts', 'utf8')
const publisher = readFileSync('lib/server/publisher-operating-center.ts', 'utf8')
const runControl = readFileSync('azure-functions/diagnostic-ai-runner/src/editorial/editorialReviewRunControl.js', 'utf8')

test('join intake receipt sends author acknowledgment and writes Dataverse status without blocking receipt on recoverable downstream failure', () => {
  assert.match(intakeRoute, /sendJoinAuthorAcknowledgment\(acceptedIntake\)/)
  assert.match(intakeRoute, /markPublishingIntakeAcknowledgmentSent\(dataverse\.recordId\)/)
  assert.match(intakeRoute, /failedOperationType: 'AUTHOR_ACKNOWLEDGMENT'/)
  assert.match(intakeRoute, /failedOperationType: 'ACKNOWLEDGMENT_WRITEBACK'/)
  assert.match(intakeRoute, /autoInitializeOutsideInquiryEditorialReview\(\{/)
  assert.match(intakeRoute, /failedOperationType: 'PIPELINE_ORCHESTRATION'/)
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
  assert.match(publisher, /findStage0DiagnosticForIntake\(config, input\.intakeId\)/)
  assert.match(publisher, /dispatchEditorialReviewNow\(\{/)
  assert.match(publisher, /stage0_diagnostic_handoff_pending/)
  assert.match(publisher, /JM1_EDITORIAL_REVIEW_NOW_URL/)
  assert.match(publisher, /JM1_DIAGNOSTIC_RUNNER_URL/)
  assert.match(publisher, /run-editorial-review-now/)
})

test('eligible complete outside inquiries are not rendered as manual publisher review work', () => {
  assert.match(publisher, /Editorial Review automation pending/)
  assert.match(publisher, /currentBlocker === 'Editorial Review automation pending'/)
  assert.doesNotMatch(publisher, /Ready for publisher intake review'\s+&& hasContact && hasManuscript/)
  assert.match(publisher, /executionMode: 'AUTOMATIC_SCHEDULED'/)
  assert.match(publisher, /executionOwner: 'JM1 Automation'/)
  assert.match(
    publisher,
    /currentBlocker === 'Editorial Review automation pending'[\s\S]+hasContact && hasManuscript[\s\S]+\? 'system'/,
  )
})

test('Untitled is treated as a valid provisional title, not missing metadata', () => {
  assert.match(publisher, /PROVISIONAL_TITLE_NAMES = new Set\(\['untitled'\]\)/)
  assert.match(publisher, /isProvisionalTitleName\(titleName\)/)
  assert.match(publisher, /Provisional title accepted for publisher intake review/)
  assert.doesNotMatch(publisher, /titleName === 'Untitled'[\s\S]+Publisher Review Required/)
})

test('fresh Stage 0 diagnostic handoffs are eligible for automated editorial review execution', () => {
  assert.match(runControl, /DIAGNOSTIC_STATUS\.PENDING/)
  assert.match(runControl, /DIAGNOSTIC_STATUS\.AWAITING_JACKIE_REVIEW/)
  assert.match(runControl, /DIAGNOSTIC_NOT_READY_FOR_EDITORIAL_REVIEW/)
  assert.doesNotMatch(runControl, /DIAGNOSTIC_NOT_AWAITING_PUBLISHER_REVIEW/)
})
