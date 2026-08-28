import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, symlinkSync, unlinkSync } from 'node:fs'
import test, { after } from 'node:test'
import { strToU8, zipSync } from 'fflate'

const notificationShim = new URL('../lib/server/author-package-notification-engine', import.meta.url)
const brandShim = new URL('../lib/server/author-communication-brand', import.meta.url)
const rendererShim = new URL('../lib/server/jm1-enterprise-communication-renderer', import.meta.url)
const designTokensShim = new URL('../lib/server/jm1-enterprise-design-tokens', import.meta.url)
const terminologyShim = new URL('../lib/server/author-facing-terminology', import.meta.url)
const humanFirstShim = new URL('../lib/server/jm1-human-first-why-first-policy', import.meta.url)
let createdNotificationShim = false
let createdBrandShim = false
let createdRendererShim = false
let createdDesignTokensShim = false
let createdTerminologyShim = false
let createdHumanFirstShim = false
if (!existsSync(notificationShim)) {
  symlinkSync('author-package-notification-engine.ts', notificationShim)
  createdNotificationShim = true
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
if (!existsSync(humanFirstShim)) {
  symlinkSync('jm1-human-first-why-first-policy.ts', humanFirstShim)
  createdHumanFirstShim = true
}
after(() => {
  if (createdNotificationShim) unlinkSync(notificationShim)
  if (createdBrandShim) unlinkSync(brandShim)
  if (createdRendererShim) unlinkSync(rendererShim)
  if (createdDesignTokensShim) unlinkSync(designTokensShim)
  if (createdTerminologyShim) unlinkSync(terminologyShim)
  if (createdHumanFirstShim) unlinkSync(humanFirstShim)
})

const {
  PACKAGE_STAGE_POLICIES,
  assembleAuthorReviewPackage,
  buildNotificationInputFromPackage,
  certifyGovernedCadenceRetest,
  createAuthorReviewResponseClock,
  createCorrectedAuthorReviewDeliveryEvidence,
  createPackageManifest,
  evaluatePackageCadence,
  getPackagePolicy,
  migrateHistoricalPackageEvidence,
  packageVisibilityForWorkspace,
  publisherTodayPackageMetrics,
  supersedePackage,
  validateAuthorReviewResponseMechanism,
  validatePackageQa,
} = await import('../lib/server/author-review-package-engine.ts')
const {
  authorFacingAttachmentBlocker,
  buildAuthorReviewNotificationCopy,
  validateAuthorPackageNotification,
} = await import('../lib/server/author-package-notification-engine.ts')

const now = '2026-07-20T08:00:00.000Z'

function sha(value) {
  return createHash('sha256').update(value).digest('hex')
}

function fakeDocx(title = 'The Intentional Leader') {
  const documentText = `${title} governed author review manuscript `.repeat(500)
  return Buffer.from(zipSync({
    '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),
    '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'),
    'word/document.xml': strToU8(`<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${documentText}</w:t></w:r></w:p></w:body></w:document>`),
  }, { level: 0 }))
}

function tinyDocx(text = 'Establishing Glory short internal wrapper') {
  return Buffer.from(zipSync({
    '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),
    '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'),
    'word/document.xml': strToU8(`<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`),
  }, { level: 0 }))
}

function fakePdf(title = 'The Intentional Leader') {
  return Buffer.from(`%PDF-1.7\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R >> endobj\n${title}\n${'author review package '.repeat(6_000)}\n%%EOF`)
}

function fakeText(title = 'The Intentional Leader') {
  return Buffer.from(`${title}\nAuthor review package\n${'response choice '.repeat(30)}`)
}

function fakeJson(title = 'The Intentional Leader') {
  return Buffer.from(JSON.stringify({
    title,
    packageInventory: ['manuscript', 'summary', 'instructions', 'manifest'],
    authorSafe: true,
    checks: ['file signature', 'open test', 'checksum lineage', 'author response route'],
    description: 'governed author-facing package manifest '.repeat(12),
  }, null, 2))
}

function artifact(role, overrides = {}) {
  const isDocx = role.toLowerCase().includes('manuscript')
  const filename = overrides.filename || `${role}.${isDocx ? 'docx' : overrides.mimeType === 'application/json' ? 'json' : overrides.mimeType === 'text/plain' ? 'txt' : 'pdf'}`
  const bytes =
    overrides.bytes ||
    (filename.endsWith('.docx')
      ? fakeDocx(overrides.titleName)
      : filename.endsWith('.pdf')
        ? fakePdf(overrides.titleName)
        : filename.endsWith('.json')
          ? fakeJson(overrides.titleName)
          : fakeText(overrides.titleName))
  return {
    artifactId: overrides.artifactId || `artifact-${role}`,
    role,
    filename,
    mimeType:
      overrides.mimeType ||
      (isDocx ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf'),
    fileSize: overrides.fileSize || bytes.byteLength,
    checksum: overrides.checksum || sha(bytes),
    sourceVersion: overrides.sourceVersion || `source-${role}-v1`,
    createdAt: overrides.createdAt || now,
    stageId: overrides.stageId || 'stage-proofreading',
    titleId: overrides.titleId || 'title-intentional-leader',
    authorVisible: overrides.authorVisible,
    emailAttachment: overrides.emailAttachment,
    workspaceDownload: overrides.workspaceDownload,
    canMaterializeForEmail: overrides.canMaterializeForEmail ?? true,
    canRender: overrides.canRender ?? true,
    pageCount: overrides.pageCount,
    expectedPageCount: overrides.expectedPageCount,
    manifestPageCount: overrides.manifestPageCount,
    expectedMinimumFileSize: overrides.expectedMinimumFileSize,
    visualQaPassed: overrides.visualQaPassed,
    titlePagePresent: overrides.titlePagePresent,
    tocPresent: overrides.tocPresent,
    manuscriptSectionsComplete: overrides.manuscriptSectionsComplete,
    productionNotesVisible: overrides.productionNotesVisible,
    truncatedOutput: overrides.truncatedOutput,
    audienceClassification:
      overrides.audienceClassification ||
      (['authorResponseMechanism', 'packageManifest', 'authorCoverMessage', 'developmentalMemo'].includes(role)
        ? 'INTERNAL_ONLY'
        : 'AUTHOR_REVIEW'),
    artifactTypeAuthority: overrides.artifactTypeAuthority || 'STRUCTURED_METADATA',
    wordCount: overrides.wordCount ?? (role === 'editedManuscript' || role === 'proofreadManuscript' ? 12_000 : undefined),
    expectedSourceWordCount: overrides.expectedSourceWordCount ?? (role === 'editedManuscript' || role === 'proofreadManuscript' ? 12_000 : undefined),
    sourceLineageVerified: overrides.sourceLineageVerified ?? (role === 'editedManuscript' || role === 'proofreadManuscript' ? true : undefined),
    fullStructuralSpan: overrides.fullStructuralSpan ?? (role === 'editedManuscript' || role === 'proofreadManuscript' ? true : undefined),
    expectedOpeningContentPresent: overrides.expectedOpeningContentPresent ?? (role === 'editedManuscript' || role === 'proofreadManuscript' ? true : undefined),
    expectedEndingContentPresent: overrides.expectedEndingContentPresent ?? (role === 'editedManuscript' || role === 'proofreadManuscript' ? true : undefined),
    chapterContinuityPassed: overrides.chapterContinuityPassed ?? (role === 'editedManuscript' || role === 'proofreadManuscript' ? true : undefined),
    internalMetadataLeak: overrides.internalMetadataLeak,
    contentBytesBase64: overrides.contentBytesBase64 || bytes.toString('base64'),
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
      overrides.artifacts || [artifact('proofreadManuscript'), artifact('reviewInstructions')],
    preparedAt: now,
    cadence: overrides.cadence || { now, rushAuthorized: true },
    correlationId: 'corr-package-engine-test',
  })
}

function developmentalPackage(overrides = {}) {
  return assembleAuthorReviewPackage({
    packageId: overrides.packageId || 'package-developmental-v1',
    titleId: 'title-developmental',
    authorId: 'author-developmental',
    stageId: 'stage-developmental',
    stageCode: 'DEVELOPMENTAL_EDITING',
    gateId: 'gate-developmental',
    packageVersion: overrides.packageVersion || 'v1',
    artifacts:
      overrides.artifacts || [
        artifact('editedManuscript', { stageId: 'stage-developmental', titleId: 'title-developmental' }),
        artifact('developmentalMemo', { stageId: 'stage-developmental', titleId: 'title-developmental' }),
        artifact('reviewInstructions', { stageId: 'stage-developmental', titleId: 'title-developmental' }),
        artifact('authorResponseMechanism', { stageId: 'stage-developmental', titleId: 'title-developmental', mimeType: 'text/plain' }),
        artifact('packageManifest', { stageId: 'stage-developmental', titleId: 'title-developmental', mimeType: 'application/json' }),
        artifact('authorCoverMessage', { stageId: 'stage-developmental', titleId: 'title-developmental' }),
      ],
    preparedAt: now,
    cadence: overrides.cadence || { now, rushAuthorized: true },
    correlationId: 'corr-developmental-package-test',
  })
}

function interiorPackage(overrides = {}) {
  return assembleAuthorReviewPackage({
    packageId: overrides.packageId || 'package-interior-v1',
    titleId: 'title-intentional-leader',
    authorId: 'author-jackie',
    stageId: 'stage-interior',
    stageCode: 'INTERIOR_LAYOUT',
    gateId: 'gate-interior',
    packageVersion: overrides.packageVersion || 'v1',
    artifacts:
      overrides.artifacts || [
        artifact('interiorProofPDF', {
          stageId: 'stage-interior',
          fileSize: 3_100_000,
          pageCount: 214,
          expectedPageCount: 214,
          manifestPageCount: 214,
          visualQaPassed: true,
          titlePagePresent: true,
          tocPresent: true,
          manuscriptSectionsComplete: true,
          productionNotesVisible: false,
          truncatedOutput: false,
        }),
        artifact('reviewInstructions', { stageId: 'stage-interior' }),
        artifact('authorResponseMechanism', { stageId: 'stage-interior', mimeType: 'text/plain' }),
        artifact('packageManifest', { stageId: 'stage-interior', mimeType: 'application/json' }),
        artifact('authorCoverMessage', { stageId: 'stage-interior' }),
      ],
    preparedAt: now,
    cadence: overrides.cadence || { now, rushAuthorized: true },
    correlationId: 'corr-interior-package-test',
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

test('author response policies use canonical governed response options', () => {
  for (const policy of Object.values(PACKAGE_STAGE_POLICIES)) {
    assert.deepEqual(policy.authorDecisionOptions, [
      'APPROVE_AS_PRESENTED',
      'APPROVE_WITH_CORRECTIONS',
      'QUESTIONS_OR_CLARIFICATION_REQUESTED',
    ])
  }
})

test('required artifacts differ through policy configuration', () => {
  assert.deepEqual(getPackagePolicy('PROOFREADING').requiredArtifactRoles, [
    'proofreadManuscript',
    'reviewInstructions',
  ])
  assert.deepEqual(getPackagePolicy('INTERIOR_LAYOUT').requiredArtifactRoles, [
    'interiorProofPDF',
    'reviewInstructions',
    'authorResponseMechanism',
    'packageManifest',
    'authorCoverMessage',
  ])
  assert.deepEqual(getPackagePolicy('COVER_DESIGN').requiredArtifactRoles, [
    'approvedConceptOrReviewSet',
    'designRationale',
    'reviewInstructions',
  ])
  assert.deepEqual(getPackagePolicy('DEVELOPMENTAL_EDITING').requiredArtifactRoles, [
    'editedManuscript',
    'developmentalMemo',
    'reviewInstructions',
    'authorResponseMechanism',
    'packageManifest',
    'authorCoverMessage',
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
  const artifacts = [artifact('proofreadManuscript', { stageId: 'stage-copyediting' }), artifact('reviewInstructions')]
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
    attachments: [artifact('proofreadManuscript'), artifact('reviewInstructions')],
  })
  assert.deepEqual(
    pkg.manifest.artifacts.filter((item) => item.emailAttachment).map((item) => item.artifactId).toSorted(),
    notification.requiredAttachmentArtifactIds.toSorted(),
  )
  assert.deepEqual(
    pkg.manifest.artifacts.filter((item) => item.workspaceDownload).map((item) => item.artifactId).toSorted(),
    ['artifact-proofreadManuscript', 'artifact-reviewInstructions'].toSorted(),
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
      failures: [{ code: 'PACKAGE_QA_FAILED - REQUIRED_ARTIFACT_MISSING', detail: 'reviewInstructions' }],
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
    attachments: [artifact('proofreadManuscript'), artifact('reviewInstructions')],
  })
  assert.equal(validateAuthorPackageNotification(notification).ok, true)
  assert.equal(notification.recipientPolicy.replyTo, 'publishing@jmerrill.one')
  assert.deepEqual(notification.recipientPolicy.cc, ['publishing@jmerrill.one'])
  assert.deepEqual(notification.recipientPolicy.bcc, [])
})

test('governed cadence retest certifies only when all six evidence lanes pass under one correlation', () => {
  const pkg = proofreadingPackage({
    packageId: 'package-cadence-retest-v1',
    packageVersion: 'v1',
  })
  const notification = buildNotificationInputFromPackage({
    pkg,
    recipientEmail: 'synthetic-author@example.test',
    workspaceAccessLocation: 'https://jmerrill.pub/author/portal',
    notificationTemplateId: 'proofreading-review',
    attachments: [artifact('proofreadManuscript'), artifact('reviewInstructions')],
  })
  const evidence = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].map((condition, index) => ({
    condition,
    status: 'PASS',
    source: 'synthetic-cadence-retest',
    recordId: `cadence-log-${condition}`,
    timestamp: `2026-08-01T12:0${index}:00.000Z`,
    correlationId: pkg.correlationId,
    detail: `condition ${condition} pass`,
  }))

  const certification = certifyGovernedCadenceRetest({
    package: pkg,
    scheduledReleaseAt: now,
    actualStartAt: now,
    releasedAt: now,
    notification,
    notificationResult: {
      messageId: 'acs-message-synthetic-cadence',
      providerStatus: 'accepted',
      sentAt: now,
    },
    authorAccess: {
      accessProofId: 'author-access-proof-synthetic',
      status: 'AVAILABLE',
      timestamp: now,
    },
    nextGate: {
      gateId: pkg.gateId,
      state: 'AUTHOR_RESPONSE_PENDING',
      createdAt: now,
    },
    executionLogRecords: evidence,
  })

  assert.equal(certification.certified, true)
  assert.equal(certification.classification, 'CADENCE_CERTIFIED')
  assert.equal(certification.finalPackageStatus, 'AUTHOR_REVIEW')
  assert.equal(certification.responseClock?.autoApprovalAuthorized, false)
  assert.deepEqual(
    certification.conditions.map((condition) => condition.status),
    ['PASS', 'PASS', 'PASS', 'PASS', 'PASS', 'PASS'],
  )
})

test('governed cadence retest fails closed when execution-log completion evidence is missing', () => {
  const pkg = proofreadingPackage({ packageId: 'package-cadence-retest-missing-log' })
  const notification = buildNotificationInputFromPackage({
    pkg,
    recipientEmail: 'synthetic-author@example.test',
    workspaceAccessLocation: 'https://jmerrill.pub/author/portal',
    notificationTemplateId: 'proofreading-review',
    attachments: [artifact('proofreadManuscript'), artifact('reviewInstructions')],
  })
  const evidence = ['L1', 'L2', 'L3', 'L4', 'L5'].map((condition, index) => ({
    condition,
    status: 'PASS',
    source: 'synthetic-cadence-retest',
    recordId: `cadence-log-${condition}`,
    timestamp: `2026-08-01T12:1${index}:00.000Z`,
    correlationId: pkg.correlationId,
    detail: `condition ${condition} pass`,
  }))

  const certification = certifyGovernedCadenceRetest({
    package: pkg,
    scheduledReleaseAt: now,
    actualStartAt: now,
    releasedAt: now,
    notification,
    notificationResult: {
      messageId: 'acs-message-synthetic-cadence',
      providerStatus: 'accepted',
      sentAt: now,
    },
    authorAccess: {
      accessProofId: 'author-access-proof-synthetic',
      status: 'AVAILABLE',
      timestamp: now,
    },
    nextGate: {
      gateId: pkg.gateId,
      state: 'AUTHOR_RESPONSE_PENDING',
      createdAt: now,
    },
    executionLogRecords: evidence,
  })

  assert.equal(certification.certified, false)
  assert.equal(certification.classification, 'CADENCE_NOT_CERTIFIED_INTERNAL_DEFECT_REMAINS')
  assert.ok(certification.blockers.includes('L6_EVIDENCE_NOT_CONCLUSIVE'))
  assert.equal(certification.conditions.find((condition) => condition.condition === 'L6')?.status, 'NO_EVIDENCE')
})

function manifestItem(pkg, role) {
  const item = pkg.manifest.artifacts.find((artifact) => artifact.artifactRole === role)
  assert.ok(item, `expected manifest artifact for ${role}`)
  return item
}

test('Developmental and Interior packages keep response, manifest, and cover-message artifacts internal', () => {
  const developmental = developmentalPackage()
  const developmentalNotification = buildNotificationInputFromPackage({
    pkg: developmental,
    recipientEmail: 'developmental-author@example.test',
    workspaceAccessLocation: 'https://jmerrill.pub/author/portal',
    notificationTemplateId: 'developmental-review',
    attachments: [
      artifact('editedManuscript', { stageId: 'stage-developmental', titleId: 'title-developmental' }),
      artifact('developmentalMemo', { stageId: 'stage-developmental', titleId: 'title-developmental' }),
      artifact('reviewInstructions', { stageId: 'stage-developmental', titleId: 'title-developmental' }),
      artifact('authorResponseMechanism', { stageId: 'stage-developmental', titleId: 'title-developmental', mimeType: 'text/plain' }),
      artifact('packageManifest', { stageId: 'stage-developmental', titleId: 'title-developmental', mimeType: 'application/json' }),
      artifact('authorCoverMessage', { stageId: 'stage-developmental', titleId: 'title-developmental' }),
    ],
  })

  const interior = interiorPackage()
  const interiorNotification = buildNotificationInputFromPackage({
    pkg: interior,
    recipientEmail: 'interior-author@example.test',
    workspaceAccessLocation: 'https://jmerrill.pub/author/portal',
    notificationTemplateId: 'interior-review',
    attachments: [
      artifact('interiorProofPDF', { stageId: 'stage-interior' }),
      artifact('reviewInstructions', { stageId: 'stage-interior' }),
      artifact('authorResponseMechanism', { stageId: 'stage-interior', mimeType: 'text/plain' }),
      artifact('packageManifest', { stageId: 'stage-interior', mimeType: 'application/json' }),
      artifact('authorCoverMessage', { stageId: 'stage-interior' }),
    ],
  })

  const developmentalValidation = validateAuthorPackageNotification(developmentalNotification)
  const interiorValidation = validateAuthorPackageNotification(interiorNotification)
  assert.equal(developmentalValidation.ok, true, developmentalValidation.blocker)
  assert.equal(interiorValidation.ok, true, interiorValidation.blocker)
  for (const role of ['authorResponseMechanism', 'packageManifest', 'authorCoverMessage']) {
    const developmentalInternal = manifestItem(developmental, role)
    assert.equal(developmentalInternal.authorVisible, false)
    assert.equal(developmentalInternal.emailAttachment, false)
    assert.equal(developmentalInternal.workspaceDownload, false)

    const interiorInternal = manifestItem(interior, role)
    assert.equal(interiorInternal.authorVisible, false)
    assert.equal(interiorInternal.emailAttachment, false)
    assert.equal(interiorInternal.workspaceDownload, false)
  }
  assert.deepEqual(
    developmentalNotification.attachments.map((attachment) => attachment.role).toSorted(),
    [
      'editedManuscript',
      'reviewInstructions',
    ].toSorted(),
  )
  assert.deepEqual(
    interiorNotification.attachments.map((attachment) => attachment.role).toSorted(),
    [
      'interiorProof',
      'reviewInstructions',
    ].toSorted(),
  )
  const unsafeResponseArtifact = artifact('authorResponseMechanism', { mimeType: 'text/plain' })
  assert.equal(
    authorFacingAttachmentBlocker({
      role: 'authorResponseMechanism',
      artifactId: unsafeResponseArtifact.artifactId,
      fileName: unsafeResponseArtifact.filename,
      contentType: unsafeResponseArtifact.mimeType,
      contentBytesBase64: unsafeResponseArtifact.contentBytesBase64,
      sizeBytes: unsafeResponseArtifact.fileSize,
      sha256: unsafeResponseArtifact.checksum,
    }),
    'AUTHOR_PACKAGE_INTERNAL_ARTIFACT_EXPOSED:authorResponseMechanism',
  )
})

test('Developmental author review requires a complete author-facing manuscript, not an internal memo or filename match', () => {
  const truncated = developmentalPackage({
    artifacts: [
      artifact('editedManuscript', {
        stageId: 'stage-developmental',
        titleId: 'title-developmental',
        filename: 'The General’s Will and Last Testament - Edited Manuscript.docx',
        wordCount: 1_155,
        expectedSourceWordCount: 113_900,
        fullStructuralSpan: false,
        expectedEndingContentPresent: false,
        chapterContinuityPassed: false,
      }),
      artifact('developmentalMemo', { stageId: 'stage-developmental', titleId: 'title-developmental' }),
      artifact('reviewInstructions', { stageId: 'stage-developmental', titleId: 'title-developmental' }),
      artifact('authorResponseMechanism', { stageId: 'stage-developmental', titleId: 'title-developmental', mimeType: 'text/plain' }),
      artifact('packageManifest', { stageId: 'stage-developmental', titleId: 'title-developmental', mimeType: 'application/json' }),
      artifact('authorCoverMessage', { stageId: 'stage-developmental', titleId: 'title-developmental' }),
    ],
  })
  assert.equal(truncated.qaStatus, 'QA_FAILED')
  assert.ok(truncated.qaFailures.some((failure) => failure.code === 'PACKAGE_QA_FAILED - MANUSCRIPT_WORD_COUNT_SANITY'))
  assert.ok(truncated.qaFailures.some((failure) => failure.code === 'PACKAGE_QA_FAILED - AUTHOR_REVIEW_MANUSCRIPT_INCOMPLETE'))

  const filenameOnly = developmentalPackage({
    artifacts: [
      artifact('editedManuscript', {
        stageId: 'stage-developmental',
        titleId: 'title-developmental',
        artifactTypeAuthority: 'FILENAME_ONLY',
      }),
      artifact('developmentalMemo', { stageId: 'stage-developmental', titleId: 'title-developmental' }),
      artifact('reviewInstructions', { stageId: 'stage-developmental', titleId: 'title-developmental' }),
      artifact('authorResponseMechanism', { stageId: 'stage-developmental', titleId: 'title-developmental', mimeType: 'text/plain' }),
      artifact('packageManifest', { stageId: 'stage-developmental', titleId: 'title-developmental', mimeType: 'application/json' }),
      artifact('authorCoverMessage', { stageId: 'stage-developmental', titleId: 'title-developmental' }),
    ],
  })
  assert.equal(filenameOnly.qaStatus, 'QA_FAILED')
  assert.ok(filenameOnly.qaFailures.some((failure) => failure.code === 'PACKAGE_QA_FAILED - FILENAME_NOT_ARTIFACT_TYPE_AUTHORITY'))
})

test('last-mile attachment certification denies internal wrapper text inside a manuscript DOCX', () => {
  const internalWrapperBytes = fakeDocx(
    'Establishing Glory: The Library Generated by: JM1 Automation Source artifact Source checksum Correlation Governed Developmental Revision Artifact Publisher review note',
  )
  const notification = buildNotificationInputFromPackage({
    pkg: developmentalPackage(),
    recipientEmail: 'developmental-author@example.test',
    workspaceAccessLocation: 'https://jmerrill.pub/author/portal',
    notificationTemplateId: 'developmental-review',
    attachments: [
      artifact('editedManuscript', {
        stageId: 'stage-developmental',
        titleId: 'title-developmental',
        titleName: 'Establishing Glory: The Library Generated by: JM1 Automation Source artifact Source checksum Correlation Governed Developmental Revision Artifact Publisher review note',
        bytes: internalWrapperBytes,
      }),
      artifact('reviewInstructions', { stageId: 'stage-developmental', titleId: 'title-developmental' }),
    ],
  })

  const validation = validateAuthorPackageNotification(notification)
  assert.equal(validation.ok, false)
  assert.match(validation.blocker, /ATTACHMENT_RECIPIENT_SURFACE_INVALID:editedManuscript:GENERATED_BY_JM1_AUTOMATION/)
})

test('last-mile attachment certification rejects stale checksum labels on different payload bytes', () => {
  const actualBytes = fakeDocx('Establishing Glory: The Library')
  const staleArtifactBytes = fakeDocx('Different governed artifact')
  const notification = buildNotificationInputFromPackage({
    pkg: developmentalPackage(),
    recipientEmail: 'developmental-author@example.test',
    workspaceAccessLocation: 'https://jmerrill.pub/author/portal',
    notificationTemplateId: 'developmental-review',
    attachments: [
      artifact('editedManuscript', {
        stageId: 'stage-developmental',
        titleId: 'title-developmental',
        titleName: 'Establishing Glory: The Library',
        bytes: actualBytes,
        checksum: sha(staleArtifactBytes),
      }),
      artifact('reviewInstructions', { stageId: 'stage-developmental', titleId: 'title-developmental' }),
    ],
  })

  const validation = validateAuthorPackageNotification(notification)
  assert.equal(validation.ok, false)
  assert.match(validation.blocker, /ATTACHMENT_CHECKSUM_MISMATCH:editedManuscript/)
})

test('last-mile manuscript profile denies tiny system artifacts wearing manuscript filenames', () => {
  const shortDocx = tinyDocx(`Establishing Glory edited manuscript placeholder ${'x'.repeat(12_000)}`)
  const notification = buildNotificationInputFromPackage({
    pkg: developmentalPackage(),
    recipientEmail: 'developmental-author@example.test',
    workspaceAccessLocation: 'https://jmerrill.pub/author/portal',
    notificationTemplateId: 'developmental-review',
    attachments: [
      artifact('editedManuscript', {
        stageId: 'stage-developmental',
        titleId: 'title-developmental',
        filename: 'Establishing Glory - Edited Manuscript.docx',
        bytes: shortDocx,
      }),
      artifact('reviewInstructions', { stageId: 'stage-developmental', titleId: 'title-developmental' }),
    ],
  })

  const validation = validateAuthorPackageNotification(notification)
  assert.equal(validation.ok, false)
  assert.match(validation.blocker, /ATTACHMENT_MANUSCRIPT_PROFILE_INVALID:editedManuscript:WORD_COUNT_SANITY/)
})

test('author-review notification copy avoids last-mile system language regressions', () => {
  const copy = buildAuthorReviewNotificationCopy({
    stageCode: 'DEVELOPMENTAL_EDITING_REVIEW',
    titleName: 'Establishing Glory: The Library',
    authorName: 'Jackie Smith Jr',
    primaryActionUrl: 'https://jmerrill.pub/author/portal',
  })
  const rendered = `${copy.subject}\n${copy.body}\n${copy.htmlBody}`

  assert.doesNotMatch(rendered, /Good day Jackie Smith Jr,/)
  assert.doesNotMatch(rendered, /current author-facing files/i)
  assert.doesNotMatch(rendered, /current publishing stage/i)
  assert.doesNotMatch(rendered, /project history/i)
  assert.match(rendered, /complete manuscript or proof/i)
  assert.match(rendered, /Please review the attached materials for this step/i)
})

test('invalid original author-review delivery does not start response clock; corrected valid delivery does', () => {
  const evidence = createCorrectedAuthorReviewDeliveryEvidence({
    originalDeliveryAt: '2026-08-25T02:01:42.000Z',
    defectReason: 'REQUIRED_REVIEW_ARTIFACT_INVALID',
    correctedDeliveryAt: '2026-08-26T15:30:00.000Z',
    correctedDeliveryValid: true,
  })
  assert.equal(evidence.originalDeliveryValid, false)
  assert.equal(evidence.responseClockStartedAt, '2026-08-26T15:30:00.000Z')
  assert.equal(evidence.responseClock?.responseDueAt, '2026-09-02T15:30:00.000Z')

  const blocked = createCorrectedAuthorReviewDeliveryEvidence({
    originalDeliveryAt: '2026-08-25T02:01:42.000Z',
    defectReason: 'REQUIRED_REVIEW_ARTIFACT_INVALID',
    correctedDeliveryAt: '2026-08-26T15:30:00.000Z',
    correctedDeliveryValid: false,
  })
  assert.equal(blocked.responseClockStartedAt, null)
  assert.equal(blocked.responseClock, null)
})

test('Developmental package cannot release without summary, instructions, response path, and manifest', () => {
  const pkg = developmentalPackage({
    artifacts: [
      artifact('editedManuscript', { stageId: 'stage-developmental', titleId: 'title-developmental' }),
      artifact('developmentalMemo', { stageId: 'stage-developmental', titleId: 'title-developmental' }),
      artifact('reviewInstructions', { stageId: 'stage-developmental', titleId: 'title-developmental' }),
    ],
  })
  assert.equal(pkg.packageStatus, 'QA_FAILED')
  assert.equal(pkg.qaStatus, 'QA_FAILED')
})

test('Interior package cannot release without proof, instructions, response path, and manifest', () => {
  const pkg = interiorPackage({
    artifacts: [
      artifact('interiorProofPDF', { stageId: 'stage-interior' }),
      artifact('reviewInstructions', { stageId: 'stage-interior' }),
    ],
  })
  assert.equal(pkg.packageStatus, 'QA_FAILED')
  assert.equal(pkg.qaStatus, 'QA_FAILED')
})

test('Interior proof guard rejects one-page truncated production artifacts', () => {
  const pkg = interiorPackage({
    artifacts: [
      artifact('interiorProofPDF', {
        artifactId: 'd99c9048-b084-f111-ab0f-00224820105b',
        stageId: 'stage-interior',
        fileSize: 2680,
        pageCount: 1,
        expectedPageCount: 214,
        manifestPageCount: 214,
        visualQaPassed: false,
        titlePagePresent: false,
        tocPresent: false,
        manuscriptSectionsComplete: false,
        productionNotesVisible: true,
        truncatedOutput: true,
      }),
      artifact('reviewInstructions', { stageId: 'stage-interior' }),
      artifact('authorResponseMechanism', { stageId: 'stage-interior', mimeType: 'text/plain' }),
      artifact('packageManifest', { stageId: 'stage-interior', mimeType: 'application/json' }),
      artifact('authorCoverMessage', { stageId: 'stage-interior' }),
    ],
  })

  assert.equal(pkg.qaStatus, 'QA_FAILED')
  assert.deepEqual(
    pkg.qaFailures.map((failure) => failure.code).toSorted(),
    [
      'PACKAGE_QA_FAILED - MISSING_MANUSCRIPT_SECTIONS',
      'PACKAGE_QA_FAILED - MISSING_TITLE_PAGE',
      'PACKAGE_QA_FAILED - MISSING_TOC',
      'PACKAGE_QA_FAILED - PAGE_COUNT_MISMATCH',
      'PACKAGE_QA_FAILED - PAGE_COUNT_MISMATCH',
      'PACKAGE_QA_FAILED - PDF_SIZE_ABNORMAL',
      'PACKAGE_QA_FAILED - PRODUCTION_NOTES_VISIBLE',
      'PACKAGE_QA_FAILED - TRUNCATED_OUTPUT',
      'PACKAGE_QA_FAILED - VISUAL_QA_NOT_PASSED',
    ].toSorted(),
  )
})

test('Interior proof guard blocks author release until front matter and visual QA pass', () => {
  const pkg = interiorPackage({
    artifacts: [
      artifact('interiorProofPDF', {
        stageId: 'stage-interior',
        fileSize: 3_116_756,
        pageCount: 388,
        expectedPageCount: 388,
        manifestPageCount: 388,
        visualQaPassed: true,
        titlePagePresent: false,
        tocPresent: false,
        manuscriptSectionsComplete: true,
        productionNotesVisible: false,
        truncatedOutput: false,
      }),
      artifact('reviewInstructions', { stageId: 'stage-interior' }),
      artifact('authorResponseMechanism', { stageId: 'stage-interior', mimeType: 'text/plain' }),
      artifact('packageManifest', { stageId: 'stage-interior', mimeType: 'application/json' }),
      artifact('authorCoverMessage', { stageId: 'stage-interior' }),
    ],
  })

  assert.equal(pkg.qaStatus, 'QA_FAILED')
  assert.ok(pkg.qaFailures.some((failure) => failure.code === 'PACKAGE_QA_FAILED - MISSING_TITLE_PAGE'))
  assert.ok(pkg.qaFailures.some((failure) => failure.code === 'PACKAGE_QA_FAILED - MISSING_TOC'))
})

test('seven-calendar-day author response clock starts only after successful delivery and never auto-approves', () => {
  assert.equal(createAuthorReviewResponseClock({ deliveredAt: now, deliverySucceeded: false }), null)
  const clock = createAuthorReviewResponseClock({ deliveredAt: now, deliverySucceeded: true })
  assert.equal(clock?.reminderAt, '2026-07-25T08:00:00.000Z')
  assert.equal(clock?.responseDueAt, '2026-07-27T08:00:00.000Z')
  assert.equal(clock?.overdueAt, '2026-07-27T08:00:00.000Z')
  assert.equal(clock?.internalEscalationAt, '2026-07-28T08:00:00.000Z')
  assert.equal(clock?.autoApprovalAuthorized, false)
})

test('author response mechanism records authenticated same-author package response', () => {
  const pkg = { ...interiorPackage(), packageStatus: 'AUTHOR_REVIEW' }
  const result = validateAuthorReviewResponseMechanism({
    canonicalContactId: 'contact-jackie',
    canonicalTitleId: pkg.titleId,
    authenticatedContactId: 'contact-jackie',
    authenticatedIdentityId: 'external-id-jackie',
    stageId: pkg.stageId,
    gateId: pkg.gateId,
    packageId: pkg.packageId,
    packageVersion: pkg.packageVersion,
    manifestChecksum: pkg.packageChecksum,
    responseType: 'APPROVE_WITH_CORRECTIONS',
    authorComments: 'Please correct the consolidated marked items.',
    submittedAt: now,
    activePackage: pkg,
  })
  assert.equal(result.ok, true)
  assert.equal(result.responseRecord.responseType, 'APPROVE_WITH_CORRECTIONS')
  assert.equal(result.responseRecord.approvalGateRelationship, `${pkg.gateId}:${pkg.packageId}:${pkg.packageVersion}`)
})

test('author response mechanism blocks anonymous, cross-author, and superseded package responses', () => {
  const pkg = { ...developmentalPackage(), packageStatus: 'AUTHOR_REVIEW' }
  assert.equal(
    validateAuthorReviewResponseMechanism({
      canonicalContactId: 'contact-a',
      canonicalTitleId: pkg.titleId,
      authenticatedContactId: 'contact-a',
      authenticatedIdentityId: '',
      stageId: pkg.stageId,
      gateId: pkg.gateId,
      packageId: pkg.packageId,
      packageVersion: pkg.packageVersion,
      manifestChecksum: pkg.packageChecksum,
      responseType: 'APPROVE_AS_PRESENTED',
      submittedAt: now,
      activePackage: pkg,
    }).blocker,
    'AUTHOR_RESPONSE_BLOCKED - AUTHENTICATED_IDENTITY_MISSING',
  )
  assert.equal(
    validateAuthorReviewResponseMechanism({
      canonicalContactId: 'contact-a',
      canonicalTitleId: pkg.titleId,
      authenticatedContactId: 'contact-b',
      authenticatedIdentityId: 'external-id-b',
      stageId: pkg.stageId,
      gateId: pkg.gateId,
      packageId: pkg.packageId,
      packageVersion: pkg.packageVersion,
      manifestChecksum: pkg.packageChecksum,
      responseType: 'APPROVE_AS_PRESENTED',
      submittedAt: now,
      activePackage: pkg,
    }).blocker,
    'AUTHOR_RESPONSE_BLOCKED - CROSS_AUTHOR_ACCESS_DENIED',
  )
  assert.equal(
    validateAuthorReviewResponseMechanism({
      canonicalContactId: 'contact-a',
      canonicalTitleId: pkg.titleId,
      authenticatedContactId: 'contact-a',
      authenticatedIdentityId: 'external-id-a',
      stageId: pkg.stageId,
      gateId: pkg.gateId,
      packageId: pkg.packageId,
      packageVersion: pkg.packageVersion,
      manifestChecksum: pkg.packageChecksum,
      responseType: 'APPROVE_AS_PRESENTED',
      submittedAt: now,
      activePackage: { ...pkg, packageStatus: 'SUPERSEDED' },
    }).blocker,
    'AUTHOR_RESPONSE_BLOCKED - SUPERSEDED_PACKAGE',
  )
})

test('author response mechanism rejects wrong manifest checksum and empty correction detail', () => {
  const pkg = { ...developmentalPackage(), packageStatus: 'AUTHOR_REVIEW' }
  assert.equal(
    validateAuthorReviewResponseMechanism({
      canonicalContactId: 'contact-a',
      canonicalTitleId: pkg.titleId,
      authenticatedContactId: 'contact-a',
      authenticatedIdentityId: 'external-id-a',
      stageId: pkg.stageId,
      gateId: pkg.gateId,
      packageId: pkg.packageId,
      packageVersion: pkg.packageVersion,
      manifestChecksum: '0'.repeat(64),
      responseType: 'APPROVE_AS_PRESENTED',
      submittedAt: now,
      activePackage: pkg,
    }).blocker,
    'AUTHOR_RESPONSE_BLOCKED - MANIFEST_CHECKSUM_MISMATCH',
  )
  assert.equal(
    validateAuthorReviewResponseMechanism({
      canonicalContactId: 'contact-a',
      canonicalTitleId: pkg.titleId,
      authenticatedContactId: 'contact-a',
      authenticatedIdentityId: 'external-id-a',
      stageId: pkg.stageId,
      gateId: pkg.gateId,
      packageId: pkg.packageId,
      packageVersion: pkg.packageVersion,
      manifestChecksum: pkg.packageChecksum,
      responseType: 'QUESTIONS_OR_CLARIFICATION_REQUESTED',
      submittedAt: now,
      activePackage: pkg,
    }).blocker,
    'AUTHOR_RESPONSE_BLOCKED - CORRECTION_OR_QUESTION_DETAIL_REQUIRED',
  )
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
