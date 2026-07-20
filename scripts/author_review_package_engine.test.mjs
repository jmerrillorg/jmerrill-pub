import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, symlinkSync, unlinkSync } from 'node:fs'
import test, { after } from 'node:test'

const notificationShim = new URL('../lib/server/author-package-notification-engine', import.meta.url)
let createdNotificationShim = false
if (!existsSync(notificationShim)) {
  symlinkSync('author-package-notification-engine.ts', notificationShim)
  createdNotificationShim = true
}
after(() => {
  if (createdNotificationShim) unlinkSync(notificationShim)
})

const {
  PACKAGE_STAGE_POLICIES,
  assembleAuthorReviewPackage,
  buildNotificationInputFromPackage,
  createPackageManifest,
  evaluatePackageCadence,
  getPackagePolicy,
  migrateHistoricalPackageEvidence,
  packageVisibilityForWorkspace,
  publisherTodayPackageMetrics,
  supersedePackage,
  validatePackageQa,
} = await import('../lib/server/author-review-package-engine.ts')
const { validateAuthorPackageNotification } = await import('../lib/server/author-package-notification-engine.ts')

const now = '2026-07-20T08:00:00.000Z'

function sha(value) {
  return createHash('sha256').update(value).digest('hex')
}

function artifact(role, overrides = {}) {
  const isDocx = role.toLowerCase().includes('manuscript')
  return {
    artifactId: overrides.artifactId || `artifact-${role}`,
    role,
    filename: overrides.filename || `${role}.${isDocx ? 'docx' : 'pdf'}`,
    mimeType:
      overrides.mimeType ||
      (isDocx ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf'),
    fileSize: overrides.fileSize || 1200,
    checksum: overrides.checksum || sha(role),
    sourceVersion: overrides.sourceVersion || `source-${role}-v1`,
    createdAt: overrides.createdAt || now,
    stageId: overrides.stageId || 'stage-proofreading',
    titleId: overrides.titleId || 'title-intentional-leader',
    authorVisible: overrides.authorVisible,
    emailAttachment: overrides.emailAttachment,
    workspaceDownload: overrides.workspaceDownload,
    canMaterializeForEmail: overrides.canMaterializeForEmail ?? true,
    canRender: overrides.canRender ?? true,
    contentBytesBase64: overrides.contentBytesBase64 || Buffer.from(role).toString('base64'),
  }
}

function proofreadingPackage(overrides = {}) {
  return assembleAuthorReviewPackage({
    packageId: overrides.packageId || 'package-proofreading-v1',
    titleId: 'title-intentional-leader',
    authorId: 'author-jackie',
    stageId: 'stage-proofreading',
    stageCode: 'PROOFREADING',
    gateId: 'gate-a5',
    packageVersion: overrides.packageVersion || 'v1',
    artifacts:
      overrides.artifacts || [artifact('proofreadManuscript'), artifact('proofreadingCoverNote')],
    preparedAt: now,
    cadence: overrides.cadence || { now, rushAuthorized: true },
    correlationId: 'corr-package-engine-test',
  })
}

test('all governed author-review stages consume one package policy register', () => {
  assert.deepEqual(Object.keys(PACKAGE_STAGE_POLICIES).sort(), [
    'COPYEDITING',
    'COVER_DESIGN',
    'DEVELOPMENTAL_EDITING',
    'EDITORIAL_REVIEW',
    'INTERIOR_LAYOUT',
    'LINE_EDITING',
    'PRODUCTION_PROOF',
    'PROOFREADING',
  ])
  for (const policy of Object.values(PACKAGE_STAGE_POLICIES)) {
    assert.ok(policy.requiredArtifactRoles.length > 0)
    assert.ok(policy.cadencePolicyId)
    assert.ok(policy.nextStagePolicy)
  }
})

test('required artifacts differ through policy configuration', () => {
  assert.deepEqual(getPackagePolicy('PROOFREADING').requiredArtifactRoles, [
    'proofreadManuscript',
    'proofreadingCoverNote',
  ])
  assert.deepEqual(getPackagePolicy('INTERIOR_LAYOUT').requiredArtifactRoles, [
    'interiorProofPDF',
    'reviewInstructions',
  ])
  assert.deepEqual(getPackagePolicy('COVER_DESIGN').requiredArtifactRoles, [
    'approvedConceptOrReviewSet',
    'designRationale',
    'reviewInstructions',
  ])
})

test('missing required artifact blocks package QA', () => {
  const manifest = createPackageManifest({
    packageId: 'pkg-missing',
    titleId: 'title-intentional-leader',
    authorId: 'author-jackie',
    stageId: 'stage-proofreading',
    stageCode: 'PROOFREADING',
    gateId: 'gate-a5',
    packageVersion: 'v1',
    artifacts: [artifact('proofreadManuscript')],
    createdAt: now,
  })
  const result = validatePackageQa({ manifest, artifacts: [artifact('proofreadManuscript')], completedAt: now })
  assert.equal(result.ok, false)
  assert.equal(result.failures[0].code, 'PACKAGE_QA_FAILED - REQUIRED_ARTIFACT_MISSING')
})

test('stale-stage artifact is rejected', () => {
  const artifacts = [artifact('proofreadManuscript', { stageId: 'stage-copyediting' }), artifact('proofreadingCoverNote')]
  const manifest = createPackageManifest({
    packageId: 'pkg-stale',
    titleId: 'title-intentional-leader',
    authorId: 'author-jackie',
    stageId: 'stage-proofreading',
    stageCode: 'PROOFREADING',
    gateId: 'gate-a5',
    packageVersion: 'v1',
    artifacts,
    createdAt: now,
  })
  const result = validatePackageQa({ manifest, artifacts, completedAt: now })
  assert.equal(result.ok, false)
  assert.ok(result.failures.some((failure) => failure.code === 'PACKAGE_QA_FAILED - STALE_STAGE_ARTIFACT'))
})

test('manifest controls email attachments and workspace downloads', () => {
  const pkg = proofreadingPackage()
  const notification = buildNotificationInputFromPackage({
    pkg,
    recipientEmail: 'chosen2k7@gmail.com',
    workspaceAccessLocation: 'https://jmerrill.pub/author/portal',
    notificationTemplateId: 'proofreading-review',
    attachments: [artifact('proofreadManuscript'), artifact('proofreadingCoverNote')],
  })
  assert.deepEqual(
    pkg.manifest.artifacts.filter((item) => item.emailAttachment).map((item) => item.artifactId).toSorted(),
    notification.requiredAttachmentArtifactIds.toSorted(),
  )
  assert.deepEqual(
    pkg.manifest.artifacts.filter((item) => item.workspaceDownload).map((item) => item.artifactId).toSorted(),
    ['artifact-proofreadManuscript', 'artifact-proofreadingCoverNote'].toSorted(),
  )
  assert.equal(validateAuthorPackageNotification(notification).ok, true)
})

test('package checksum is deterministic', () => {
  const first = proofreadingPackage()
  const second = proofreadingPackage()
  assert.equal(first.packageChecksum, second.packageChecksum)
})

test('revised package supersedes rather than overwrites prior evidence', () => {
  const current = proofreadingPackage()
  const superseded = supersedePackage({ current, revisedPackageId: 'package-proofreading-v2', completedAt: now })
  assert.equal(superseded.packageStatus, 'SUPERSEDED')
  assert.equal(superseded.supersededByPackageId, 'package-proofreading-v2')
  assert.equal(superseded.packageChecksum, current.packageChecksum)
})

test('QA failure prevents cadence release', () => {
  const result = evaluatePackageCadence({
    stageCode: 'PROOFREADING',
    qaResult: {
      ok: false,
      status: 'QA_FAILED',
      completedAt: now,
      failures: [{ code: 'PACKAGE_QA_FAILED - REQUIRED_ARTIFACT_MISSING', detail: 'proofreadingCoverNote' }],
    },
    cadence: { now, rushAuthorized: true },
  })
  assert.equal(result.status, 'CADENCE_HOLD')
  assert.match(result.cadenceBasis, /qa-not-passed/)
})

test('cadence hold prevents early release', () => {
  const pkg = proofreadingPackage({ cadence: { now, wordCount: 60000 } })
  assert.equal(pkg.packageStatus, 'CADENCE_HOLD')
  assert.notEqual(pkg.earliestReleaseAt, now)
})

test('complete package release hands off to canonical notification engine', () => {
  const pkg = proofreadingPackage()
  assert.equal(pkg.packageStatus, 'READY_FOR_RELEASE')
  const notification = buildNotificationInputFromPackage({
    pkg,
    recipientEmail: 'chosen2k7@gmail.com',
    workspaceAccessLocation: 'https://jmerrill.pub/author/portal',
    notificationTemplateId: 'proofreading-review',
    attachments: [artifact('proofreadManuscript'), artifact('proofreadingCoverNote')],
  })
  assert.equal(validateAuthorPackageNotification(notification).ok, true)
  assert.equal(notification.recipientPolicy.replyTo, 'publishing@jmerrill.one')
})

test('workspace visibility follows package status', () => {
  assert.equal(packageVisibilityForWorkspace('READY_FOR_RELEASE'), 'hidden')
  assert.equal(packageVisibilityForWorkspace('AUTHOR_REVIEW'), 'active')
  assert.equal(packageVisibilityForWorkspace('APPROVED'), 'completed')
  assert.equal(packageVisibilityForWorkspace('SUPERSEDED'), 'superseded')
})

test('historical package migration creates manifest without resending', () => {
  const migration = migrateHistoricalPackageEvidence({
    packageId: 'historical-copyediting-v1',
    titleId: 'title-intentional-leader',
    authorId: 'author-jackie',
    stageId: 'stage-copyediting',
    stageCode: 'COPYEDITING',
    gateId: 'gate-a4',
    packageVersion: 'v1',
    artifacts: [
      artifact('editedManuscript', {
        stageId: 'stage-copyediting',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      artifact('copyeditingSummary', { stageId: 'stage-copyediting' }),
      artifact('reviewInstructions', { stageId: 'stage-copyediting', mimeType: 'text/plain' }),
    ],
    createdAt: now,
  })
  assert.equal(migration.classification, 'MIGRATION_COMPATIBLE')
  assert.equal(migration.resendRequired, false)
  assert.equal(migration.manifest.artifacts.length, 3)
})

test('Publisher Today package metrics expose exact package operations', () => {
  assert.deepEqual(
    publisherTodayPackageMetrics([
      { ...proofreadingPackage(), packageStatus: 'VALIDATING' },
      { ...proofreadingPackage({ packageId: 'pkg-2' }), packageStatus: 'QA_FAILED' },
      { ...proofreadingPackage({ packageId: 'pkg-3' }), packageStatus: 'AUTHOR_REVIEW' },
      { ...proofreadingPackage({ packageId: 'pkg-4' }), packageStatus: 'SUPERSEDED' },
    ]),
    {
      packagesAssembling: 0,
      packagesInQa: 1,
      qaFailures: 1,
      cadenceHolds: 0,
      readyForRelease: 0,
      notificationExceptions: 0,
      awaitingAuthors: 1,
      correctionsRequested: 0,
      supersededPackages: 1,
    },
  )
})
