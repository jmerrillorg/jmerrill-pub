import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import createJiti from 'jiti'

const require = createRequire(import.meta.url)
const jiti = createJiti(import.meta.url)
const brand = jiti('../lib/server/author-communication-brand.ts')

function renderCoverReview(overrides = {}) {
  return brand.renderCoverReviewAuthorCommunication({
    authorName: 'Jackie',
    titleName: 'The Intentional Leader',
    primaryActionUrl: 'https://jmerrill.pub/author/portal?action=review-package&titleId=e797232b-da7a-f111-ab0f-00224820105b',
    artifactLabel: 'The Intentional Leader - Cover Concept 001.png',
    ...overrides,
  })
}

function validateContract(rendered, overrides = {}) {
  return brand.validateAuthorCommunicationRenderContract({
    html: rendered.html,
    text: rendered.text,
    templateName: rendered.metadata.templateName,
    templateVersion: rendered.metadata.templateVersion,
    templateMetadata: rendered.metadata,
    ...overrides,
  })
}

function loadRelayModule() {
  process.env.ACS_EMAIL_SENDER = 'publishing@email.jmerrill.one'
  process.env.ACS_AUTHOR_RESPONSE_EMAIL_SENDER = 'publishing@email.jmerrill.one'

  const routes = {}
  const filePath = path.join(
    process.cwd(),
    'azure-functions',
    'acs-email-relay',
    'src',
    'functions',
    'sendAuthorAcknowledgment.js',
  )
  const source = fs.readFileSync(filePath, 'utf8')
  const sandbox = {
    module: { exports: {} },
    exports: {},
    routes,
    require: (name) => {
      if (name === '@azure/functions') return { app: { http: (name, config) => { routes[name] = config } } }
      if (name === '@azure/communication-email') return { EmailClient: class EmailClient {} }
      if (name === '@azure/identity') return { DefaultAzureCredential: class DefaultAzureCredential {} }
      return require(name)
    },
    process,
    Buffer,
  }

  vm.runInNewContext(
    `${source}\nmodule.exports.__test = { validateApprovedAuthorResponsePayload, buildApprovedAuthorResponseEmail };`,
    sandbox,
    { filename: filePath },
  )

  return sandbox.module.exports.__test
}

function validRelayPayload(overrides = {}) {
  const rendered = renderCoverReview()
  return {
    messageType: 'APPROVED_AUTHOR_RESPONSE',
    diagnosticId: '64e387e0-7e6a-f111-a826-00224820105b',
    intakeReferenceCode: 'JMP-INT-202606-UFYG60',
    authorEmail: 'author@example.com',
    authorName: 'Jackie',
    projectTitle: 'The Intentional Leader',
    subject: rendered.subject,
    body: rendered.text,
    htmlBody: rendered.html,
    templateName: rendered.metadata.templateName,
    templateVersion: rendered.metadata.templateVersion,
    templateMetadata: rendered.metadata,
    approvedBy: 'jackie',
    approvedOn: '2026-08-11T12:00:00.000Z',
    internalVisibilityMailbox: 'publishing@jmerrill.one',
    futureSendRequiresInternalCopy: true,
    futureSendRequiresDataverseLog: true,
    bcc: ['publishing@jmerrill.one'],
    attachments: [
      {
        name: 'The Intentional Leader - Cover Concept 001.png',
        contentType: 'image/png',
        contentInBase64: Buffer.from('synthetic cover image bytes').toString('base64'),
      },
    ],
    ...overrides,
  }
}

test('canonical renderer stamps render-enforcement metadata', () => {
  const rendered = renderCoverReview()

  assert.equal(rendered.metadata.renderMode, 'CANONICAL_HTML')
  assert.equal(rendered.metadata.renderTemplateGuard, 'PASS')
  assert.equal(rendered.metadata.renderer, 'JM1 Enterprise Communication Renderer')
  assert.equal(rendered.metadata.enterpriseStandard, 'JM1 Enterprise Communication Standard v1.0')
})

test('cover review uses the governed author review package template', () => {
  const rendered = renderCoverReview()

  assert.equal(rendered.metadata.templateName, 'AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1')
  assert.equal(rendered.metadata.templateVersion, '1.0.0')
  assert.match(rendered.subject, /Cover Design Review - The Intentional Leader/)
})

test('cover review renders publishing-grade HTML shell', () => {
  const rendered = renderCoverReview()

  assert.match(rendered.html, /<!doctype html>/i)
  assert.match(rendered.html, /<table role="presentation"/)
  assert.match(rendered.html, /J MERRILL PUBLISHING/)
  assert.match(rendered.html, /A Division of J Merrill One/)
  assert.match(rendered.html, /Helping Authors Help Themselves\./)
})

test('cover review renders a styled CTA button', () => {
  const rendered = renderCoverReview()

  assert.match(rendered.html, /<a href="https:\/\/jmerrill\.pub\/author\/portal\?action=review-package&amp;titleId=e797232b-da7a-f111-ab0f-00224820105b"[^>]+style="[^"]*display:inline-block/i)
  assert.match(rendered.html, /View in Author Operating Center/)
})

test('cover review includes required author-facing sections', () => {
  const rendered = renderCoverReview()

  for (const label of ['Why you are receiving this', 'What has been completed', "What&#39;s attached", 'What we need from you', 'How to respond', 'What happens next', 'Support']) {
    assert.match(rendered.html, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})

test('cover review plain-text body carries portal reference and signature', () => {
  const rendered = renderCoverReview()

  assert.match(rendered.text, /Optional Author Operating Center access: https:\/\/jmerrill\.pub\/author\/portal/)
  assert.match(rendered.text, /The Publishing Team\nJ Merrill Publishing, Inc\./)
})

test('cover review does not expose internal execution language', () => {
  const rendered = renderCoverReview()

  assert.doesNotMatch(`${rendered.html}\n${rendered.text}`, /Dataverse|execution log|workflow record|internal instruction|package manifest|response mechanism|evidence file/i)
})

test('render contract passes for canonical cover review', () => {
  const rendered = renderCoverReview()
  const validation = validateContract(rendered)

  assert.equal(validation.ok, true)
  assert.equal(validation.brandLanguageGuard, 'PASS')
  assert.equal(validation.leakageGuard, 'PASS')
  assert.equal(validation.renderTemplateGuard, 'PASS')
})

test('render contract blocks missing HTML', () => {
  const rendered = renderCoverReview()
  const validation = validateContract(rendered, { html: '' })

  assert.equal(validation.ok, false)
  assert.equal(validation.renderTemplateGuard, 'FAIL')
  assert.match(validation.blockers.join(','), /HTML_BODY_MISSING/)
})

test('render contract blocks simple transactional HTML', () => {
  const rendered = renderCoverReview()
  const validation = validateContract(rendered, {
    html: '<!doctype html><html><body><table><tr><td>J MERRILL PUBLISHING</td></tr></table><p>Your package is ready.</p></body></html>',
  })

  assert.equal(validation.ok, false)
  assert.match(validation.blockers.join(','), /CANONICAL_STRUCTURE|DIVISION_LINE|PROMISE_LINE|CTA_BUTTON_TREATMENT_MISSING|AUTHOR_COMMUNICATION_BLOCKED/)
})

test('render contract blocks missing metadata', () => {
  const rendered = renderCoverReview()
  const validation = validateContract(rendered, { templateMetadata: null })

  assert.equal(validation.ok, false)
  assert.match(validation.blockers.join(','), /CANONICAL_RENDER_MODE_METADATA_MISSING/)
})

test('render contract blocks wrong renderer metadata', () => {
  const rendered = renderCoverReview()
  const validation = validateContract(rendered, {
    templateMetadata: { ...rendered.metadata, renderer: 'Manual HTML Builder' },
  })

  assert.equal(validation.ok, false)
  assert.match(validation.blockers.join(','), /CANONICAL_RENDERER_METADATA_MISSING/)
})

test('render contract blocks implicit plain text for canonical templates', () => {
  const rendered = renderCoverReview()
  const validation = validateContract(rendered, {
    html: '',
    renderMode: 'CANONICAL_HTML',
  })

  assert.equal(validation.ok, false)
  assert.match(validation.blockers.join(','), /HTML_BODY_MISSING/)
})

test('plain text exception requires explicit registered template', () => {
  const validation = brand.validateAuthorCommunicationRenderContract({
    templateName: 'AUTHOR_PLAIN_TEXT_ADMIN_NOTICE_V1',
    templateVersion: '1.0.0',
    text: 'J MERRILL PUBLISHING\nA plain text exception notice.',
    html: '',
    renderMode: 'PLAIN_TEXT_AUTHORIZED',
  })

  assert.equal(validation.ok, true)
  assert.equal(validation.renderMode, 'PLAIN_TEXT_AUTHORIZED')
})

test('plain text exception is rejected for normal author review template', () => {
  const rendered = renderCoverReview()
  const validation = validateContract(rendered, {
    html: '',
    renderMode: 'PLAIN_TEXT_AUTHORIZED',
  })

  assert.equal(validation.ok, false)
  assert.match(validation.blockers.join(','), /PLAIN_TEXT_NOT_AUTHORIZED/)
})

test('unknown author-facing email type fails closed', () => {
  const rendered = renderCoverReview()
  const validation = validateContract(rendered, {
    templateName: 'UNKNOWN_AUTHOR_TEMPLATE_V1',
  })

  assert.equal(validation.ok, false)
  assert.match(validation.blockers.join(','), /UNKNOWN_AUTHOR_FACING_EMAIL_TYPE/)
})

test('registered author-facing matrix contains status update and cover review paths', () => {
  const names = brand.AUTHOR_FACING_COMMUNICATION_RENDER_MATRIX.map((row) => `${row.communicationType}:${row.templateName}:${row.renderMode}`)

  assert.ok(names.some((row) => row.includes('status update:AUTHOR_STATUS_UPDATE_V1:CANONICAL_HTML')))
  assert.ok(names.some((row) => row.includes('cover review:AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1:CANONICAL_HTML')))
  assert.ok(names.some((row) => row.includes('final developmental review:AUTHOR_FINAL_DEVELOPMENTAL_REVIEW_V1:CANONICAL_HTML')))
})

test('final developmental review renders as reply-only with no portal friction', () => {
  const rendered = brand.renderAuthorCommunicationEmail({
    templateName: 'AUTHOR_FINAL_DEVELOPMENTAL_REVIEW_V1',
    templateVersion: '1.0.0',
    subject: 'Final Developmental Review - The General’s Will and Last Testament',
    authorName: 'Iyorwuese',
    titleName: 'The General’s Will and Last Testament',
    preheader: 'Your revised developmental-edit manuscript is attached for final review.',
    why: 'The Publishing Team has incorporated the revisions you requested during developmental editing and prepared the updated manuscript for your final review.',
    completed: [
      'Your requested developmental-edit corrections have been incorporated.',
      'The Publishing Team completed its verification of the revised manuscript.',
    ],
    meaning: 'Please review the attached manuscript and reply to this email with either Approved or Changes still required.',
    authorAction: 'Reply to this email with Approved or Changes still required. If anything still needs correction, please identify the changes in your reply.',
    primaryActionLabel: '',
    primaryActionUrl: '',
    replyOnly: true,
    packageInventory: ['The General’s Will and Last Testament - Editorial Working Version - Jackie Restoration.docx'],
    nextSteps: [
      'If you approve the updated manuscript, the Publishing Team can complete the developmental-edit stage.',
      'If additional changes are required, developmental editing will remain open while the Publishing Team addresses the next correction round.',
    ],
  })
  const validation = validateContract(rendered)

  assert.equal(validation.ok, true)
  assert.doesNotMatch(`${rendered.html}\n${rendered.text}`, /author\/portal|Author Operating Center|<a\b[^>]+href=/i)
  assert.match(rendered.text, /Approved/)
  assert.match(rendered.text, /Changes still required/)
})

test('registered author-facing matrix includes future lifecycle communications', () => {
  const templates = new Set(brand.AUTHOR_FACING_COMMUNICATION_RENDER_MATRIX.map((row) => row.templateName))

  for (const template of [
    'AUTHOR_DECISION_REQUEST_V1',
    'AUTHOR_CORRECTION_REQUEST_V1',
    'AUTHOR_ONBOARDING_V1',
    'AUTHOR_PRODUCTION_UPDATE_V1',
    'AUTHOR_DISTRIBUTION_RELEASE_UPDATE_V1',
    'AUTHOR_LAUNCH_COMMUNICATION_V1',
    'AUTHOR_POST_PUBLICATION_UPDATE_V1',
  ]) {
    assert.equal(templates.has(template), true, template)
  }
})

test('relay accepts canonical author review package payload', () => {
  const relay = loadRelayModule()
  const result = relay.validateApprovedAuthorResponsePayload(validRelayPayload())

  assert.equal(result.ok, true)
})

test('relay preserves canonical HTML in ACS message content', () => {
  const relay = loadRelayModule()
  const result = relay.validateApprovedAuthorResponsePayload(validRelayPayload())
  const email = relay.buildApprovedAuthorResponseEmail(result.value)

  assert.equal(email.content.html, result.value.htmlBody)
  assert.match(email.content.html, /display:inline-block/)
  assert.match(email.content.html, /J MERRILL PUBLISHING/)
})

test('relay rejects author review package without canonical render mode', () => {
  const relay = loadRelayModule()
  const result = relay.validateApprovedAuthorResponsePayload(validRelayPayload({
    templateMetadata: {
      htmlSha256: 'a'.repeat(64),
      textSha256: 'b'.repeat(64),
      qualityGate: 'PASS',
    },
  }))

  assert.equal(result.ok, false)
  assert.equal(result.reason, 'AUTHOR_REVIEW_PACKAGE_CANONICAL_RENDER_MODE_REQUIRED')
})

test('relay rejects author review package without canonical renderer', () => {
  const relay = loadRelayModule()
  const rendered = renderCoverReview()
  const result = relay.validateApprovedAuthorResponsePayload(validRelayPayload({
    templateMetadata: { ...rendered.metadata, renderer: 'Manual HTML Builder' },
  }))

  assert.equal(result.ok, false)
  assert.equal(result.reason, 'AUTHOR_REVIEW_PACKAGE_CANONICAL_RENDERER_REQUIRED')
})

test('relay rejects author review package without styled CTA', () => {
  const relay = loadRelayModule()
  const rendered = renderCoverReview()
  const result = relay.validateApprovedAuthorResponsePayload(validRelayPayload({
    htmlBody: rendered.html
      .replace(/<a\b/i, '<span')
      .replace(/<\/a>/i, '</span>')
      .replace(/display:\s*inline-block;?/i, '')
      .replace(/background:[^;"]+;?/i, ''),
  }))

  assert.equal(result.ok, false)
  assert.equal(result.reason, 'AUTHOR_REVIEW_PACKAGE_CTA_BUTTON_REQUIRED')
})

test('relay rejects author review package with internal language', () => {
  const relay = loadRelayModule()
  const rendered = renderCoverReview()
  const result = relay.validateApprovedAuthorResponsePayload(validRelayPayload({
    htmlBody: rendered.html.replace('Support', 'Support Dataverse'),
  }))

  assert.equal(result.ok, false)
  assert.equal(result.reason, 'AUTHOR_REVIEW_PACKAGE_INTERNAL_LANGUAGE_BLOCKED')
})

test('relay preserves attachment bytes while enforcing canonical HTML', () => {
  const relay = loadRelayModule()
  const bytes = Buffer.from('synthetic cover image bytes '.repeat(50))
  const result = relay.validateApprovedAuthorResponsePayload(validRelayPayload({
    attachments: [{
      name: 'The Intentional Leader - Cover Concept 001.png',
      contentType: 'image/png',
      contentInBase64: bytes.toString('base64'),
    }],
  }))
  const email = relay.buildApprovedAuthorResponseEmail(result.value)

  assert.equal(Buffer.byteLength(email.attachments[0].contentInBase64, 'base64'), bytes.byteLength)
})

test('status update remains canonical HTML', () => {
  const rendered = brand.renderAuthorCommunicationEmail({
    templateName: 'AUTHOR_STATUS_UPDATE_V1',
    templateVersion: '1.0.0',
    subject: 'Production Status Update - The Intentional Leader',
    authorName: 'Jackie',
    titleName: 'The Intentional Leader',
    preheader: 'A brief status update after your approval.',
    why: 'This message is only to keep you informed while the Publishing Team continues the production process.',
    completed: ['The corrected proof was delivered.'],
    meaning: 'No files are attached to this update, and no action is needed from you right now.',
    authorAction: 'No response is required. You may reply to publishing@jmerrill.one if you have a question.',
    primaryActionLabel: 'View in Author Operating Center',
    primaryActionUrl: 'https://jmerrill.pub/author/portal?action=status-update&titleId=e797232b-da7a-f111-ab0f-00224820105b',
    packageInventory: ['No files are attached to this status update.'],
    nextSteps: ['The Publishing Team will contact you only if another review or decision is needed.'],
  })
  const validation = validateContract(rendered)

  assert.equal(validation.ok, true)
  assert.equal(rendered.metadata.renderMode, 'CANONICAL_HTML')
})
