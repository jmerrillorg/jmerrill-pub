import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import createJiti from 'jiti'

const require = createRequire(import.meta.url)
const jiti = createJiti(import.meta.url)
const canon = jiti('../lib/server/publishing-email-canon.ts')

const PUBLISHING_CC = 'publishing@jmerrill.one'

function buildScenarioEmail(correlationId, overrides = {}) {
  return canon.buildGovernedPublishingEmail({
    to: ['author@example.com'],
    subject: 'Author-facing publishing communication',
    text: 'Plain author-facing communication body.',
    correlationId,
    ...overrides,
  })
}

function loadRelayModule() {
  process.env.ACS_EMAIL_SENDER = 'DoNotReply@email.jmerrill.one'
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
    `${source}\nmodule.exports.__test = { validatePayload, buildAcknowledgmentEmail, validateJoinInternalNotificationPayload, validateApprovedAuthorResponsePayload, buildApprovedAuthorResponseEmail };`,
    sandbox,
    { filename: filePath },
  )

  return sandbox.module.exports.__test
}

function validAuthorResponsePayload(overrides = {}) {
  return {
    messageType: 'APPROVED_AUTHOR_RESPONSE',
    diagnosticId: '64e387e0-7e6a-f111-a826-00224820105b',
    intakeReferenceCode: 'JMP-INT-202606-UFYG60',
    authorEmail: 'author@example.com',
    authorName: 'Author',
    projectTitle: 'Test Book',
    subject: 'Next step for your J Merrill Publishing submission',
    body: 'Approved author response body.',
    templateName: 'INITIAL_DIAGNOSTIC_REVIEW_NEXT_STEP',
    approvedBy: 'jackie',
    approvedOn: '2026-08-11T12:00:00.000Z',
    internalVisibilityMailbox: PUBLISHING_CC,
    futureSendRequiresInternalCopy: true,
    futureSendRequiresDataverseLog: true,
    ...overrides,
  }
}

test('author email without declared CC injects Publishing mailbox', () => {
  assert.deepEqual(buildScenarioEmail('AUTHOR-CC-001').cc, [PUBLISHING_CC])
})

test('author email already containing Publishing CC does not duplicate it', () => {
  assert.deepEqual(buildScenarioEmail('AUTHOR-CC-002', { cc: [PUBLISHING_CC] }).cc, [PUBLISHING_CC])
})

test('case-variant Publishing CC normalizes to one effective recipient', () => {
  assert.deepEqual(
    buildScenarioEmail('AUTHOR-CC-003', { cc: ['Publishing@JMERRILL.ONE', PUBLISHING_CC] }).cc,
    [PUBLISHING_CC],
  )
})

test('author email retry preserves required CC without adding duplicates', () => {
  const first = buildScenarioEmail('AUTHOR-CC-004', { cc: [PUBLISHING_CC] })
  const retry = buildScenarioEmail('AUTHOR-CC-004', { cc: first.cc })
  assert.deepEqual(retry.cc, [PUBLISHING_CC])
})

test('manual-recovery author send uses governed CC enforcement', () => {
  assert.deepEqual(buildScenarioEmail('manual-recovery:author-send').cc, [PUBLISHING_CC])
})

test('agent-triggered author send uses governed CC enforcement', () => {
  assert.deepEqual(buildScenarioEmail('agent-triggered:author-send').cc, [PUBLISHING_CC])
})

test('Stage 0 author acknowledgement relay injects Publishing CC', () => {
  const relay = loadRelayModule()
  const result = relay.validatePayload({
    reference: 'JMP-INT-202608-0AOS7L',
    to: 'author@example.com',
    firstName: 'Author',
    projectTitle: 'Test Book',
    intakeChannel: 'INT-PUB-005 /join',
  })
  assert.equal(result.ok, true)
  const email = relay.buildAcknowledgmentEmail(result.value)
  assert.equal(JSON.stringify(email.recipients.cc.map((recipient) => recipient.address)), JSON.stringify([PUBLISHING_CC]))
})

test('editorial author review relay injects Publishing CC', () => {
  const relay = loadRelayModule()
  const result = relay.validateApprovedAuthorResponsePayload(validAuthorResponsePayload({
    templateName: 'EDITORIAL_RECOMMENDATION_LETTER_V1',
    templateVersion: '1.1.0',
    htmlBody: '<!doctype html><html><body><table><tr><td>J MERRILL PUBLISHING</td></tr></table></body></html>',
    templateMetadata: { htmlSha256: 'a'.repeat(64), textSha256: 'b'.repeat(64) },
  }))
  assert.equal(result.ok, true)
  assert.equal(JSON.stringify(relay.buildApprovedAuthorResponseEmail(result.value).recipients.cc.map((recipient) => recipient.address)), JSON.stringify([PUBLISHING_CC]))
})

test('cover/proof author review relay enforces Publishing CC on approved author response path', () => {
  const relay = loadRelayModule()
  const result = relay.validateApprovedAuthorResponsePayload(validAuthorResponsePayload({ cc: [] }))
  assert.equal(result.ok, true)
  assert.equal(JSON.stringify(result.value.cc), JSON.stringify([PUBLISHING_CC]))
})

test('distribution/launch author communication uses governed CC enforcement', () => {
  assert.deepEqual(buildScenarioEmail('distribution-launch:author-update').cc, [PUBLISHING_CC])
})

test('royalty/payment author communication uses governed CC enforcement', () => {
  assert.deepEqual(buildScenarioEmail('royalty-payment:author-update').cc, [PUBLISHING_CC])
})

test('internal-only notification does not apply author CC rule', () => {
  const relay = loadRelayModule()
  const result = relay.validateJoinInternalNotificationPayload({
    notificationType: 'JOIN_INTAKE_RECEIVED',
    reference: 'JMP-INT-202608-0AOS7L',
    recipient: PUBLISHING_CC,
    to: PUBLISHING_CC,
    authorName: 'Author',
    authorEmail: 'author@example.com',
    projectTitle: 'Test Book',
    intakeChannel: 'INT-PUB-005 /join',
  })
  assert.equal(result.ok, true)
  assert.equal('cc' in result.value, false)
})

test('missing required CC that cannot be injected fails safely', () => {
  const validation = canon.validatePublishingOutboundEmail({
    from: 'publishing@email.jmerrill.one',
    to: ['author@example.com'],
    replyTo: PUBLISHING_CC,
    cc: ['someone-else@example.com'],
    bcc: [],
    subject: 'Author-facing publishing communication',
    text: 'Plain author-facing communication body.',
    correlationId: 'AUTHOR-CC-013',
  })
  assert.deepEqual(validation, { ok: false, blocker: 'PUBLISHING_EMAIL_BLOCKED - PUBLISHING_CC_MISSING' })
})

test('replay/idempotent send guard preserves one Publishing CC and does not imply duplicate communication', () => {
  const first = buildScenarioEmail('AUTHOR-CC-014')
  const replay = buildScenarioEmail('AUTHOR-CC-014', { cc: [...first.cc, PUBLISHING_CC] })
  assert.deepEqual(replay.cc, [PUBLISHING_CC])
})
