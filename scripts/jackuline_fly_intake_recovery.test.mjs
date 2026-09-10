import test from 'node:test'
import assert from 'node:assert/strict'
import {
  AUTHOR,
  buildRecoveryIdempotencyKey,
  canonicalNotice,
  classifyIntakeFieldRows,
  RECOVERY_ACTION,
} from './jackuline_fly_intake_recovery.mjs'

test('recovery idempotency key is bound to lead and manuscript hash', () => {
  const key = buildRecoveryIdempotencyKey({ sha256: 'a'.repeat(64) })
  assert.equal(key, `RECOVER-JFLY-${AUTHOR.leadId.slice(0, 8)}-${'a'.repeat(24)}`)
})

test('field reconciliation separates missing nonblocking attestations from recovered fields', () => {
  const rows = classifyIntakeFieldRows({
    lead: { description: 'Workbook/journal for women' },
    manuscript: { wordCount: 8685 },
    intake: {},
  })
  assert.equal(rows.find(row => row.field === 'Book Title').classification, 'RECOVERED')
  assert.equal(rows.find(row => row.field === 'Rights Ownership').classification, 'MISSING_NONBLOCKING')
  assert.equal(rows.find(row => row.field === 'AI Disclosure').required, false)
})

test('author notice is human-first and does not request resubmission', () => {
  const notice = canonicalNotice({})
  assert.match(notice.subject, /Editorial Review/)
  assert.match(notice.body, /do not need to resubmit/)
  assert.match(notice.body, /entered Editorial Review/)
  assert.doesNotMatch(`${notice.body}\n${notice.htmlBody}`, /Dataverse|artifact ID|execution log|system incident/i)
  assert.match(notice.htmlBody, /^<!doctype html>/)
})
