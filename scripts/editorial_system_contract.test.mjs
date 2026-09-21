import assert from 'node:assert/strict'
import test from 'node:test'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const {
  EDITORIAL_SYSTEM_STAGE_CONTRACTS,
  evaluateStageCompletion,
} = jiti('../lib/publishing/lifecycle/editorial-system-contract.ts')

const checksum = 'a'.repeat(64)
const changedChecksum = 'b'.repeat(64)
const titleId = 'title-current'
const authorId = 'author-current'

function artifact(role, overrides = {}) {
  return {
    artifactId: `artifact-${role.toLowerCase()}`,
    role,
    titleId,
    authorId,
    version: 'v1',
    checksum,
    qaState: 'PASS',
    repositoryPath: `/01_Pipeline_A-Z/07 - Developmental Editing/Author - Title/${role}.docx`,
    repositoryDriveId: 'drive-id',
    repositoryItemId: `item-${role.toLowerCase()}`,
    deliveredToAuthor: true,
    current: true,
    ...overrides,
  }
}

function evidence(stageId, sourceArtifacts, outputArtifacts, approvals = [], overrides = {}) {
  const contract = EDITORIAL_SYSTEM_STAGE_CONTRACTS[stageId]
  return {
    titleId,
    authorId,
    stageId,
    sourceArtifacts,
    outputArtifacts,
    approvals,
    capabilityExecution: {
      capabilityId: contract.executionCapability,
      executionId: 'execution-1',
      status: 'PASS',
    },
    ...overrides,
  }
}

function approval(item, overrides = {}) {
  return {
    artifactId: item.artifactId,
    version: item.version,
    checksum: item.checksum,
    decision: 'APPROVED',
    decisionAt: '2026-09-20T12:00:00Z',
    ...overrides,
  }
}

test('all 16 human pipeline stages have executable completion contracts', () => {
  const contracts = Object.values(EDITORIAL_SYSTEM_STAGE_CONTRACTS)
  assert.equal(contracts.length, 16)
  assert.equal(new Set(contracts.map((item) => item.stageId)).size, 16)
  for (const contract of contracts) {
    assert.ok(contract.executionCapability)
    assert.ok(contract.completionContract.length > 0)
    assert.ok(contract.nextTransition)
  }
})

test('Developmental review approval cannot advance without the full edited manuscript', () => {
  const source = artifact('EDITORIAL_WORKING_SOURCE')
  const review = artifact('DEVELOPMENTAL_EDITORIAL_REVIEW')
  const result = evaluateStageCompletion(
    EDITORIAL_SYSTEM_STAGE_CONTRACTS['07_DEVELOPMENTAL_EDITING'],
    evidence('07_DEVELOPMENTAL_EDITING', [source], [review], [{ ...approval(review), directionApproved: true }]),
  )

  assert.equal(result.complete, false)
  assert.equal(result.nextTransitionAuthorized, false)
  assert.ok(result.blockers.includes('OUTPUT_ARTIFACT_MISSING:DEVELOPMENTALLY_EDITED_MANUSCRIPT'))
  assert.equal(result.nextSystemAction, 'INVOKE_CERTIFIED_STAGE_CAPABILITY')
})

test('Line Editing generic approval cannot advance when the manuscript was not delivered', () => {
  const source = artifact('DEVELOPMENTALLY_EDITED_MANUSCRIPT')
  const manuscript = artifact('LINE_EDITED_MANUSCRIPT', { deliveredToAuthor: false })
  const notes = artifact('LINE_EDITORIAL_NOTES')
  const result = evaluateStageCompletion(
    EDITORIAL_SYSTEM_STAGE_CONTRACTS['08_LINE_EDITING'],
    evidence('08_LINE_EDITING', [source], [manuscript, notes], [approval(manuscript)]),
  )

  assert.equal(result.complete, false)
  assert.ok(result.blockers.includes('AUTHOR_DELIVERY_MISSING:LINE_EDITED_MANUSCRIPT'))
})

test('Copyediting approval bound to the previous checksum cannot approve a substantive replacement', () => {
  const source = artifact('LINE_EDITED_MANUSCRIPT')
  const manuscript = artifact('COPYEDITED_MANUSCRIPT', { version: 'v2', checksum: changedChecksum })
  const queries = artifact('COPYEDITING_QUERY_LOG', { version: 'v2', checksum: changedChecksum })
  const result = evaluateStageCompletion(
    EDITORIAL_SYSTEM_STAGE_CONTRACTS['09_COPYEDITING'],
    evidence('09_COPYEDITING', [source], [manuscript, queries], [approval(manuscript, { checksum })]),
  )

  assert.equal(result.complete, false)
  assert.ok(result.blockers.includes('APPROVAL_CHECKSUM_MISMATCH:COPYEDITED_MANUSCRIPT'))
})

test('Layout proof v1 approval does not transfer to a materially changed proof v2', () => {
  const layout = artifact('LAYOUT_PROOF')
  const proofV2 = artifact('AUTHOR_PROOF', { version: 'v2', checksum: changedChecksum })
  const result = evaluateStageCompletion(
    EDITORIAL_SYSTEM_STAGE_CONTRACTS['10_PROOFREADING'],
    evidence('10_PROOFREADING', [layout], [proofV2], [approval(proofV2, { version: 'v1', checksum })]),
  )

  assert.equal(result.complete, false)
  assert.ok(result.blockers.includes('APPROVAL_VERSION_MISMATCH:AUTHOR_PROOF'))
})

test('Distribution blocks an otherwise valid final file that exists only locally', () => {
  const finalFile = artifact('DISTRIBUTION_ARTIFACT', {
    repositoryPath: '/tmp/final-interior.pdf',
    repositoryDriveId: undefined,
    repositoryItemId: undefined,
    format: 'PAPERBACK',
    identifier: '9780000000001',
    distributionAuthority: 'PASS',
  })
  const submission = artifact('DISTRIBUTION_SUBMISSION_EVIDENCE', {
    format: 'PAPERBACK',
    identifier: '9780000000001',
    distributionAuthority: 'PASS',
  })
  const result = evaluateStageCompletion(
    EDITORIAL_SYSTEM_STAGE_CONTRACTS['14_DISTRIBUTION'],
    evidence('14_DISTRIBUTION', [finalFile], [finalFile, submission], [], { entitledFormats: ['PAPERBACK'] }),
  )

  assert.equal(result.complete, false)
  assert.ok(result.blockers.includes('SHAREPOINT_PARITY_MISSING:DISTRIBUTION_ARTIFACT'))
  assert.equal(result.nextSystemAction, 'PERSIST_AND_REGISTER_GOVERNED_ARTIFACT')
})

test('Developmental completion requires both direction and exact-version manuscript approval', () => {
  const source = artifact('EDITORIAL_WORKING_SOURCE')
  const review = artifact('DEVELOPMENTAL_EDITORIAL_REVIEW')
  const manuscript = artifact('DEVELOPMENTALLY_EDITED_MANUSCRIPT')
  const exactApproval = approval(manuscript, { directionApproved: true })
  const result = evaluateStageCompletion(
    EDITORIAL_SYSTEM_STAGE_CONTRACTS['07_DEVELOPMENTAL_EDITING'],
    evidence('07_DEVELOPMENTAL_EDITING', [source], [review, manuscript], [exactApproval]),
  )

  assert.equal(result.complete, true)
  assert.equal(result.nextTransitionAuthorized, true)
  assert.equal(result.nextSystemAction, 'EXECUTE_GOVERNED_NEXT_TRANSITION')
})
