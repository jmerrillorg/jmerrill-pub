import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const brand = jiti('../lib/server/author-communication-brand.ts')
const engine = jiti('../lib/server/author-package-notification-engine.ts')
const terminology = jiti('../lib/server/author-facing-terminology.ts')
const humanFirst = jiti('../lib/server/jm1-human-first-why-first-policy.ts')

function attachment(role, fileName, contentType, bytes) {
  const content = Buffer.from(bytes)
  return {
    role,
    artifactId: `artifact-${role}`,
    fileName,
    contentType,
    contentBytesBase64: content.toString('base64'),
    sizeBytes: content.byteLength,
    sha256: createHash('sha256').update(content).digest('hex'),
  }
}

test('shared author communication renderer produces branded HTML and plain text', () => {
  const rendered = brand.renderAuthorCommunicationEmail({
    templateName: 'AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1',
    templateVersion: '1.0.0',
    subject: 'Interior Layout Materials - The Intentional Leader',
    authorName: 'Jackie',
    titleName: 'The Intentional Leader',
    preheader: 'Your interior layout materials are ready for review.',
    why: 'Your interior layout materials are ready for review.',
    completed: ['Interior proof prepared.', 'Review instructions prepared.'],
    meaning: 'This review confirms the book can move toward final production.',
    authorAction: 'Reply directly to publishing@jmerrill.one with Approved, Approved with corrections, or I have questions.',
    primaryActionLabel: 'View in Author Operating Center',
    primaryActionUrl: 'https://jmerrill.pub/author/portal?action=review-package&titleId=title-intentional-leader',
    nextSteps: ['The Publishing Team records your response.', 'The next stage opens only after approval or correction review.'],
  })

  assert.match(rendered.html, /<!doctype html>/i)
  assert.match(rendered.html, /<table role="presentation"/)
  assert.match(rendered.html, /J MERRILL PUBLISHING/)
  assert.doesNotMatch(rendered.html, /<h1[^>]*>\s*J MERRILL PUBLISHING\s*<\/h1>/i)
  assert.match(rendered.html, /<h1[^>]*>\s*Interior Layout Materials\s*<\/h1>/i)
  assert.match(rendered.html, /The Intentional Leader/)
  assert.match(rendered.html, /A Division of J Merrill One/)
  assert.match(rendered.html, /Helping Authors Help Themselves\./)
  assert.match(rendered.html, /<a href="https:\/\/jmerrill\.pub\/author\/portal\?action=review-package&amp;titleId=title-intentional-leader"/)
  assert.match(rendered.text, /Optional Author Operating Center access: https:\/\/jmerrill\.pub\/author\/portal/)
  assert.match(rendered.text, /Reply directly to publishing@jmerrill\.one/)
  assert.match(rendered.text, /Approved with corrections/)
  assert.match(rendered.text, /^Interior Layout Materials\nThe Intentional Leader\n/)
  assert.match(rendered.text, /The Publishing Team\nJ Merrill Publishing, Inc\./)
  assert.match(rendered.text, /614\.965\.6057 · publishing@jmerrill\.one · jmerrill\.pub/)
  assert.doesNotMatch(rendered.text, /\nWarmly,\s*\nJ Merrill Publishing\b/i)
  assert.doesNotMatch(rendered.text, /package manifest|response mechanism|operational certification|package version|workflow|execution/i)
  assert.equal(rendered.metadata.qualityGate, 'PASS')
  assert.equal(rendered.metadata.renderMode, 'CANONICAL_HTML')
  assert.equal(rendered.metadata.renderTemplateGuard, 'PASS')
  assert.equal(rendered.metadata.renderer, 'JM1 Enterprise Communication Renderer')
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
  assert.match(validation.blocker, /PLAIN_TEXT_SIGNATURE_MISSING/)
})

test('human-first policy allows plain professional author email without section-heading scaffold', () => {
  const content = `Good day, Iyorwuese,

Your developmental edit of The General's Will and Last Testament is ready for review.

I've attached the complete edited manuscript along with a short review guide.

Please read through the manuscript carefully. If everything looks good, reply with "Approved." If you'd like changes, simply tell us what you'd like adjusted.

Once we receive your approval, we'll prepare the book for the next editing stage.

The Publishing Team
J Merrill Publishing, Inc.`
  const result = humanFirst.assertHumanFirstWhyFirst({
    division: 'J Merrill Publishing',
    brand: 'publishing',
    recipientName: 'Iyorwuese',
    recipientRelationship: 'Publishing author',
    communicationType: 'AUTHOR_FINAL_DEVELOPMENTAL_REVIEW_V1',
    eventOrTrigger: 'Developmental edit ready for author review',
    whyContext: 'The author needs the complete edited manuscript for review.',
    actionRequired: 'Reply Approved or request changes.',
    jm1NextStep: 'Prepare the book for the next editing stage after approval.',
    content,
    channel: 'EMAIL',
    sender: 'publishing@email.jmerrill.one',
    replyTo: 'publishing@jmerrill.one',
    cc: ['publishing@jmerrill.one'],
    riskClass: 'AUTHOR_REVIEW',
  })
  assert.equal(result.decision, 'ALLOW')
})

test('human-first policy denies internal runtime language and wrong Publishing sender', () => {
  const result = humanFirst.assertHumanFirstWhyFirst({
    division: 'J Merrill Publishing',
    brand: 'publishing',
    recipientName: 'Iyorwuese',
    recipientRelationship: 'Publishing author',
    communicationType: 'AUTHOR_FINAL_DEVELOPMENTAL_REVIEW_V1',
    eventOrTrigger: 'Developmental edit ready for author review',
    whyContext: 'The author needs the complete edited manuscript for review.',
    actionRequired: 'Reply Approved.',
    jm1NextStep: 'Advance to Line Edit.',
    content: 'The package manifest and artifactId 8f6b0ef4-1111-4222-8333-123456789abc passed technical validation in the runtime queue.',
    channel: 'EMAIL',
    sender: 'noreply@email.jmerrill.one',
    replyTo: 'publishing@jmerrill.one',
    cc: ['publishing@jmerrill.one'],
  })
  assert.equal(result.decision, 'DENY')
  assert.ok(result.violations.includes('WRONG_BRAND_SENDER_IDENTITY'))
  assert.ok(result.violations.includes('INTERNAL_TERM_ARTIFACT_ID'))
  assert.ok(result.violations.includes('INTERNAL_TERM_MANIFEST'))
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
  assert.equal(copy.templateMetadata.renderMode, 'CANONICAL_HTML')
  assert.equal(copy.templateMetadata.renderTemplateGuard, 'PASS')
  assert.match(copy.htmlBody, /J MERRILL PUBLISHING/)
  assert.doesNotMatch(copy.htmlBody, /<h1[^>]*>\s*J MERRILL PUBLISHING\s*<\/h1>/i)
  assert.match(copy.htmlBody, /<h1[^>]*>\s*Interior Layout Review Materials\s*<\/h1>/i)
  assert.match(copy.htmlBody, /The Intentional Leader/)
  assert.match(copy.body, /Good day, Jackie,/)
  assert.match(copy.body, /What has been completed/)
  assert.match(copy.body, /Reply directly to publishing@jmerrill\.one/)
  assert.match(copy.body, /^Interior Layout Review Materials\nThe Intentional Leader\n/)
  assert.match(copy.body, /The Publishing Team\nJ Merrill Publishing, Inc\./)
  assert.doesNotMatch(copy.body, /\nWarmly,\s*\nJ Merrill Publishing\b/i)
  assert.match(copy.htmlBody, /Optional Author Operating Center access/)
})

test('author communication rejects oversized brand heading and invented closing', () => {
  const validation = brand.validateAuthorCommunicationEmail({
    templateName: 'AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1',
    templateVersion: '1.0.0',
    html: `<!doctype html><html><body><table><tr><td><h1>J MERRILL PUBLISHING</h1></td></tr></table><h2>Why you are receiving this</h2><h2>What has been completed</h2><h2>What's attached</h2><h2>What we need from you</h2><h2>How to respond</h2><a href="https://jmerrill.pub/author/portal">Review</a><h2>What happens next</h2><h2>Support</h2>A Division of J Merrill One Helping Authors Help Themselves.</body></html>`,
    text: `Why you are receiving this
What has been completed
What's attached
What we need from you
How to respond
Optional Author Operating Center access: https://jmerrill.pub/author/portal
What happens next
Support
Warmly,
J Merrill Publishing
The Publishing Team
J Merrill Publishing, Inc.
A Division of J Merrill One
614.965.6057 · publishing@jmerrill.one · jmerrill.pub
Helping Authors Help Themselves.`,
  })

  assert.equal(validation.ok, false)
  assert.match(validation.blocker, /BRAND_NAME_RENDERED_AS_MESSAGE_H1/)
  assert.match(validation.blocker, /INVENTED_CLOSING_PRESENT/)
})

test('author communication blocks non-clickable or duplicated-subject package messages', () => {
  assert.throws(
    () => brand.renderAuthorCommunicationEmail({
      templateName: 'AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1',
      templateVersion: '1.0.0',
      subject: 'Corrected Developmental Editing Review Review Materials - Before You Were Born',
      authorName: 'Sean',
      titleName: 'Before You Were Born',
      preheader: 'Corrected materials.',
      why: 'The prior files were not usable.',
      completed: ['Files replaced.'],
      meaning: 'Use this message for review.',
      authorAction: 'Reply directly to publishing@jmerrill.one.',
      primaryActionLabel: 'View in Author Operating Center',
      primaryActionUrl: 'https://jmerrill.pub/author/portal?action=review-package',
      nextSteps: ['The Publishing Team records your response.'],
    }),
    /SUBJECT_DUPLICATED_WORD/,
  )

  assert.throws(
    () => brand.renderAuthorCommunicationEmail({
      templateName: 'AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1',
      templateVersion: '1.0.0',
      subject: 'Corrected Developmental Editing Review Materials - Before You Were Born',
      authorName: 'Sean',
      titleName: 'Before You Were Born',
      preheader: 'Corrected materials.',
      why: 'The prior files were not usable.',
      completed: ['Files replaced.'],
      meaning: 'Use this message for review.',
      authorAction: 'Reply directly to publishing@jmerrill.one.',
      primaryActionLabel: 'View in Author Operating Center',
      primaryActionUrl: '#',
      nextSteps: ['The Publishing Team records your response.'],
    }),
    /PRIMARY_ACTION_URL_INVALID/,
  )
})

test('author-facing actor terminology guard distinguishes prohibited actor use from valid publishing references', () => {
  const cases = [
    ['Publishing will complete the next step.', false],
    ['The Publishing Team will complete the next step.', true],
    ['The book is now with Publishing.', false],
    ['The book is now with the Publishing Team.', true],
    ['while Publishing continues the production process', false],
    ['while the Publishing Team continues the production process', true],
    ['J Merrill Publishing, Inc.', true],
    ['your publishing agreement', true],
    ['the publishing process', true],
    ['publishing@jmerrill.one', true],
    ['Publishing Track', true],
    ['J Merrill Publishing will assign one from our registered pool.', true],
  ]

  for (const [text, ok] of cases) {
    assert.equal(terminology.validateAuthorFacingPublishingActorTerminology(text).ok, ok, text)
  }
})

test('Pilot 1 status update source rerenders with Publishing Team actor terminology', () => {
  const rendered = brand.renderAuthorCommunicationEmail({
    templateName: 'AUTHOR_STATUS_UPDATE_V1',
    templateVersion: '1.0.0',
    subject: 'Production Status Update - The Intentional Leader',
    authorName: 'Jackie',
    titleName: 'The Intentional Leader',
    preheader: 'A brief status update after your approval of the corrected interior layout proof.',
    why: 'This message is only to keep you informed while the Publishing Team continues the production process.',
    completed: [
      'The corrected proof was delivered.',
      'Your approval was received.',
      'The book is now with the Publishing Team for the next production step.',
    ],
    meaning: 'No files are attached to this update, and no action is needed from you right now.',
    authorAction: 'No response is required. You may reply to publishing@jmerrill.one if you have a question.',
    primaryActionLabel: 'View in Author Operating Center',
    primaryActionUrl: 'https://jmerrill.pub/author/portal?action=status-update&titleId=e797232b-da7a-f111-ab0f-00224820105b',
    packageInventory: ['No files are attached to this status update.'],
    nextSteps: [
      'The Publishing Team will complete the next production handling for the approved proof.',
      'Your book continues toward final production preparation.',
      'The Publishing Team will contact you only if another review or decision is needed.',
    ],
  })

  const combined = `${rendered.html}\n${rendered.text}`
  assert.equal(terminology.validateAuthorFacingPublishingActorTerminology(combined).ok, true)
  assert.match(combined, /with the Publishing Team for the next production step/)
  assert.match(combined, /while the Publishing Team continues the production process/)
  assert.match(combined, /The Publishing Team will complete the next production handling/)
  assert.doesNotMatch(combined, /with Publishing for the next production step/)
  assert.doesNotMatch(combined, /while Publishing continues/)
  assert.doesNotMatch(combined, /Publishing will complete the next production handling/)
})
