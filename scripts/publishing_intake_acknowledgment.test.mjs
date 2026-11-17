import assert from 'node:assert/strict'
import test from 'node:test'
import { createJiti } from 'jiti'

const jiti = createJiti(import.meta.url, { alias: { '@': new URL('..', import.meta.url).pathname } })
const { sendJoinAuthorAcknowledgment } = await jiti.import('../lib/publishing/intake/authorAcknowledgment.ts')

test('acknowledgment follows current manuscript custody, not the initial upload choice', async () => {
  const originalFetch = globalThis.fetch
  const originalEnv = { ...process.env }
  const payloads = []
  process.env.JM1_JOIN_AUTHOR_ACK_RELAY_URL = 'https://relay.invalid'
  process.env.JM1_JOIN_AUTHOR_ACK_RELAY_KEY = 'synthetic-only'
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://relay.invalid/api/send-author-acknowledgment')
    payloads.push(JSON.parse(options.body))
    return Response.json({ communicationComplete: false, operationId: 'synthetic' }, { status: 202 })
  }
  try {
    for (const manuscriptLifecycleState of ['PENDING_UPLOAD', 'UPLOADED', 'NORMALIZATION_PENDING']) {
      const result = await sendJoinAuthorAcknowledgment({
        reference: 'SYNTHETIC', email: 'fixture@example.invalid', firstName: 'Fixture',
        bookTitle: 'Synthetic inquiry', manuscriptSubmissionChoice: 'later', manuscriptLifecycleState,
      })
      assert.equal(result.status, 'pending', 'Provider acceptance must not become mailbox delivery proof')
    }
    assert.match(payloads[0].nextStep, /add the manuscript/)
    assert.match(payloads[1].nextStep, /manuscript have been received/)
    assert.doesNotMatch(payloads[1].nextStep, /add the manuscript/)
    assert.match(payloads[2].nextStep, /format requirements/)
    assert.doesNotMatch(payloads[2].nextStep, /add the manuscript/)
    assert.ok(payloads.every(p => p.cc.includes('publishing@jmerrill.one')))
  } finally {
    globalThis.fetch = originalFetch
    process.env = originalEnv
  }
})
