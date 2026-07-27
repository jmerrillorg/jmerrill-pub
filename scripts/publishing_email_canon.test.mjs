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

test('governed publishing email sets canonical From, Reply-To, and archival copy', () => {
  const draft = canon.buildGovernedPublishingEmail(base)

  assert.equal(draft.from, 'publishing@email.jmerrill.one')
  assert.equal(draft.replyTo, 'publishing@jmerrill.one')
  assert.deepEqual(draft.bcc, ['publishing@jmerrill.one'])
  assert.equal(draft.cc, undefined)
  assert.equal(canon.validatePublishingOutboundEmail(draft).ok, true)
})

test('Reply-To is mandatory and cannot rely on alias, forwarding, or operator knowledge', () => {
  assert.deepEqual(
    canon.validatePublishingOutboundEmail({
      ...base,
      from: 'publishing@email.jmerrill.one',
      replyTo: '',
      bcc: ['publishing@jmerrill.one'],
    }),
    { ok: false, blocker: 'PUBLISHING_EMAIL_BLOCKED - REPLY_TO_MISSING' },
  )

  assert.deepEqual(
    canon.validatePublishingOutboundEmail({
      ...base,
      from: 'publishing@email.jmerrill.one',
      replyTo: 'publishing@email.jmerrill.one',
      bcc: ['publishing@jmerrill.one'],
    }),
    { ok: false, blocker: 'PUBLISHING_EMAIL_BLOCKED - REPLY_TO_NOT_CANONICAL' },
  )
})

test('archival copy is mandatory and author receives one invitation recipient only', () => {
  assert.deepEqual(
    canon.validatePublishingOutboundEmail({
      ...base,
      from: 'publishing@email.jmerrill.one',
      replyTo: 'publishing@jmerrill.one',
      bcc: [],
    }),
    { ok: false, blocker: 'PUBLISHING_EMAIL_BLOCKED - ARCHIVE_COPY_MISSING' },
  )

  assert.deepEqual(
    canon.validatePublishingOutboundEmail({
      ...base,
      to: ['author@example.com', 'second-author@example.com'],
      from: 'publishing@email.jmerrill.one',
      replyTo: 'publishing@jmerrill.one',
      bcc: ['publishing@jmerrill.one'],
    }),
    { ok: false, blocker: 'PUBLISHING_EMAIL_BLOCKED - AUTHOR_RECIPIENT_COUNT_INVALID' },
  )
})

test('archive copy is hidden and duplicate archive delivery is suppressed', () => {
  assert.deepEqual(
    canon.validatePublishingOutboundEmail({
      ...base,
      from: 'publishing@email.jmerrill.one',
      replyTo: 'publishing@jmerrill.one',
      cc: ['publishing@jmerrill.one'],
    }),
    { ok: false, blocker: 'PUBLISHING_EMAIL_BLOCKED - ARCHIVE_COPY_VISIBLE' },
  )

  const internalOnly = canon.buildGovernedPublishingEmail({
    ...base,
    to: ['publishing@jmerrill.one'],
  })

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
