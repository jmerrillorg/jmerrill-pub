import assert from 'node:assert/strict'
import test from 'node:test'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const canon = jiti('../lib/server/publishing-email-canon.ts')

const base = {
  to: ['author@example.com'],
  subject: 'Author Payout Enrollment for J Merrill Publishing',
  text: 'Please complete enrollment: https://connect.stripe.com/setup/s/acct_mock/token',
  correlationId: 'APE-TEST-001',
}

test('governed publishing email sets canonical From, Reply-To, and Publishing CC', () => {
  const draft = canon.buildGovernedPublishingEmail(base)

  assert.equal(draft.from, 'publishing@email.jmerrill.one')
  assert.equal(draft.replyTo, 'publishing@jmerrill.one')
  assert.deepEqual(draft.cc, ['publishing@jmerrill.one'])
  assert.deepEqual(draft.bcc, [])
  assert.equal(canon.validatePublishingOutboundEmail(draft).ok, true)
})

test('Publishing CC is injected once and normalized case-insensitively', () => {
  assert.deepEqual(canon.ensurePublishingAuthorEmailCc({ to: ['author@example.com'] }), ['publishing@jmerrill.one'])
  assert.deepEqual(
    canon.ensurePublishingAuthorEmailCc({
      to: ['author@example.com'],
      cc: ['Publishing@JMERRILL.ONE', 'publishing@jmerrill.one'],
    }),
    ['publishing@jmerrill.one'],
  )
})

test('Reply-To is mandatory and cannot rely on alias, forwarding, or operator knowledge', () => {
  assert.deepEqual(
    canon.validatePublishingOutboundEmail({
      ...base,
      from: 'publishing@email.jmerrill.one',
      replyTo: '',
      cc: ['publishing@jmerrill.one'],
    }),
    { ok: false, blocker: 'PUBLISHING_EMAIL_BLOCKED - REPLY_TO_MISSING' },
  )

  assert.deepEqual(
    canon.validatePublishingOutboundEmail({
      ...base,
      from: 'publishing@email.jmerrill.one',
      replyTo: 'publishing@email.jmerrill.one',
      cc: ['publishing@jmerrill.one'],
    }),
    { ok: false, blocker: 'PUBLISHING_EMAIL_BLOCKED - REPLY_TO_NOT_CANONICAL' },
  )
})

test('Publishing CC is mandatory and author receives one invitation recipient only', () => {
  assert.deepEqual(
    canon.validatePublishingOutboundEmail({
      ...base,
      from: 'publishing@email.jmerrill.one',
      replyTo: 'publishing@jmerrill.one',
      cc: [],
    }),
    { ok: false, blocker: 'PUBLISHING_EMAIL_BLOCKED - PUBLISHING_CC_MISSING' },
  )

  assert.deepEqual(
    canon.validatePublishingOutboundEmail({
      ...base,
      to: ['author@example.com', 'second-author@example.com'],
      from: 'publishing@email.jmerrill.one',
      replyTo: 'publishing@jmerrill.one',
      cc: ['publishing@jmerrill.one'],
    }),
    { ok: false, blocker: 'PUBLISHING_EMAIL_BLOCKED - AUTHOR_RECIPIENT_COUNT_INVALID' },
  )
})

test('Publishing copy must be CC, and duplicate delivery is suppressed when Publishing is the primary recipient', () => {
  assert.deepEqual(
    canon.validatePublishingOutboundEmail({
      ...base,
      from: 'publishing@email.jmerrill.one',
      replyTo: 'publishing@jmerrill.one',
      bcc: ['publishing@jmerrill.one'],
    }),
    { ok: false, blocker: 'PUBLISHING_EMAIL_BLOCKED - PUBLISHING_CC_MISSING' },
  )

  const internalOnly = canon.buildGovernedPublishingEmail({
    ...base,
    to: ['publishing@jmerrill.one'],
  })

  assert.deepEqual(internalOnly.cc, [])
  assert.deepEqual(internalOnly.bcc, [])
  assert.equal(canon.validatePublishingOutboundEmail(internalOnly).ok, true)
})

test('archive copy redacts transient Account Link URLs and retains correlation', () => {
  const draft = canon.buildGovernedPublishingEmail(base)
  const archive = canon.buildRedactedPublishingArchiveCopy(draft)

  assert.equal(archive.to, 'publishing@jmerrill.one')
  assert.equal(archive.replyTo, 'publishing@jmerrill.one')
  assert.match(archive.text, /Correlation ID: APE-TEST-001/)
  assert.match(archive.text, /\[TRANSIENT ACCOUNT LINK REDACTED\]/)
  assert.doesNotMatch(archive.text, /connect\.stripe\.com\/setup\/s\//)
})
