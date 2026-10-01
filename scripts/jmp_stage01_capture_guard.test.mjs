import assert from 'node:assert/strict'
import test from 'node:test'
import { hasConfirmedCanonicalFormCapture } from '../lib/server/form-integrations.ts'

function result(ingestion, notification) {
  return { ingestion: { status: ingestion }, notification: { status: notification } }
}

test('an inquiry is captured only when canonical ingestion and staff notification both succeed', () => {
  assert.equal(hasConfirmedCanonicalFormCapture(result('sent', 'sent')), true)
  assert.equal(hasConfirmedCanonicalFormCapture(result('skipped', 'sent')), false)
  assert.equal(hasConfirmedCanonicalFormCapture(result('failed', 'sent')), false)
  assert.equal(hasConfirmedCanonicalFormCapture(result('sent', 'failed')), false)
})
