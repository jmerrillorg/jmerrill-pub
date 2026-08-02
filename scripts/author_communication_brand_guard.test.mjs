import assert from 'node:assert/strict'
import test from 'node:test'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const brand = jiti('../lib/server/author-communication-brand.ts')
const engine = jiti('../lib/server/author-package-notification-engine.ts')

function attachment(role, fileName, contentType, bytes) {
  return {
    role,
    artifactId: `artifact-${role}`,
    fileName,
    contentType,
    contentBytesBase64: Buffer.from(bytes).toString('base64'),
    sizeBytes: Buffer.byteLength(bytes),
    sha256: 'checksum-present',
  }
}

test('shared author communication renderer produces branded HTML and plain text', () => {
  const rendered = brand.renderAuthorCommunicationEmail({
    templateName: 'AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1',
    templateVersion: '1.0.0',
    subject: 'Interior Layout Package - The Intentional Leader',
    authorName: 'Jackie',
    titleName: 'The Intentional Leader',
    preheader: 'Your interior layout package is ready for review.',
    why: 'Your interior layout package is ready for review.',
    completed: ['Interior proof prepared.', 'Review instructions prepared.'],
    meaning: 'This review confirms the book can move toward final production.',
    authorAction: 'Please review the package and reply with approval or requested corrections.',
    primaryActionLabel: 'Review Package and Reply',
    primaryActionUrl: 'https://jmerrill.pub/author/portal?action=review-package&titleId=title-intentional-leader',
    nextSteps: ['Publishing records your response.', 'The next stage opens only after approval or correction review.'],
  })

  assert.match(rendered.html, /<!doctype html>/i)
  assert.match(rendered.html, /<table role="presentation"/)
  assert.match(rendered.html, /J MERRILL PUBLISHING/)
  assert.match(rendered.html, /A Division of J Merrill One/)
  assert.match(rendered.html, /Helping Authors Help Themselves\./)
  assert.match(rendered.html, /Why you are receiving this/)
  assert.match(rendered.html, /Package inventory/)
  assert.match(rendered.html, /Response choices/)
  assert.match(rendered.html, /What we need from you/)
  assert.match(rendered.html, /What happens next/)
  assert.match(rendered.text, /Why you are receiving this/)
  assert.match(rendered.text, /Package inventory/)
  assert.match(rendered.text, /Response choices/)
  assert.match(rendered.html, /<a href="https:\/\/jmerrill\.pub\/author\/portal\?action=review-package&amp;titleId=title-intentional-leader"/)
  assert.match(rendered.text, /Primary action: https:\/\/jmerrill\.pub\/author\/portal/)
  assert.match(rendered.text, /The Publishing Team\nJ Merrill Publishing, Inc\./)
  assert.equal(rendered.metadata.qualityGate, 'PASS')
  assert.equal(rendered.metadata.htmlSha256.length, 64)
  assert.equal(rendered.metadata.textSha256.length, 64)
})

test('author package binary validation rejects corrupt DOCX, JSON masquerading as DOCX, and invalid PDF', () => {
  const tinyDocx = attachment(
    'editedManuscript',
    'Before You Were Born - Developmental Editing Manuscript.docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'PK tiny',
  )
  assert.equal(engine.validateGovernedPackageAttachmentBinary(tinyDocx, 'Before You Were Born').ok, false)

  const jsonAsDocx = attachment(
    'editedManuscript',
    'Before You Were Born - Developmental Editing Manuscript.docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    JSON.stringify({ error: 'download failed' }).repeat(500),
  )
  const jsonValidation = engine.validateGovernedPackageAttachmentBinary(jsonAsDocx, 'Before You Were Born')
  assert.equal(jsonValidation.ok, false)
  assert.match(jsonValidation.blocker, /DOCX_ZIP_SIGNATURE|ERROR_PAYLOAD/)

  const invalidPdf = attachment(
    'editorialMemo',
    'Before You Were Born - Developmental Editing Summary.pdf',
    'application/pdf',
    'not a pdf'.repeat(400),
  )
  const pdfValidation = engine.validateGovernedPackageAttachmentBinary(invalidPdf, 'Before You Were Born')
  assert.equal(pdfValidation.ok, false)
  assert.match(pdfValidation.blocker, /PDF_SIGNATURE/)
})

test('author communication validation blocks unformatted or text-only output', () => {
  const validation = brand.validateAuthorCommunicationEmail({
    templateName: 'AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1',
    templateVersion: '1.0.0',
    html: '',
    text: 'plain text only',
  })

  assert.equal(validation.ok, false)
  assert.match(validation.blocker, /HTML_BODY_MISSING/)
  assert.match(validation.blocker, /PACKAGE_INVENTORY_BLOCK_MISSING/)
  assert.match(validation.blocker, /RESPONSE_CHOICES_BLOCK_MISSING/)
  assert.match(validation.blocker, /PLAIN_TEXT_SIGNATURE_MISSING/)
})

test('author package notification copy uses the shared brand renderer', () => {
  const copy = engine.buildAuthorReviewNotificationCopy({
    stageCode: 'INTERIOR_LAYOUT_REVIEW',
    titleName: 'The Intentional Leader',
    authorName: 'Jackie',
    primaryActionUrl: 'https://jmerrill.pub/author/portal?action=review-package&titleId=title-intentional-leader',
  })

  assert.equal(copy.templateName, 'AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1')
  assert.equal(copy.templateVersion, '1.0.0')
  assert.equal(copy.templateMetadata.qualityGate, 'PASS')
  assert.match(copy.htmlBody, /J MERRILL PUBLISHING/)
  assert.match(copy.htmlBody, /Interior Layout Review Package - The Intentional Leader/)
  assert.match(copy.body, /Good day, Jackie,/)
  assert.match(copy.body, /What has been completed/)
})

test('author communication blocks non-clickable or duplicated-subject package messages', () => {
  assert.throws(
    () => brand.renderAuthorCommunicationEmail({
      templateName: 'AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1',
      templateVersion: '1.0.0',
      subject: 'Corrected Developmental Editing Review Review Package - Before You Were Born',
      authorName: 'Sean',
      titleName: 'Before You Were Born',
      preheader: 'Corrected package.',
      why: 'The prior package files were not usable.',
      completed: ['Files replaced.'],
      meaning: 'Use this message for review.',
      authorAction: 'Review the package.',
      primaryActionLabel: 'Review Package and Reply',
      primaryActionUrl: 'https://jmerrill.pub/author/portal?action=review-package',
      nextSteps: ['Publishing records your response.'],
    }),
    /SUBJECT_DUPLICATED_WORD/,
  )

  assert.throws(
    () => brand.renderAuthorCommunicationEmail({
      templateName: 'AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1',
      templateVersion: '1.0.0',
      subject: 'Corrected Developmental Editing Review Package - Before You Were Born',
      authorName: 'Sean',
      titleName: 'Before You Were Born',
      preheader: 'Corrected package.',
      why: 'The prior package files were not usable.',
      completed: ['Files replaced.'],
      meaning: 'Use this message for review.',
      authorAction: 'Review the package.',
      primaryActionLabel: 'Review Package and Reply',
      primaryActionUrl: '#',
      nextSteps: ['Publishing records your response.'],
    }),
    /PRIMARY_ACTION_URL_INVALID/,
  )
})
