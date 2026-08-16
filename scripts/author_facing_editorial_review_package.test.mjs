import assert from 'node:assert/strict'
import { existsSync, readFileSync, symlinkSync, unlinkSync } from 'node:fs'
import test, { after } from 'node:test'

const notificationShim = new URL('../lib/server/author-package-notification-engine', import.meta.url)
const packageEngineShim = new URL('../lib/server/author-review-package-engine', import.meta.url)
const workingTitleShim = new URL('../lib/server/working-title-policy', import.meta.url)
const brandShim = new URL('../lib/server/author-communication-brand', import.meta.url)
const rendererShim = new URL('../lib/server/jm1-enterprise-communication-renderer', import.meta.url)
const designTokensShim = new URL('../lib/server/jm1-enterprise-design-tokens', import.meta.url)
const terminologyShim = new URL('../lib/server/author-facing-terminology', import.meta.url)
let createdNotificationShim = false
let createdPackageEngineShim = false
let createdWorkingTitleShim = false
let createdBrandShim = false
let createdRendererShim = false
let createdDesignTokensShim = false
let createdTerminologyShim = false
if (!existsSync(notificationShim)) {
  symlinkSync('author-package-notification-engine.ts', notificationShim)
  createdNotificationShim = true
}
if (!existsSync(packageEngineShim)) {
  symlinkSync('author-review-package-engine.ts', packageEngineShim)
  createdPackageEngineShim = true
}
if (!existsSync(workingTitleShim)) {
  symlinkSync('working-title-policy.ts', workingTitleShim)
  createdWorkingTitleShim = true
}
if (!existsSync(brandShim)) {
  symlinkSync('author-communication-brand.ts', brandShim)
  createdBrandShim = true
}
if (!existsSync(rendererShim)) {
  symlinkSync('jm1-enterprise-communication-renderer.ts', rendererShim)
  createdRendererShim = true
}
if (!existsSync(designTokensShim)) {
  symlinkSync('jm1-enterprise-design-tokens.ts', designTokensShim)
  createdDesignTokensShim = true
}
if (!existsSync(terminologyShim)) {
  symlinkSync('author-facing-terminology.ts', terminologyShim)
  createdTerminologyShim = true
}
after(() => {
  if (createdNotificationShim) unlinkSync(notificationShim)
  if (createdPackageEngineShim) unlinkSync(packageEngineShim)
  if (createdWorkingTitleShim) unlinkSync(workingTitleShim)
  if (createdBrandShim) unlinkSync(brandShim)
  if (createdRendererShim) unlinkSync(rendererShim)
  if (createdDesignTokensShim) unlinkSync(designTokensShim)
  if (createdTerminologyShim) unlinkSync(terminologyShim)
})

const {
  buildAuthorFacingEditorialReviewPackage,
} = await import('../lib/server/author-facing-editorial-review-package.ts')
const {
  assembleAuthorReviewPackage,
  buildNotificationInputFromPackage,
} = await import('../lib/server/author-review-package-engine.ts')
const {
  AUTHOR_PUBLISHING_COMMUNICATION_POLICY,
  validateAuthorPackageNotification,
} = await import('../lib/server/author-package-notification-engine.ts')

function input(overrides = {}) {
  return {
    titleId: 'title-atta',
    stageId: 'stage-editorial-review',
    gateId: 'gate-editorial-review',
    authorId: 'author-atta',
    authorName: 'Atta Boateng',
    titleName: 'Untitled',
    intakeReference: 'JMP-INT-202607-422JSZ',
    sourceArtifactId: 'source-stage0-artifact',
    sourceChecksum: '567a47a1c98ac2aaab5ec33b931f56c2ec0b916f12f98959e0cbc9430836d183',
    stage0DiagnosticId: 'stage0-diagnostic-atta',
    packageVersion: 'v1',
    generatedAt: '2026-08-15T11:30:00.000Z',
    reviewSummary: 'The manuscript presents a personal testimony with a clear spiritual arc and an opportunity to strengthen structure before deeper editing.',
    manuscriptStrengths: ['Clear lived experience', 'Strong faith-centered motivation', 'A direct author voice'],
    editorialOpportunities: ['Clarify chapter sequence', 'Reduce repeated setup', 'Prepare the narrative for Developmental Editing'],
    recommendedPath: 'Developmental Editing',
    stageRecommendation: 'Professional package recommended before commercial onboarding.',
    primaryPackage: 'Professional Publishing Package',
    backupPackage: 'Starter Publishing Package',
    recommendedImprint: 'J Merrill Publishing',
    importantObservations: ['The manuscript should preserve the author voice while improving flow.'],
    nextStageLabel: 'Developmental Editing',
    suggestedTitles: ['Grace in the Turning', 'A Willing Road', 'The Shape of My Yes'],
    ...overrides,
  }
}

test('author-facing Editorial Review package is shared stage logic, not Atta-specific logic', () => {
  const source = buildAuthorFacingEditorialReviewPackage.toString()
  assert.doesNotMatch(source, /Atta|Boateng|JMP-INT-202607-422JSZ/)

  const pkg = buildAuthorFacingEditorialReviewPackage(input())
  assert.equal(pkg.packageType, 'EDITORIAL_REVIEW')
  assert.equal(pkg.workspacePresentation.titleLabel, 'Working Title')
  assert.equal(pkg.workspacePresentation.displayTitle, 'Untitled')
  assert.equal(pkg.workspacePresentation.titleSelectionTask?.nonblockingForEditorialApproval, true)
  assert.equal(pkg.titleSuggestionRequest?.route.preferredModelFamily, 'CLAUDE')
  assert.equal(pkg.titleSuggestionRequest?.route.fallbackAllowed, false)
  assert.equal(pkg.titleSuggestionRequest?.requiredSuggestionCount, 3)
  assert.deepEqual(pkg.workspacePresentation.decisionOptions, [
    'SELECT_RECOMMENDED_PACKAGE',
    'SELECT_BACKUP_PACKAGE',
    'QUESTIONS_OR_CLARIFICATION_REQUESTED',
  ])
  assert.deepEqual(pkg.workspacePresentation.titleSelectionTask?.suggestedTitles, [
    'Grace in the Turning',
    'A Willing Road',
    'The Shape of My Yes',
  ])
})

test('package artifacts are author-facing and contain no internal implementation language', () => {
  const pkg = buildAuthorFacingEditorialReviewPackage(input())
  assert.deepEqual(pkg.artifacts.map((artifact) => artifact.role), [
    'assessment',
    'recommendedEditorialPath',
    'reviewInstructions',
  ])
  for (const artifact of pkg.artifacts) {
    assert.equal(artifact.authorVisible, true)
    assert.equal(artifact.canMaterializeForEmail, true)
    assert.ok(artifact.checksum)
    assert.ok(artifact.contentBytesBase64)
    const rendered = Buffer.from(artifact.contentBytesBase64 || '', 'base64').toString('utf8')
    assert.doesNotMatch(rendered, /Dataverse|execution log|workflow record|internal instruction|package manifest|response mechanism|evidence file/i)
    assert.doesNotMatch(rendered, /approve this editorial stage|approved with corrections|move to the next publishing stage|fully approve/i)
  }
})

test('generated package passes canonical package QA and notification validation', () => {
  const editorial = buildAuthorFacingEditorialReviewPackage(input())
  const pkg = assembleAuthorReviewPackage({
    packageId: 'package-editorial-review-v1',
    titleId: 'title-atta',
    authorId: 'author-atta',
    stageId: 'stage-editorial-review',
    stageCode: 'EDITORIAL_REVIEW',
    gateId: 'gate-editorial-review',
    packageVersion: 'v1',
    artifacts: editorial.artifacts,
    preparedAt: '2026-08-15T11:30:00.000Z',
    cadence: { now: '2026-08-15T11:30:00.000Z', rushAuthorized: true },
    correlationId: 'corr-editorial-review-package-test',
  })
  assert.equal(pkg.qaStatus, 'READY_INTERNAL')
  assert.equal(pkg.packageStatus, 'READY_FOR_RELEASE')
  assert.deepEqual(pkg.requiredArtifactRoles, ['assessment', 'recommendedEditorialPath', 'reviewInstructions'])

  const notification = buildNotificationInputFromPackage({
    pkg,
    recipientEmail: 'author@example.com',
    workspaceAccessLocation: 'https://jmerrill.pub/author/portal?action=review-package&titleId=title-atta',
    notificationTemplateId: 'AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1',
    attachments: editorial.artifacts,
  })
  assert.deepEqual(notification.attachments.map((attachment) => attachment.role), ['editorialMemo', 'reviewInstructions'])
  assert.equal(notification.recipientPolicy.from, AUTHOR_PUBLISHING_COMMUNICATION_POLICY.transactionalFromAddress)
  assert.equal(notification.recipientPolicy.replyTo, AUTHOR_PUBLISHING_COMMUNICATION_POLICY.canonicalReplyTo)
  assert.equal(validateAuthorPackageNotification(notification).ok, true)
})

test('working title suggestions are required exactly once for current source version', () => {
  assert.throws(
    () => buildAuthorFacingEditorialReviewPackage(input({ suggestedTitles: ['Only One'] })),
    /TITLE_SUGGESTION_BLOCKED - EXACTLY_THREE_DISTINCT_TITLES_REQUIRED/,
  )

  const first = buildAuthorFacingEditorialReviewPackage(input())
  const replay = buildAuthorFacingEditorialReviewPackage(input())
  assert.equal(first.idempotencyKey, replay.idempotencyKey)
  assert.equal(first.titleSelectionTask?.idempotencyKey, replay.titleSelectionTask?.idempotencyKey)
  assert.equal(first.packageChecksum, replay.packageChecksum)
})

test('dispatch selection recognizes author-facing Editorial Review package artifacts', () => {
  const service = readFileSync(new URL('../lib/server/publishing-dispatch-service.ts', import.meta.url), 'utf8')
  assert.match(service, /author-facing\.\*editorial\.\*review/)
  assert.match(service, /editorial\.\*review\.\*assessment/)
  assert.match(service, /editorial\.\*review\.\*instruction/)
  assert.doesNotMatch(service, /Boateng|JMP-INT-202607-422JSZ/)
})
