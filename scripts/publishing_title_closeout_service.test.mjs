import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const serviceModule = jiti('../lib/server/publishing-title-closeout-service.ts')
const route = readFileSync(new URL('../app/api/publishing/title-closeout/route.ts', import.meta.url), 'utf8')
const workflow = readFileSync(new URL('../.github/workflows/publishing-title-closeout.yml', import.meta.url), 'utf8')
const serviceSource = readFileSync(new URL('../lib/server/publishing-title-closeout-service.ts', import.meta.url), 'utf8')

const {
  closeApprovedStage,
  buildTitleCloseoutIdempotencyKey,
  INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST,
} = serviceModule

const baseInput = {
  titleId: INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST.titleId,
  stageId: INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST.stageId,
  gateId: INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST.gateId,
  approvedArtifactId: 'intentional-leader-final-pagination-corrected-proof-2026-08-03-v1',
  approvedArtifactChecksum: INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST.approvedChecksum,
  approvalSource: 'jackie-author-approval-confirmed',
  approvalTimestamp: '2026-08-03T00:00:00Z',
  expectedCurrentStage: 'INTERIOR_LAYOUT',
  expectedGateState: 'READY_FOR_AUTHOR_RELEASE',
  expectedActiveGateCount: 1,
  expectedResponseClockCount: 0,
  dryRun: true,
  confirm: false,
  nextStage: INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST.nextStage,
}

function rows(overrides = {}) {
  return {
    title: { jm1pub_titleid: baseInput.titleId, jm1pub_titlename: 'The Intentional Leader' },
    stage: {
      jm1pub_editorialstageid: baseInput.stageId,
      jm1pub_name: 'Interior Layout - The Intentional Leader',
      jm1pub_stagetype: 'INTERIOR_LAYOUT',
    },
    gate: {
      jm1pub_editorialapprovalgateid: baseInput.gateId,
      jm1pub_gatestatus: 196650001,
      _jm1pub_editorialstageid_value: baseInput.stageId,
    },
    gates: [
      {
        jm1pub_editorialapprovalgateid: baseInput.gateId,
        jm1pub_gatestatus: 196650001,
        _jm1pub_editorialstageid_value: baseInput.stageId,
      },
    ],
    artifacts: [
      {
        jm1pub_editorialartifactid: 'artifact-guid',
        jm1pub_editorialartifactname: baseInput.approvedArtifactId,
        jm1pub_filename: 'The Intentional Leader - Final Proof.pdf',
        jm1pub_sha256: baseInput.approvedArtifactChecksum,
      },
    ],
    existingCloseoutLog: null,
    ...overrides,
  }
}

function adapter(readback = rows()) {
  return {
    patches: [],
    creates: [],
    async read() {
      return readback
    },
    async patch(entitySet, id, payload) {
      this.patches.push({ entitySet, id, payload })
    },
    async create(entitySet, payload) {
      this.creates.push({ entitySet, payload })
      return 'jm1_executionlogs(execution-log-id)'
    },
  }
}

test('valid approved title dry-run passes', async () => {
  const result = await closeApprovedStage(baseInput, adapter())
  assert.equal(result.status, 'eligible')
  assert.equal(result.activeCanonicalGates, 1)
  assert.equal(result.duplicateGates, 0)
  assert.equal(result.responseClocks, 0)
  assert.equal(result.approvedArtifact, 'MATCH')
  assert.equal(result.checksum, 'MATCH')
  assert.equal(result.nextStage, 'Cover Design')
  assert.deepEqual(result.blockers, [])
})

test('unapproved title fails', async () => {
  const result = await closeApprovedStage({ ...baseInput, titleId: 'missing-governed-title' }, adapter(rows({ title: null })))
  assert.equal(result.resultCode, 'TITLE_CLOSEOUT_TITLE_NOT_FOUND')
})

test('wrong stage fails', async () => {
  const result = await closeApprovedStage(baseInput, adapter(rows({ stage: { jm1pub_editorialstageid: 'wrong', jm1pub_name: 'Copyediting' } })))
  assert.equal(result.resultCode, 'TITLE_CLOSEOUT_STAGE_MISMATCH')
})

test('wrong gate fails', async () => {
  const result = await closeApprovedStage(baseInput, adapter(rows({ gate: { jm1pub_editorialapprovalgateid: 'wrong' } })))
  assert.equal(result.resultCode, 'TITLE_CLOSEOUT_GATE_MISMATCH')
})

test('multiple active gates fail', async () => {
  const result = await closeApprovedStage(baseInput, adapter(rows({
    gates: [
      { jm1pub_editorialapprovalgateid: baseInput.gateId, jm1pub_gatestatus: 196650001, _jm1pub_editorialstageid_value: baseInput.stageId },
      { jm1pub_editorialapprovalgateid: 'second', jm1pub_gatestatus: 196650001, _jm1pub_editorialstageid_value: baseInput.stageId },
    ],
  })))
  assert.equal(result.resultCode, 'TITLE_CLOSEOUT_MULTIPLE_ACTIVE_GATES')
})

test('missing approval fails', async () => {
  const result = await closeApprovedStage({ ...baseInput, approvalSource: '' }, adapter())
  assert.equal(result.resultCode, 'TITLE_CLOSEOUT_APPROVAL_NOT_FOUND')
})

test('wrong artifact fails', async () => {
  const result = await closeApprovedStage(baseInput, adapter(rows({ artifacts: [] })))
  assert.equal(result.resultCode, 'TITLE_CLOSEOUT_ARTIFACT_MISMATCH')
})

test('wrong checksum fails', async () => {
  const result = await closeApprovedStage(baseInput, adapter(rows({ artifacts: [{ jm1pub_editorialartifactid: 'artifact-guid', jm1pub_editorialartifactname: baseInput.approvedArtifactId, jm1pub_sha256: 'wrong' }] })))
  assert.equal(result.resultCode, 'TITLE_CLOSEOUT_CHECKSUM_MISMATCH')
})

test('existing response clock conflict fails', async () => {
  const result = await closeApprovedStage(baseInput, adapter(rows({ gates: [{ jm1pub_editorialapprovalgateid: baseInput.gateId, jm1pub_gatestatus: 196650001, _jm1pub_editorialstageid_value: baseInput.stageId, jm1pub_awaitingsince: '2026-08-01T00:00:00Z' }] })))
  assert.equal(result.resultCode, 'TITLE_CLOSEOUT_RESPONSE_CLOCK_CONFLICT')
})

test('undefined next stage fails', async () => {
  const result = await closeApprovedStage({ ...baseInput, nextStage: '' }, adapter())
  assert.equal(result.resultCode, 'TITLE_CLOSEOUT_NEXT_STAGE_UNDEFINED')
})

test('unauthenticated endpoint returns 401', () => {
  assert.match(route, /status:\s*401/)
  assert.match(route, /GitHub Actions OIDC bearer token required/)
})

test('confirmed execution requires explicit confirm', () => {
  assert.match(route, /confirm !== true/)
  assert.match(route, /Confirmed title closeout requires confirm=true/)
})

test('successful closeout creates no communication and no response clock', async () => {
  const mock = adapter()
  const result = await closeApprovedStage({ ...baseInput, dryRun: false, confirm: true }, mock)
  assert.equal(result.status, 'completed')
  assert.equal(result.mutationCounts.newCommunications, 0)
  assert.equal(result.mutationCounts.newClocks, 0)
  assert.equal(mock.patches.some((patch) => patch.payload.jm1pub_awaitingsince), false)
  assert.equal(serviceSource.includes('sendAuthorPackage'), false)
})

test('rerun returns idempotent', async () => {
  const result = await closeApprovedStage(baseInput, adapter(rows({ existingCloseoutLog: { jm1_executionlogid: 'existing-log' } })))
  assert.equal(result.status, 'idempotent')
  assert.equal(result.resultCode, 'TITLE_CLOSEOUT_ALREADY_COMPLETE')
  assert.deepEqual(result.executionLogIds, ['existing-log'])
})

test('closeout executor does not rely on hard-coded title allowlist as business authorization', () => {
  assert.doesNotMatch(route, /body\.titleId\s*!==\s*INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST/)
  assert.doesNotMatch(workflow, /TITLE_CLOSEOUT_TITLE_NOT_ALLOWLISTED/)
  assert.match(workflow, /title_id:/)
  assert.match(workflow, /author_approval_semantic:/)
  assert.match(workflow, /current_stage_artifact_version:/)
  assert.doesNotMatch(workflow, /if \[\[ \"\\$\\{\\{ inputs\.title \}\\}\" != \"The Intentional Leader\"/)
})

test('workflow is governed and production protected', () => {
  assert.match(workflow, /npm run jm1-bootstrap -- --initiative "Protected Publishing Title Closeout Executor" --mode "production-mutation"/)
  assert.match(workflow, /npm run jm1-commissioning-guard/)
  assert.match(workflow, /expected_production_release/)
  assert.match(workflow, /audience=jm1-pub-title-closeout/)
  assert.match(workflow, /environment:\s*jmerrill-pub-production/)
  assert.doesNotMatch(workflow, /AZURE_CLIENT_SECRET|DATAVERSE_CLIENT_SECRET|client-secret/)
})

test('stable idempotency key includes operation facts', () => {
  const first = buildTitleCloseoutIdempotencyKey(baseInput)
  const second = buildTitleCloseoutIdempotencyKey({ ...baseInput, approvedArtifactChecksum: 'different' })
  assert.notEqual(first, second)
  assert.match(first, /^[a-f0-9]{64}$/)
})

test('eligible non-pilot governed title can use closeout service once all gates pass', async () => {
  const nonPilotInput = {
    ...baseInput,
    titleId: 'governed-title-001',
    stageId: 'governed-stage-001',
    gateId: 'governed-gate-001',
    approvedArtifactId: 'governed-current-artifact-v2',
    approvedArtifactChecksum: 'a'.repeat(64),
    expectedCurrentStage: 'DEVELOPMENTAL_EDITING',
    expectedGateState: 'READY_FOR_AUTHOR_RELEASE',
    nextStage: 'Line Editing',
    authorApprovalSemantic: 'APPROVED',
    currentStageArtifactVersion: 'governed-current-artifact-v2',
    approvedArtifactVersion: 'governed-current-artifact-v2',
    unresolvedAuthorCorrections: 0,
    requiredInternalVerification: 'COMPLETE',
  }
  const result = await closeApprovedStage(nonPilotInput, adapter(rows({
    title: { jm1pub_titleid: 'governed-title-001', jm1pub_titlename: 'The General’s Will and Last Testament' },
    stage: {
      jm1pub_editorialstageid: 'governed-stage-001',
      jm1pub_name: 'Developmental Editing - The General’s Will and Last Testament',
      jm1pub_stagetype: 'DEVELOPMENTAL_EDITING',
      _jm1pub_titleid_value: 'governed-title-001',
    },
    gate: {
      jm1pub_editorialapprovalgateid: 'governed-gate-001',
      jm1pub_gatestatus: 196650001,
      _jm1pub_titleid_value: 'governed-title-001',
      _jm1pub_editorialstageid_value: 'governed-stage-001',
    },
    gates: [
      {
        jm1pub_editorialapprovalgateid: 'governed-gate-001',
        jm1pub_gatestatus: 196650001,
        _jm1pub_titleid_value: 'governed-title-001',
        _jm1pub_editorialstageid_value: 'governed-stage-001',
      },
    ],
    artifacts: [
      {
        jm1pub_editorialartifactid: 'artifact-guid',
        jm1pub_editorialartifactname: 'governed-current-artifact-v2',
        jm1pub_filename: 'The General’s Will and Last Testament - Revised.docx',
        jm1pub_sha256: 'a'.repeat(64),
        _jm1pub_titleid_value: 'governed-title-001',
        _jm1pub_editorialstageid_value: 'governed-stage-001',
      },
    ],
  })))
  assert.equal(result.status, 'eligible')
  assert.equal(result.nextStage, 'Line Editing')
})
