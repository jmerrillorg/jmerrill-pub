import assert from 'node:assert/strict'
import { existsSync, readFileSync, symlinkSync, unlinkSync } from 'node:fs'
import test, { after } from 'node:test'

const shims = [
  ['../lib/publishing/lifecycle/registry', 'registry.ts'],
  ['../lib/publishing/lifecycle/validation', 'validation.ts'],
  ['../lib/publishing/lifecycle/legacy-mapping', 'legacy-mapping.ts'],
]
const created = []
for (const [shimPath, target] of shims) {
  const shim = new URL(shimPath, import.meta.url)
  if (!existsSync(shim)) {
    symlinkSync(target, shim)
    created.push(shim)
  }
}
after(() => {
  for (const shim of created) unlinkSync(shim)
})

const registryModule = await import('../lib/publishing/lifecycle/registry.ts')
const validation = await import('../lib/publishing/lifecycle/validation.ts')
const legacy = await import('../lib/publishing/lifecycle/legacy-mapping.ts')

const {
  JMP_PUBLISHING_LIFECYCLE_METADATA,
  JMP_PUBLISHING_LIFECYCLE_REGISTRY,
  JMP_PUBLISHING_LIFECYCLE_VERSION,
  WAITING_OWNERS,
  flattenSubstages,
} = registryModule

function artifact(artifactType, overrides = {}) {
  return {
    artifactId: overrides.artifactId || `artifact-${artifactType}`,
    artifactType,
    checksum: overrides.checksum || `sha-${artifactType}`,
    version: overrides.version || 'v1',
    certificationState: overrides.certificationState || 'CERTIFIED',
    approvalState: overrides.approvalState || 'APPROVED',
  }
}

function approval(artifactEvidence, overrides = {}) {
  return {
    decisionMaker: 'Author',
    decision: 'APPROVE',
    channel: overrides.channel || 'email',
    occurredOn: '2026-08-21',
    recordedBy: 'Publisher',
    artifactId: artifactEvidence.artifactId,
    artifactChecksum: artifactEvidence.checksum,
    artifactVersion: artifactEvidence.version,
    titleId: 'title-1',
    gateId: 'gate-1',
    nextStageAuthorization: true,
    replayKey: overrides.replayKey,
    ...overrides,
  }
}

test('registry declares one intentionally versioned lifecycle authority', () => {
  assert.equal(JMP_PUBLISHING_LIFECYCLE_VERSION, 'JMP_PUBLISHING_LIFECYCLE_v1.0')
  assert.equal(JMP_PUBLISHING_LIFECYCLE_METADATA.lifecycleVersion, JMP_PUBLISHING_LIFECYCLE_VERSION)
  assert.match(JMP_PUBLISHING_LIFECYCLE_METADATA.changeAcknowledgment, /JMP_PUBLISHING_LIFECYCLE_v1\.0/)
  assert.equal(JMP_PUBLISHING_LIFECYCLE_METADATA.approvalAuthority, 'Founder / Publisher policy authority')
})

test('all 10 founder-approved stages exist exactly once with valid sequence', () => {
  assert.equal(JMP_PUBLISHING_LIFECYCLE_REGISTRY.length, 10)
  assert.deepEqual(
    JMP_PUBLISHING_LIFECYCLE_REGISTRY.map((stage) => stage.stageSequence),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  )
  assert.deepEqual(
    JMP_PUBLISHING_LIFECYCLE_REGISTRY.map((stage) => stage.stageCode),
    [
      'INQUIRY_INTAKE',
      'CLASSIFICATION',
      'EDITORIAL_REVIEW_RECOMMENDATION',
      'COMMERCIAL_ACTIVATION',
      'AUTHOR_ONBOARDING',
      'EDITORIAL_PRODUCTION',
      'BOOK_PRODUCTION',
      'DISTRIBUTION_READINESS',
      'DISTRIBUTION_RELEASE',
      'POST_PUBLICATION',
    ],
  )
})

test('stage codes are unique and substage codes are unique within their governed context', () => {
  const stages = JMP_PUBLISHING_LIFECYCLE_REGISTRY.map((stage) => stage.stageCode)
  assert.equal(new Set(stages).size, stages.length)
  for (const stage of JMP_PUBLISHING_LIFECYCLE_REGISTRY) {
    const substages = stage.substages.map((substage) => substage.substageCode)
    assert.equal(new Set(substages).size, substages.length, `${stage.stageCode} has duplicate substage codes`)
  }
})

test('every canonical stage and substage has universal contract fields', () => {
  for (const stage of JMP_PUBLISHING_LIFECYCLE_REGISTRY) {
    assert.ok(stage.contract.entryConditions.length, `${stage.stageCode} entry condition missing`)
    assert.ok(stage.contract.sourceOfTruth.length, `${stage.stageCode} source of truth missing`)
    assert.ok(stage.contract.workDefinition, `${stage.stageCode} work definition missing`)
    assert.ok(stage.contract.qualityGate, `${stage.stageCode} quality gate missing`)
    assert.ok(stage.contract.exitConditions.length, `${stage.stageCode} exit contract missing`)
    assert.ok(stage.contract.allowedWaitingOwners.length, `${stage.stageCode} waiting owner missing`)
  }
  for (const { substage } of flattenSubstages()) {
    assert.ok(substage.contract.entryConditions.length, `${substage.substageCode} entry condition missing`)
    assert.ok(substage.contract.sourceOfTruth.length, `${substage.substageCode} source of truth missing`)
    assert.ok(substage.contract.workDefinition, `${substage.substageCode} work definition missing`)
    assert.ok(substage.contract.qualityGate, `${substage.substageCode} quality gate missing`)
    assert.ok(substage.contract.exitConditions.length, `${substage.substageCode} exit contract missing`)
  }
})

test('pre-contract Editorial Review and active title Editorial Production are distinct canonical meanings', () => {
  const prospect = legacy.mapLegacyLifecycleValue({
    legacyAuthority: 'PackageStageCode',
    legacyValue: 'EDITORIAL_REVIEW',
    lifecycleContext: 'PROSPECT_INQUIRY',
  })
  assert.equal(prospect.resultCode, 'CANONICAL_MAPPING_CONTEXTUAL')
  assert.equal(prospect.canonicalStage, 'EDITORIAL_REVIEW_RECOMMENDATION')
  assert.equal(prospect.canonicalSubstage, 'PRE_CONTRACT_EDITORIAL_REVIEW')

  const activeAuthor = legacy.mapLegacyLifecycleValue({
    legacyAuthority: 'PackageStageCode',
    legacyValue: 'EDITORIAL_REVIEW',
    lifecycleContext: 'ACTIVE_CONTRACTED_AUTHOR',
  })
  assert.equal(activeAuthor.resultCode, 'CANONICAL_MAPPING_CONFLICT')
  assert.equal(activeAuthor.mappingType, 'CONFLICT')
})

test('known sequencing rules allow Developmental approval to Line when Developmental applies', () => {
  const result = validation.validateTransition({
    fromStage: 'EDITORIAL_PRODUCTION',
    fromSubstage: 'DEVELOPMENTAL_AUTHOR_REVIEW',
    toStage: 'EDITORIAL_PRODUCTION',
    toSubstage: 'LINE_EDITING',
    titleScope: { substageApplicability: { DEVELOPMENTAL_EDITING: 'APPLICABLE_REQUIRED' } },
    artifacts: [artifact('APPROVED_DEVELOPMENTAL_ARTIFACT')],
    completedSubstages: ['DEVELOPMENTAL_AUTHOR_REVIEW'],
  })
  assert.equal(result.ok, true)
})

test('applicability permits Starter path to omit Developmental without illegal skip', () => {
  const result = validation.validateTransition({
    fromStage: 'EDITORIAL_PRODUCTION',
    toStage: 'EDITORIAL_PRODUCTION',
    toSubstage: 'LINE_EDITING',
    titleScope: { substageApplicability: { DEVELOPMENTAL_EDITING: 'NOT_APPLICABLE', LINE_EDITING: 'APPLICABLE_REQUIRED' } },
    artifacts: [],
  })
  assert.equal(result.ok, true)
})

test('when Developmental applies, Line is denied without approved Developmental artifact', () => {
  const result = validation.validateTransition({
    fromStage: 'EDITORIAL_PRODUCTION',
    toStage: 'EDITORIAL_PRODUCTION',
    toSubstage: 'LINE_EDITING',
    titleScope: { substageApplicability: { DEVELOPMENTAL_EDITING: 'APPLICABLE_REQUIRED' } },
    artifacts: [],
  })
  assert.equal(result.ok, false)
  assert.equal(result.code, 'REQUIRED_ARTIFACT_MISSING')
  assert.match(result.reason, /approved Developmental artifact/)
})

test('Line Approval to Copy is valid when approved Line artifact exists', () => {
  const result = validation.validateTransition({
    fromStage: 'EDITORIAL_PRODUCTION',
    fromSubstage: 'LINE_AUTHOR_REVIEW',
    toStage: 'EDITORIAL_PRODUCTION',
    toSubstage: 'COPYEDITING',
    titleScope: { substageApplicability: { LINE_EDITING: 'APPLICABLE_REQUIRED', COPYEDITING: 'APPLICABLE_REQUIRED' } },
    artifacts: [artifact('APPROVED_LINE_ARTIFACT')],
    completedSubstages: ['LINE_AUTHOR_REVIEW'],
  })
  assert.equal(result.ok, true)
})

test('Copy Approval to Layout is valid, but Copy to Proof without Layout is rejected', () => {
  const layout = validation.validateTransition({
    fromStage: 'EDITORIAL_PRODUCTION',
    fromSubstage: 'COPY_AUTHOR_REVIEW',
    toStage: 'BOOK_PRODUCTION',
    toSubstage: 'INTERIOR_LAYOUT',
    artifacts: [artifact('APPROVED_COPY_ARTIFACT')],
    completedSubstages: ['COPY_AUTHOR_REVIEW'],
  })
  assert.equal(layout.ok, true)

  const proof = validation.validateTransition({
    fromStage: 'EDITORIAL_PRODUCTION',
    fromSubstage: 'COPY_AUTHOR_REVIEW',
    toStage: 'BOOK_PRODUCTION',
    toSubstage: 'PROOFREADING',
    artifacts: [artifact('APPROVED_COPY_ARTIFACT')],
  })
  assert.equal(proof.ok, false)
  assert.equal(proof.code, 'INVALID_TRANSITION')
  assert.match(proof.reason, /without Layout/)
})

test('Proof before Layout and Proof to Layout are invalid', () => {
  const noLayout = validation.validateTransition({
    fromStage: 'EDITORIAL_PRODUCTION',
    fromSubstage: 'COPY_AUTHOR_REVIEW',
    toStage: 'BOOK_PRODUCTION',
    toSubstage: 'PROOFREADING',
  })
  assert.equal(noLayout.ok, false)
  assert.equal(noLayout.code, 'INVALID_TRANSITION')

  const backward = validation.validateTransition({
    fromStage: 'BOOK_PRODUCTION',
    fromSubstage: 'PROOFREADING',
    toStage: 'BOOK_PRODUCTION',
    toSubstage: 'INTERIOR_LAYOUT',
  })
  assert.equal(backward.ok, false)
  assert.equal(backward.code, 'INVALID_TRANSITION')
})

test('Proof to Final Author Approval requires a valid author gate bound to proof artifact', () => {
  const proof = artifact('PROOF_ARTIFACT')
  const valid = validation.validateTransition({
    fromStage: 'BOOK_PRODUCTION',
    fromSubstage: 'PROOFREADING',
    toStage: 'BOOK_PRODUCTION',
    toSubstage: 'FINAL_AUTHOR_APPROVAL',
    artifacts: [proof],
    humanGate: approval(proof, { channel: 'phone/verbal' }),
  })
  assert.equal(valid.ok, true)

  const wrongArtifact = validation.validateTransition({
    fromStage: 'BOOK_PRODUCTION',
    fromSubstage: 'PROOFREADING',
    toStage: 'BOOK_PRODUCTION',
    toSubstage: 'FINAL_AUTHOR_APPROVAL',
    artifacts: [proof],
    humanGate: approval(artifact('PROOF_ARTIFACT', { artifactId: 'older-proof' })),
  })
  assert.equal(wrongArtifact.ok, false)
  assert.equal(wrongArtifact.code, 'REQUIRED_AUTHOR_GATE_MISSING')

  const ambiguous = validation.validateTransition({
    fromStage: 'BOOK_PRODUCTION',
    fromSubstage: 'PROOFREADING',
    toStage: 'BOOK_PRODUCTION',
    toSubstage: 'FINAL_AUTHOR_APPROVAL',
    artifacts: [proof],
    humanGate: approval(proof, { decision: 'AMBIGUOUS' }),
  })
  assert.equal(ambiguous.ok, false)
})

test('Final Author Approval to Production Finalization requires final interior and completed approval', () => {
  const ok = validation.validateTransition({
    fromStage: 'BOOK_PRODUCTION',
    fromSubstage: 'FINAL_AUTHOR_APPROVAL',
    toStage: 'BOOK_PRODUCTION',
    toSubstage: 'PRODUCTION_FINALIZATION',
    artifacts: [artifact('FINAL_INTERIOR')],
    completedSubstages: ['FINAL_AUTHOR_APPROVAL'],
  })
  assert.equal(ok.ok, true)

  const missingApproval = validation.validateTransition({
    fromStage: 'BOOK_PRODUCTION',
    fromSubstage: 'FINAL_AUTHOR_APPROVAL',
    toStage: 'BOOK_PRODUCTION',
    toSubstage: 'PRODUCTION_FINALIZATION',
    artifacts: [artifact('FINAL_INTERIOR')],
  })
  assert.equal(missingApproval.ok, false)
  assert.equal(missingApproval.code, 'REQUIRED_STAGE_NOT_COMPLETE')
})

test('Distribution requested without certified production/distribution artifact is rejected', () => {
  const result = validation.validateTransition({
    fromStage: 'DISTRIBUTION_READINESS',
    toStage: 'DISTRIBUTION_RELEASE',
    toSubstage: 'DISTRIBUTOR_SUBMISSION',
  })
  assert.equal(result.ok, false)
  assert.equal(result.code, 'REQUIRED_ARTIFACT_MISSING')
})

test('commercial and relationship boundaries define Joined the Family exactly once', () => {
  assert.equal(validation.evaluateJoinedFamily(['PACKAGE_ACCEPTED']).joined, false)
  assert.equal(validation.evaluateJoinedFamily(['AGREEMENT_EXECUTED']).joined, false)
  assert.equal(validation.evaluateJoinedFamily(['INITIAL_PAYMENT_RECEIVED']).joined, false)
  assert.equal(validation.evaluateJoinedFamily(['AGREEMENT_EXECUTED', 'INITIAL_PAYMENT_RECEIVED']).joined, true)
  assert.equal(validation.evaluateJoinedFamily(['JOINED_THE_FAMILY']).joined, false)
  assert.equal(validation.evaluateJoinedFamily(['INITIAL_PAYMENT_RECEIVED', 'PAID_IN_FULL']).joined, false)
})

test('valid separate lifecycle dimension combinations can coexist', () => {
  for (const combo of [
    { commercial: 'PACKAGE_ACCEPTED', titleStage: 'INQUIRY_INTAKE', relationship: 'PROSPECT' },
    { commercial: 'PAYMENT_PLAN_ACTIVE', titleStage: 'EDITORIAL_PRODUCTION', titleSubstage: 'LINE_EDITING', relationship: 'ACTIVE_AUTHOR' },
    { relationship: 'RETURNING_AUTHOR', titleStage: 'POST_PUBLICATION' },
    { relationship: 'RETURNING_AUTHOR', titleStage: 'EDITORIAL_PRODUCTION', titleSubstage: 'COPYEDITING' },
    { relationship: 'RETURNING_AUTHOR', titleStage: 'INQUIRY_INTAKE' },
  ]) {
    assert.equal(validation.validateLifecycleStateCombination(combo).ok, true)
  }
})

test('Waiting On values validate and System Attention remains independent', () => {
  assert.deepEqual(WAITING_OWNERS, ['Prospect', 'Author', 'JMP', 'JMP/System', 'External'])
  assert.equal(validation.validateWaitingOwner('Publisher').ok, false)
  assert.equal(validation.validateWaitingOwner('JMP/System').ok, true)
  assert.equal(
    validation.validateWaitingOwnerAndSystemAttention({ waitingOn: 'Author', systemAttention: 'NONE' }).ok,
    true,
  )
  assert.equal(
    validation.validateWaitingOwnerAndSystemAttention({ waitingOn: 'Prospect', systemAttention: 'AUTHOR_ACK_FAILED' }).ok,
    true,
  )
  assert.equal(
    validation.validateWaitingOwnerAndSystemAttention({ waitingOn: 'JMP/System', systemAttention: 'FOUNDRY_PROVIDER_BACKPRESSURE' }).ok,
    true,
  )
})

test('Stage 10 remains persistent and workstreams do not return title to Stage 09', () => {
  for (const event of ['ROYALTY_EVENT', 'METADATA_UPDATE', 'SALES_IMPORT', 'MARKETING_OPPORTUNITY']) {
    const result = validation.validateStage10Workstream(event)
    assert.equal(result.ok, true)
    assert.match(result.reason, /POST_PUBLICATION/)
  }
  const transition = validation.validateTransition({
    fromStage: 'POST_PUBLICATION',
    toStage: 'DISTRIBUTION_RELEASE',
  })
  assert.equal(transition.ok, false)
  assert.equal(transition.code, 'INVALID_TRANSITION')
})

test('parallel preparatory work is allowed but full wrap dependency fails without final interior', () => {
  assert.equal(
    validation.validateParallelPreparatoryWork({
      titleStage: 'EDITORIAL_PRODUCTION',
      activities: ['COVER_CONCEPT', 'METADATA_DRAFT'],
    }).ok,
    true,
  )
  const failed = validation.validateParallelPreparatoryWork({
    titleStage: 'EDITORIAL_PRODUCTION',
    activities: ['FULL_WRAP_FINALIZED'],
  })
  assert.equal(failed.ok, false)
  assert.equal(failed.code, 'REQUIRED_ARTIFACT_MISSING')
})

test('legacy mapping inventory is testable and distinguishes exact, contextual, conflict, and unmapped values', () => {
  const exact = legacy.mapLegacyLifecycleValue({ legacyAuthority: 'PackageStageCode', legacyValue: 'LINE_EDITING' })
  assert.equal(exact.resultCode, 'CANONICAL_MAPPING_EXACT')
  assert.equal(exact.canonicalSubstage, 'LINE_EDITING')

  const contextual = legacy.mapLegacyLifecycleValue({ legacyAuthority: 'PackageStageCode', legacyValue: 'COVER_DESIGN' })
  assert.equal(contextual.resultCode, 'CANONICAL_MAPPING_CONTEXTUAL')

  const conflict = legacy.mapLegacyLifecycleValue({ legacyAuthority: 'PackageStageCode', legacyValue: 'EDITORIAL_REVIEW' })
  assert.equal(conflict.resultCode, 'CANONICAL_MAPPING_CONFLICT')

  const unmapped = legacy.mapLegacyLifecycleValue({ legacyAuthority: 'Unknown Runtime', legacyValue: 'RANDOM_STATUS' })
  assert.equal(unmapped.resultCode, 'CANONICAL_MAPPING_INCOMPLETE')
})

test('Phase 1 P0 proofs are prevented by canonical authority', () => {
  assert.equal(
    validation.validateTransition({
      fromStage: 'INQUIRY_INTAKE',
      toStage: 'BOOK_PRODUCTION',
      toSubstage: 'PRODUCTION_FINALIZATION',
    }).ok,
    false,
  )
  assert.equal(
    legacy.mapLegacyLifecycleValue({ legacyAuthority: 'PackageStageCode', legacyValue: 'EDITORIAL_REVIEW' }).resultCode,
    'CANONICAL_MAPPING_CONFLICT',
  )
  assert.equal(
    validation.validateWaitingOwnerAndSystemAttention({ waitingOn: 'JMP/System', systemAttention: 'RUNTIME_HOLD' }).ok,
    true,
  )
})

test('human canon document and machine registry remain paired', () => {
  const canon = readFileSync(new URL('../docs/architecture/publishing/JMP_PUBLISHING_LIFECYCLE_v1.0.md', import.meta.url), 'utf8')
  assert.match(canon, /JMP_PUBLISHING_LIFECYCLE_v1\.0/)
  for (const stage of JMP_PUBLISHING_LIFECYCLE_REGISTRY) {
    assert.match(canon, new RegExp(stage.stageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})
