#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const intakeRoute = readFileSync('app/api/publishing/intake/route.ts', 'utf8')
const manuscriptUpload = readFileSync('lib/publishing/intake/manuscriptUpload.ts', 'utf8')
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
  assert.match(publisher, /waitForStage0DiagnosticForIntake\(config, input\.intakeId\)/)
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

test('autostart binds preserved manuscript asset fields before diagnostic dispatch', () => {
  assert.match(publisher, /ensureDiagnosticManuscriptAssetBinding/)
  assert.match(publisher, /jm1_manuscriptasseturl: manuscriptUrl/)
  assert.match(publisher, /jm1_manuscriptapprovedfordiagnostic: true/)
  assert.match(publisher, /jm1pub_manuscriptpresent: true/)
  assert.match(publisher, /MANUSCRIPT_ASSET_STATUS_APPROVED = 3/)
  assert.match(publisher, /jm1_manuscriptassetstatus: MANUSCRIPT_ASSET_STATUS_APPROVED/)
  assert.doesNotMatch(publisher, /jm1_manuscriptassetstatus: 'Approved for Stage 0 diagnostic'/)
  assert.match(publisher, /jm1_manuscriptfiletype: metadata\.fileType/)
  assert.match(publisher, /lower\.endsWith\('\.md'\)[\s\S]+\? 'md'/)
  assert.match(publisher, /lower\.endsWith\('\.txt'\)[\s\S]+\? 'txt'/)
  assert.match(publisher, /waitForStage0DiagnosticForIntake/)
})

test('Markdown manuscripts are governed source artifacts with immutable provenance manifest', () => {
  assert.match(manuscriptUpload, /type ManuscriptFileExtension = 'docx' \| 'doc' \| 'pdf' \| 'md'/)
  assert.match(manuscriptUpload, /allowedExtensions: \['\.docx', '\.doc', '\.pdf', '\.md'\]/)
  assert.match(manuscriptUpload, /Upload a \.docx, \.doc, \.pdf, or \.md manuscript file\./)
  assert.match(manuscriptUpload, /JM1_PUBLISHING_SOURCE_ARTIFACT_MANIFEST_V1/)
  assert.match(manuscriptUpload, /immutable: true/)
  assert.match(manuscriptUpload, /sourceFormat: input\.validation\.extension/)
  assert.match(manuscriptUpload, /sizeBytes: input\.validation\.value\.size/)
  assert.match(manuscriptUpload, /sha256: input\.sourceSha256/)
  assert.match(manuscriptUpload, /correlationId: input\.intake\.idempotencyKey/)
  assert.match(manuscriptUpload, /downstreamVersionsMustDeriveFromSource: true/)
  assert.match(manuscriptUpload, /source-artifact-manifest\.json/)
})

test('autostart writes one idempotent success event after dispatch', () => {
  assert.match(publisher, /PUBLISHING_INTAKE_ORCHESTRATION_DISPATCHED/)
  assert.match(publisher, /findPublisherExecutionLog\([\s\S]*PUBLISHING_INTAKE_ORCHESTRATION_DISPATCHED/)
  assert.match(publisher, /Author recommendation sent/)
})

test('diagnostic runner registers the governed intake autostart recovery worker', () => {
  const index = readFileSync('azure-functions/diagnostic-ai-runner/src/index.js', 'utf8')
  const worker = readFileSync('azure-functions/diagnostic-ai-runner/src/functions/runPublishingIntakeAutostartRecovery.js', 'utf8')
  const pkg = readFileSync('azure-functions/diagnostic-ai-runner/package.json', 'utf8')

  assert.match(index, /runPublishingIntakeAutostartRecovery/)
  assert.match(pkg, /runPublishingIntakeAutostartRecovery\.js/)
  assert.match(worker, /app\.timer\("run-publishing-intake-autostart-recovery"/)
  assert.match(worker, /JM1_ORCHESTRATION_WORKER_KEY/)
  assert.match(worker, /x-jm1-orchestration-worker-key/)
  assert.match(worker, /jm1_publishingintakeid/)
  assert.match(worker, /PUBLISHING_INTAKE_ORCHESTRATION_DISPATCHED/)
  assert.doesNotMatch(worker, /console\.log\(.*workerKey/)
  assert.doesNotMatch(worker, /context\.(info|warn|error)\(.*workerKey/)
})

test('fresh Stage 0 diagnostic handoffs are eligible for automated editorial review execution', () => {
  assert.match(runControl, /DIAGNOSTIC_STATUS\.PENDING/)
  assert.match(runControl, /DIAGNOSTIC_STATUS\.AWAITING_JACKIE_REVIEW/)
  assert.match(runControl, /DIAGNOSTIC_NOT_READY_FOR_EDITORIAL_REVIEW/)
  assert.doesNotMatch(runControl, /DIAGNOSTIC_NOT_AWAITING_PUBLISHER_REVIEW/)
})

test('live join inquiries preserve lead linkage and do not surface routine Stage 0 handoffs as Jackie gates', () => {
  assert.match(publisher, /_jm1_linkedlead_value/)
  assert.match(publisher, /_jm1_lead_value/)
  assert.match(publisher, /getRecentEditorialDiagnostics/)
  assert.match(publisher, /DIAGNOSTIC_STATUS_AWAITING_JACKIE_REVIEW/)
  assert.match(publisher, /stage0RequiresJackieGate/)
  assert.match(publisher, /Stage 0 diagnostic requires publisher review/)
  assert.match(publisher, /Manuscript evidence is missing/)
  assert.doesNotMatch(publisher, /Stage 0 diagnostic awaiting Jackie review/)
  assert.doesNotMatch(publisher, /currentStage = dataverseFormatted\(title \|\| \{\}, 'jm1pub_stage'\) \|\| 'Inquiry'/)
})
