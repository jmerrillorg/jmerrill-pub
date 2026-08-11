import assert from 'node:assert/strict'
import test from 'node:test'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const gateModule = jiti('../lib/server/author-final-approval-gate.ts')
const closeoutModule = jiti('../lib/server/publishing-title-closeout-service.ts')

const { evaluateAuthorFinalApprovalGate } = gateModule
const { closeApprovedStage, INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST } = closeoutModule

function gate(overrides = {}) {
  return evaluateAuthorFinalApprovalGate({
    requiresAuthorApproval: true,
    responseSemantic: 'APPROVED',
    currentStageArtifactVersion: 'artifact-v2',
    approvedArtifactVersion: 'artifact-v2',
    unresolvedAuthorCorrections: 0,
    requiredInternalVerification: 'COMPLETE',
    updatedArtifactReturnedToAuthor: true,
    ...overrides,
  })
}

function closeoutInput(overrides = {}) {
  return {
    titleId: INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST.titleId,
    stageId: INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST.stageId,
    gateId: INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST.gateId,
    approvedArtifactId: 'intentional-leader-final-pagination-corrected-proof-2026-08-03-v1',
    approvedArtifactChecksum: INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST.approvedChecksum,
    approvalSource: 'author-reply:approved',
    approvalTimestamp: '2026-08-03T11:07:31Z',
    authorApprovalSemantic: 'APPROVED',
    currentStageArtifactVersion: 'intentional-leader-final-pagination-corrected-proof-2026-08-03-v1',
    approvedArtifactVersion: 'intentional-leader-final-pagination-corrected-proof-2026-08-03-v1',
    unresolvedAuthorCorrections: 0,
    requiredInternalVerification: 'COMPLETE',
    expectedCurrentStage: 'INTERIOR_LAYOUT',
    expectedGateState: 'READY_FOR_AUTHOR_RELEASE',
    expectedActiveGateCount: 1,
    expectedResponseClockCount: 0,
    dryRun: true,
    confirm: false,
    nextStage: 'Cover Design',
    ...overrides,
  }
}

function closeoutAdapter() {
  return {
    async read(input) {
      return {
        title: { jm1pub_titleid: input.titleId, jm1pub_titlename: 'The Intentional Leader' },
        stage: {
          jm1pub_editorialstageid: input.stageId,
          jm1pub_name: 'Interior Layout - The Intentional Leader',
          jm1pub_stagetype: 'INTERIOR_LAYOUT',
        },
        gate: {
          jm1pub_editorialapprovalgateid: input.gateId,
          jm1pub_gatestatus: 196650001,
          _jm1pub_editorialstageid_value: input.stageId,
        },
        gates: [
          {
            jm1pub_editorialapprovalgateid: input.gateId,
            jm1pub_gatestatus: 196650001,
            _jm1pub_editorialstageid_value: input.stageId,
          },
        ],
        artifacts: [
          {
            jm1pub_editorialartifactid: 'artifact-guid',
            jm1pub_editorialartifactname: input.approvedArtifactId,
            jm1pub_sha256: input.approvedArtifactChecksum,
          },
        ],
        existingCloseoutLog: null,
      }
    },
    async patch() {},
    async create() {
      return 'execution-log-id'
    },
  }
}

test('1. PENDING cannot close an author-required stage', () => {
  const result = gate({ responseSemantic: 'PENDING', approvedArtifactVersion: null })
  assert.equal(result.stageCloseEligible, false)
  assert.equal(result.nextStageEligible, false)
  assert.match(result.blockers.join(','), /FINAL_AUTHOR_APPROVAL_NOT_RECEIVED/)
})

test('2. CHANGES_REQUESTED cannot close an author-required stage', () => {
  const result = gate({ responseSemantic: 'CHANGES_REQUESTED', approvedArtifactVersion: null, unresolvedAuthorCorrections: 1 })
  assert.equal(result.stageCloseEligible, false)
  assert.equal(result.revisionLoopRequired, true)
})

test('3. APPROVED_WITH_CORRECTIONS cannot close an author-required stage', () => {
  const result = gate({ responseSemantic: 'APPROVED_WITH_CORRECTIONS', approvedArtifactVersion: null, unresolvedAuthorCorrections: 1 })
  assert.equal(result.stageCloseEligible, false)
  assert.equal(result.nextStageEligible, false)
})

test('4. corrections applied still cannot close without author approval', () => {
  const result = gate({ responseSemantic: 'REVISED_FOR_AUTHOR_REVIEW', approvedArtifactVersion: null, unresolvedAuthorCorrections: 0 })
  assert.equal(result.stageCloseEligible, false)
  assert.match(result.blockers.join(','), /FINAL_AUTHOR_APPROVAL_NOT_RECEIVED/)
})

test('5. Publishing Team verification still cannot close without author approval', () => {
  const result = gate({ responseSemantic: 'REVISED_FOR_AUTHOR_REVIEW', approvedArtifactVersion: null, unresolvedAuthorCorrections: 0, requiredInternalVerification: 'COMPLETE' })
  assert.equal(result.stageCloseEligible, false)
})

test('6. updated artifact returned to author still cannot close before author approval', () => {
  const result = gate({ responseSemantic: 'REVISED_FOR_AUTHOR_REVIEW', approvedArtifactVersion: null, unresolvedAuthorCorrections: 0, requiredInternalVerification: 'COMPLETE', updatedArtifactReturnedToAuthor: true })
  assert.equal(result.stageCloseEligible, false)
})

test('7. author explicitly approves updated artifact and stage becomes close-eligible', () => {
  const result = gate()
  assert.equal(result.finalAuthorApprovalReceived, true)
  assert.equal(result.stageCloseEligible, true)
})

test('8. stage close eligibility makes next stage eligible', () => {
  const result = gate()
  assert.equal(result.nextStageEligible, true)
})

test('9. approval of V1 cannot approve materially revised V2', () => {
  const result = gate({ currentStageArtifactVersion: 'artifact-v2', approvedArtifactVersion: 'artifact-v1' })
  assert.equal(result.stageCloseEligible, false)
  assert.match(result.blockers.join(','), /APPROVAL_ARTIFACT_VERSION_MISMATCH/)
})

test('10. multiple correction rounds remain open until final approval of current artifact', () => {
  const round1 = gate({ responseSemantic: 'APPROVED_WITH_CORRECTIONS', approvedArtifactVersion: null, unresolvedAuthorCorrections: 1 })
  const round2 = gate({ responseSemantic: 'REVISED_FOR_AUTHOR_REVIEW', approvedArtifactVersion: null, unresolvedAuthorCorrections: 0, requiredInternalVerification: 'COMPLETE' })
  const round3 = gate()
  assert.equal(round1.stageCloseEligible, false)
  assert.equal(round2.stageCloseEligible, false)
  assert.equal(round3.stageCloseEligible, true)
})

test('11. manual-recovery operation cannot bypass author approval', () => {
  const result = gate({ manualOverride: true })
  assert.equal(result.stageCloseEligible, false)
  assert.match(result.blockers.join(','), /MANUAL_OVERRIDE_IS_NOT_AUTHOR_APPROVAL/)
})

test('12. runtime closeout blocks conditional approval when semantic state is supplied', async () => {
  const result = await closeApprovedStage(
    closeoutInput({ authorApprovalSemantic: 'APPROVED_WITH_CORRECTIONS', approvedArtifactVersion: undefined, unresolvedAuthorCorrections: 1 }),
    closeoutAdapter(),
  )
  assert.equal(result.status, 'blocked')
  assert.equal(result.resultCode, 'TITLE_CLOSEOUT_FINAL_AUTHOR_APPROVAL_MISSING')
})

test('13. runtime closeout allows explicit final approval of current artifact', async () => {
  const result = await closeApprovedStage(closeoutInput(), closeoutAdapter())
  assert.equal(result.status, 'eligible')
})
