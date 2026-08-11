import assert from 'node:assert/strict'
import test from 'node:test'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const propagation = jiti('../lib/server/author-decision-closeout-propagation.ts')
const closeout = jiti('../lib/server/publishing-title-closeout-service.ts')

const { propagateAuthorDecisionEvidence, classifyAuthorReply, buildAuthorDecisionPropagationIdempotencyKey } = propagation
const { INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST } = closeout

const approvedChecksum = INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST.approvedChecksum

function baseReview(overrides = {}) {
  return {
    titleId: INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST.titleId,
    stageId: INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST.stageId,
    gateId: INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST.gateId,
    packageId: 'intentional-leader-final-pagination-corrected-proof-package',
    outboundMessageId: 'outbound-review-message-001',
    correlationId: 'pilot1-live-action-002-replay',
    sentAt: '2026-08-03T11:05:03Z',
    nextEligibleState: 'Cover Design',
    expectedArtifactChecksum: approvedChecksum,
    requiredArtifactIds: ['intentional-leader-final-pagination-corrected-proof-2026-08-03-v1'],
    ...overrides,
  }
}

function baseReply(overrides = {}) {
  return {
    messageId: 'author-reply-approved-001',
    inReplyToMessageId: 'outbound-review-message-001',
    body: 'Approved',
    receivedAt: '2026-08-03T11:07:31Z',
    titleId: INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST.titleId,
    stageId: INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST.stageId,
    gateId: INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST.gateId,
    packageId: 'intentional-leader-final-pagination-corrected-proof-package',
    ...overrides,
  }
}

function baseArtifact(overrides = {}) {
  return {
    artifactId: 'intentional-leader-final-pagination-corrected-proof-2026-08-03-v1',
    titleId: INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST.titleId,
    stageId: INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST.stageId,
    gateId: INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST.gateId,
    packageId: 'intentional-leader-final-pagination-corrected-proof-package',
    repositoryPath:
      '01_Titles/06_Production/02_Interior-Layout/JMP-INT-202607-0W5PTQ - Jackie Smith Jr - The Intentional Leader/2026-08-03_Final-Pagination-Corrected-Interior-Layout-Author-Approval/The_Intentional_Leader_-_Corrected_Interior_Layout_Proof.pdf',
    repositoryItemId: '01DF3SEQKRS4TQIITBLFH2U7CXI3YYUP5Z',
    sha256: approvedChecksum,
    ...overrides,
  }
}

function baseGate(overrides = {}) {
  return {
    gateId: INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST.gateId,
    titleId: INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST.titleId,
    stageId: INTENTIONAL_LEADER_TITLE_CLOSEOUT_ALLOWLIST.stageId,
    awaitingSince: '2026-08-03T11:05:03Z',
    ...overrides,
  }
}

function input(overrides = {}) {
  return {
    reviewRequest: baseReview(overrides.reviewRequest),
    reply: baseReply(overrides.reply),
    artifacts: overrides.artifacts || [baseArtifact()],
    gates: overrides.gates || [baseGate()],
    priorState: overrides.priorState,
    closeoutRequest: overrides.closeoutRequest,
  }
}

async function run(overrides = {}) {
  return propagateAuthorDecisionEvidence(input(overrides))
}

test('reply classification is governed and narrow', () => {
  assert.equal(classifyAuthorReply('Approved'), 'APPROVED')
  assert.equal(classifyAuthorReply('Approved with corrections'), 'APPROVED_WITH_CORRECTIONS')
  assert.equal(classifyAuthorReply('I have questions'), 'QUESTIONS')
  assert.equal(classifyAuthorReply('Looks okay to me, probably'), 'REVIEW_REQUIRED')
})

test('1. Approved reply correlates and closes awaiting state', async () => {
  const result = await run()
  assert.equal(result.status, 'PASS')
  assert.equal(result.decision, 'APPROVED')
  assert.equal(result.authorDecisionCaptured, true)
  assert.equal(result.awaitingStateClosed, true)
})

test('2. Approved with corrections correlates but does not grant wrong next stage', async () => {
  const result = await run({ reply: { body: 'Approved with corrections' } })
  assert.equal(result.status, 'PASS')
  assert.equal(result.decision, 'APPROVED_WITH_CORRECTIONS')
  assert.equal(result.authorDecisionCaptured, true)
  assert.equal(result.finalAuthorApprovalReceived, false)
  assert.equal(result.awaitingStateClosed, false)
  assert.equal(result.stageCloseEligible, false)
  assert.equal(result.nextStageEligible, false)
  assert.equal(result.revisionLoopRequired, true)
  assert.equal(result.protectedCloseout, 'NOT_APPLICABLE')
  assert.equal(result.eligibleNextState, null)
  assert.equal(result.titleStateMutations, 0)
  assert.equal(result.proposedEvidenceMutations.some((mutation) => mutation.fields.includes('jm1pub_awaitingsince:null')), false)
})

test('3. I have questions records decision/state appropriately', async () => {
  const result = await run({ reply: { body: 'I have questions' } })
  assert.equal(result.status, 'PASS')
  assert.equal(result.decision, 'QUESTIONS')
  assert.equal(result.authorDecisionCaptured, true)
  assert.equal(result.finalAuthorApprovalReceived, false)
  assert.equal(result.awaitingStateClosed, false)
  assert.equal(result.stageCloseEligible, false)
  assert.equal(result.protectedCloseout, 'NOT_APPLICABLE')
})

test('4. Ambiguous reply fails closed to review required', async () => {
  const result = await run({ reply: { body: 'This is fine but wait maybe' } })
  assert.equal(result.status, 'HOLD')
  assert.equal(result.decision, 'REVIEW_REQUIRED')
  assert.match(result.blockers.join(';'), /AMBIGUOUS_REPLY_REVIEW_REQUIRED/)
})

test('5. Duplicate reply creates one decision and remains idempotent', async () => {
  const firstInput = input()
  const idempotencyKey = buildAuthorDecisionPropagationIdempotencyKey(firstInput)
  const result = await propagateAuthorDecisionEvidence({
    ...firstInput,
    priorState: { decisions: [{ idempotencyKey, decision: 'APPROVED' }] },
  })
  assert.equal(result.status, 'PASS')
  assert.equal(result.duplicateAuthorDecisions, 0)
  assert.equal(result.proposedEvidenceMutations.some((mutation) => mutation.fields.includes('jm1pub_authordecision')), false)
})

test('6. Reply for wrong title produces no state change', async () => {
  const result = await run({ reply: { titleId: 'wrong-title' } })
  assert.equal(result.status, 'HOLD')
  assert.match(result.blockers.join(';'), /WRONG_TITLE_REPLY_REVIEW_REQUIRED/)
  assert.equal(result.authorDecisionCaptured, false)
})

test('7. Reply for wrong package produces no state change', async () => {
  const result = await run({ reply: { packageId: 'wrong-package' } })
  assert.equal(result.status, 'HOLD')
  assert.match(result.blockers.join(';'), /WRONG_PACKAGE_REPLY_REVIEW_REQUIRED/)
})

test('8. Approved artifact registers with checksum', async () => {
  const result = await run()
  assert.equal(result.approvedArtifactRegistered, true)
  assert.equal(result.checksumRegistered, true)
  assert.equal(result.proposedEvidenceMutations.some((mutation) => mutation.entity === 'jm1pub_editorialartifact'), true)
})

test('9. Wrong artifact checksum holds', async () => {
  const result = await run({ artifacts: [baseArtifact({ sha256: 'wrong' })] })
  assert.equal(result.status, 'HOLD')
  assert.match(result.blockers.join(';'), /APPROVED_ARTIFACT_CHECKSUM_MISMATCH/)
})

test('10. Multiple candidate artifacts hold', async () => {
  const result = await run({
    artifacts: [baseArtifact(), baseArtifact({ artifactId: 'second-candidate' })],
    reviewRequest: { requiredArtifactIds: ['intentional-leader-final-pagination-corrected-proof-2026-08-03-v1', 'second-candidate'] },
  })
  assert.equal(result.status, 'HOLD')
  assert.match(result.blockers.join(';'), /MULTIPLE_CANDIDATE_ARTIFACTS_REVIEW_REQUIRED/)
})

test('11. Awaiting state closes only for matching review request', async () => {
  const result = await run({ gates: [baseGate({ gateId: 'wrong-gate' })] })
  assert.equal(result.status, 'HOLD')
  assert.equal(result.awaitingStateClosed, false)
  assert.match(result.blockers.join(';'), /AWAITING_GATE_NOT_FOUND_FOR_REVIEW_REQUEST/)
})

test('12. Protected closeout reevaluates after evidence propagation', async () => {
  const result = await run()
  assert.equal(result.protectedCloseoutReevaluated, true)
  assert.equal(result.protectedCloseout, 'PASS')
})

test('13. Closeout surfaces Cover Design as eligible', async () => {
  const result = await run()
  assert.equal(result.eligibleNextState, 'Cover Design')
  assert.equal(result.operatorSurface.nextEligibleState, 'Cover Design')
})

test('14. No title-state mutation occurs automatically', async () => {
  const result = await run()
  assert.equal(result.titleStateMutations, 0)
  assert.equal(result.proposedEvidenceMutations.some((mutation) => mutation.entity === 'jm1pub_editorialstage'), false)
})

test('15. No author communication is generated', async () => {
  const result = await run()
  assert.equal(result.authorCommunications, 0)
})

test('16. No marketing action occurs', async () => {
  const result = await run()
  assert.equal(result.marketingActions, 0)
})

test('17. No distribution action occurs', async () => {
  const result = await run()
  assert.equal(result.distributionActions, 0)
})

test('18. No financial action occurs', async () => {
  const result = await run()
  assert.equal(result.financialActions, 0)
})

test('19. Retry after transient failure is idempotent', async () => {
  const first = await run({ artifacts: [baseArtifact({ sha256: undefined })] })
  assert.equal(first.status, 'HOLD')
  const second = await run()
  assert.equal(second.status, 'PASS')
  const thirdInput = input()
  const idempotencyKey = buildAuthorDecisionPropagationIdempotencyKey(thirdInput)
  const third = await propagateAuthorDecisionEvidence({
    ...thirdInput,
    priorState: {
      decisions: [{ idempotencyKey, decision: 'APPROVED' }],
      registeredArtifacts: [{ artifactId: baseArtifact().artifactId, sha256: approvedChecksum }],
    },
  })
  assert.equal(third.status, 'PASS')
  assert.equal(third.duplicateArtifactRecords, 0)
  assert.equal(third.duplicateChecksums, 0)
})

test('20. Duplicate mailbox ingestion remains idempotent', async () => {
  const firstInput = input()
  const idempotencyKey = buildAuthorDecisionPropagationIdempotencyKey(firstInput)
  const duplicate = await propagateAuthorDecisionEvidence({
    ...firstInput,
    priorState: { decisions: [{ idempotencyKey, decision: 'APPROVED' }] },
  })
  assert.equal(duplicate.status, 'PASS')
  assert.equal(duplicate.duplicateCloseoutEvents, 0)
})

test('concurrency: author reply before artifact registration then retry with artifact is deterministic', async () => {
  const beforeArtifact = await run({ artifacts: [] })
  assert.equal(beforeArtifact.status, 'HOLD')
  assert.match(beforeArtifact.blockers.join(';'), /APPROVED_ARTIFACT_NOT_FOUND/)
  const afterArtifact = await run()
  assert.equal(afterArtifact.status, 'PASS')
  assert.equal(afterArtifact.protectedCloseout, 'PASS')
})

test('concurrency: artifact checksum before decision ingestion is deterministic', async () => {
  const result = await run({ reply: { receivedAt: '2026-08-03T11:09:00Z' } })
  assert.equal(result.status, 'PASS')
  assert.equal(result.checksumRegistered, true)
})

test('concurrency: decision arrives after awaiting poll and closes only matching state', async () => {
  const result = await run({ gates: [baseGate(), baseGate({ gateId: 'other-gate', awaitingSince: '2026-08-03T11:04:00Z' })] })
  assert.equal(result.status, 'PASS')
  assert.equal(result.awaitingStateClosed, true)
})

test('historical The Intentional Leader shadow replay passes without title mutation', async () => {
  const result = await run()
  assert.equal(result.status, 'PASS')
  assert.equal(result.decision, 'APPROVED')
  assert.equal(result.awaitingStateClosed, true)
  assert.equal(result.approvedArtifactRegistered, true)
  assert.equal(result.checksumRegistered, true)
  assert.equal(result.protectedCloseout, 'PASS')
  assert.equal(result.eligibleNextState, 'Cover Design')
  assert.equal(result.titleStateMutations, 0)
})

test('conditional approval keeps author-required stage open after Publishing Team implementation', async () => {
  const result = await run({ reply: { body: 'Approved with corrections' } })
  assert.equal(result.authorDecisionCaptured, true)
  assert.equal(result.finalAuthorApprovalReceived, false)
  assert.equal(result.awaitingStateClosed, false)
  assert.equal(result.stageCloseEligible, false)
  assert.equal(result.nextStageEligible, false)
  assert.match(result.approvalGateBlockers.join(','), /FINAL_AUTHOR_APPROVAL_NOT_RECEIVED/)
})

test('approval of an older artifact version cannot approve current stage artifact', async () => {
  const result = await run({ reviewRequest: { currentArtifactVersion: 'materially-revised-v2' } })
  assert.equal(result.status, 'HOLD')
  assert.equal(result.decision, 'APPROVED')
  assert.equal(result.finalAuthorApprovalReceived, true)
  assert.equal(result.stageCloseEligible, false)
  assert.equal(result.nextStageEligible, false)
  assert.match(result.approvalGateBlockers.join(','), /APPROVAL_ARTIFACT_VERSION_MISMATCH/)
  assert.equal(result.protectedCloseoutReevaluated, false)
})
