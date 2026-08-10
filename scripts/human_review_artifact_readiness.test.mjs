import assert from 'node:assert/strict'
import test from 'node:test'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const readiness = jiti('../lib/server/human-review-artifact-readiness.ts')

const {
  evaluateHumanReviewReadiness,
  determineCoverDesignTruth,
  reviewReadinessDefinitions,
  REVIEW_READINESS_CONTRACT_VERSION,
} = readiness

const titleId = 'e797232b-da7a-f111-ab0f-00224820105b'

function brief(overrides = {}) {
  return {
    id: 'cover-brief',
    titleId,
    name: 'Cover Creative Brief - The Intentional Leader.md',
    artifactClass: 'BRIEF',
    reviewType: 'COVER_REVIEW',
    state: 'READY_FOR_REVIEW',
    governedReference: '01_Titles/06_Production/02_Cover-Design/JMP-INT-202607-0W5PTQ/Creative Brief/Cover Creative Brief.md',
    checksum: 'brief-checksum',
    reviewerAccess: true,
    visualReviewable: false,
    current: true,
    ...overrides,
  }
}

function evidence(overrides = {}) {
  return {
    id: 'evidence-package',
    titleId,
    name: '2026-07-19-The-Intentional-Leader-Cover-Concept-Development-Package.md',
    artifactClass: 'EVIDENCE_ARTIFACT',
    reviewType: 'COVER_REVIEW',
    state: 'READY_FOR_REVIEW',
    governedReference: 'docs/operations/generated/2026-07-19-The-Intentional-Leader-Cover-Concept-Development-Package.md',
    checksum: 'b5d07e546b105b22c26b658fef44f96d09c77d4aad05c983e9645ccff59364a2',
    reviewerAccess: true,
    visualReviewable: false,
    current: true,
    ...overrides,
  }
}

function visual(overrides = {}) {
  return {
    id: 'cover-concept-001',
    titleId,
    name: 'The Intentional Leader - Cover Concept 001.pdf',
    artifactClass: 'REVIEW_ARTIFACT',
    reviewType: 'COVER_REVIEW',
    state: 'READY_FOR_REVIEW',
    governedReference:
      '01_Titles/06_Production/02_Cover-Design/JMP-INT-202607-0W5PTQ - Jackie Smith Jr - The Intentional Leader/Concepts/Internal Review/The Intentional Leader - Cover Concept 001.pdf',
    checksum: 'cover-concept-checksum',
    version: 'v1',
    reviewerAccess: true,
    visualReviewable: true,
    current: true,
    ...overrides,
  }
}

function input(overrides = {}) {
  return {
    titleId,
    title: 'The Intentional Leader',
    reviewType: 'COVER_REVIEW',
    assignedReviewer: 'Jackie',
    decisionRequest: 'Accept the internal cover direction, request revisions, or hold.',
    artifacts: [visual()],
    ...overrides,
  }
}

function run(overrides = {}) {
  return evaluateHumanReviewReadiness(input(overrides))
}

test('contract version and review definitions cover the governed human gates', () => {
  assert.equal(REVIEW_READINESS_CONTRACT_VERSION, 'HUMAN_REVIEW_ARTIFACT_READINESS_V1')
  assert.deepEqual(Object.keys(reviewReadinessDefinitions).sort(), [
    'COVER_REVIEW',
    'DISTRIBUTION_FILE_QA',
    'EDITORIAL_ARTIFACT_REVIEW',
    'INTERIOR_REVIEW',
    'MARKETING_CREATIVE_REVIEW',
    'PROOF_REVIEW',
  ].sort())
})

test('1. Creative brief exists, no cover concept blocks INTERNAL REVIEW', () => {
  const result = run({ artifacts: [brief()] })
  assert.equal(result.status, 'REVIEW_ARTIFACT_NOT_READY')
  assert.match(result.blockers.join(';'), /REVIEW_ARTIFACT_MISSING/)
  assert.match(result.blockers.join(';'), /REVIEW_ARTIFACT_WRONG_CLASS/)
  assert.equal(result.artifactCounts.briefs, 1)
})

test('2. Concept-development Markdown package exists, no visual concept blocks', () => {
  const result = run({ artifacts: [evidence()] })
  assert.equal(result.status, 'REVIEW_ARTIFACT_NOT_READY')
  assert.match(result.blockers.join(';'), /REVIEW_ARTIFACT_MISSING/)
  assert.equal(result.artifactCounts.evidenceArtifacts, 1)
})

test('3. Visual concept exists but wrong title blocks', () => {
  const result = run({ artifacts: [visual({ titleId: 'wrong-title' })] })
  assert.equal(result.status, 'REVIEW_ARTIFACT_NOT_READY')
  assert.match(result.blockers.join(';'), /REVIEW_ARTIFACT_WRONG_TITLE/)
})

test('4. Visual concept exists but superseded blocks', () => {
  const result = run({ artifacts: [visual({ state: 'SUPERSEDED' })] })
  assert.equal(result.status, 'REVIEW_ARTIFACT_NOT_READY')
  assert.match(result.blockers.join(';'), /REVIEW_ARTIFACT_SUPERSEDED/)
})

test('5. Visual concept exists but no governed reference blocks', () => {
  const result = run({ artifacts: [visual({ governedReference: '' })] })
  assert.equal(result.status, 'REVIEW_ARTIFACT_NOT_READY')
  assert.match(result.blockers.join(';'), /REVIEW_ARTIFACT_GOVERNED_REFERENCE_MISSING/)
})

test('6. Visual concept exists but reviewer cannot access blocks', () => {
  const result = run({ artifacts: [visual({ reviewerAccess: false })] })
  assert.equal(result.status, 'REVIEW_ARTIFACT_NOT_READY')
  assert.equal(result.reviewerAccessGate, 'FAIL')
  assert.match(result.blockers.join(';'), /REVIEWER_ACCESS_NOT_VERIFIED/)
})

test('7. Visual concept exists and all requirements pass', () => {
  const result = run()
  assert.equal(result.status, 'INTERNAL_REVIEW_ELIGIBLE')
  assert.equal(result.eligible, true)
  assert.equal(result.selectedArtifact.id, 'cover-concept-001')
})

test('8. Reviewer-access link/reference resolves correctly', () => {
  const result = run()
  assert.equal(result.reviewerAccessGate, 'PASS')
  assert.match(result.selectedArtifact.governedReference, /^01_Titles\/06_Production\/02_Cover-Design/)
})

test('9. Brief cannot masquerade as review artifact', () => {
  const result = run({ artifacts: [brief({ visualReviewable: true })] })
  assert.equal(result.eligible, false)
  assert.match(result.blockers.join(';'), /REVIEW_ARTIFACT_WRONG_CLASS/)
})

test('10. Evidence artifact cannot masquerade as review artifact', () => {
  const result = run({ artifacts: [evidence({ reviewerAccess: true, visualReviewable: true })] })
  assert.equal(result.eligible, false)
  assert.match(result.blockers.join(';'), /REVIEW_ARTIFACT_WRONG_CLASS/)
})

test('11. Duplicate review artifacts produce hold/review-required', () => {
  const result = run({ artifacts: [visual(), visual({ id: 'cover-concept-002', name: 'The Intentional Leader - Cover Concept 002.pdf' })] })
  assert.equal(result.status, 'REVIEW_ARTIFACT_NOT_READY')
  assert.match(result.blockers.join(';'), /DUPLICATE_REVIEW_ARTIFACTS_REVIEW_REQUIRED/)
})

test('12. Correct review artifact preserves checksum/version', () => {
  const result = run()
  assert.equal(result.selectedArtifact.checksum, 'cover-concept-checksum')
  assert.equal(result.selectedArtifact.version, 'v1')
})

test('13. Entry to internal review records assigned reviewer', () => {
  const result = run()
  assert.equal(result.assignedReviewer, 'Jackie')
})

test('14. Entry defines the human decision required', () => {
  const result = run()
  assert.equal(result.decisionRequestDefined, true)
})

test('15. No artwork is generated merely by readiness evaluation', () => {
  const result = run({ artifacts: [brief()] })
  assert.equal(result.sideEffects.artworkGenerated, 0)
})

test('16. No author communication is sent', () => {
  const result = run()
  assert.equal(result.sideEffects.authorCommunications, 0)
})

test('17. No marketing activation occurs', () => {
  const result = run()
  assert.equal(result.sideEffects.marketingActivations, 0)
})

test('18. No financial/distribution activity occurs', () => {
  const result = run()
  assert.equal(result.sideEffects.financialActivity, 0)
  assert.equal(result.sideEffects.distributionActivity, 0)
})

test('19. Retry is idempotent', () => {
  const first = run({ artifacts: [brief()] })
  const second = run({ artifacts: [brief()] })
  assert.deepEqual(second, first)
})

test('20. Corrective rollback from falsely-ready review state preserves execution lineage', () => {
  const result = run({ artifacts: [evidence()] })
  const truth = determineCoverDesignTruth(result)
  assert.equal(truth.internalReviewCurrentlyValid, false)
  assert.equal(truth.correctState, 'CREATIVE BRIEF COMPLETE / CONCEPT PRODUCTION REQUIRED')
  assert.match(truth.nextBoundedPilotAction, /REQUIRES SEPARATE JACKIE AUTHORIZATION/)
})

test('current The Intentional Leader reality check is not review-ready without visual artifact', () => {
  const result = run({ artifacts: [brief(), evidence()] })
  assert.equal(result.status, 'REVIEW_ARTIFACT_NOT_READY')
  assert.equal(result.eligible, false)
  assert.deepEqual(result.rootCauses.sort(), [
    'ARTIFACT_TYPE_MODEL_GAP',
    'REVIEW_READINESS_GATE_GAP',
  ].sort())
  const truth = determineCoverDesignTruth(result)
  assert.equal(truth.internalReviewCurrentlyValid, false)
})
