import assert from 'node:assert/strict'
import test from 'node:test'
import createJiti from 'jiti'
const { getNotificationRecipient } = createJiti(import.meta.url)('../lib/server/form-integrations.ts')

test('raw internal form notifications cannot be configured as an author send path', () => {
  const prior = process.env.FORM_NOTIFICATION_TO
  try {
    delete process.env.FORM_NOTIFICATION_TO
    assert.equal(getNotificationRecipient(), 'publishing@jmerrill.one')
    process.env.FORM_NOTIFICATION_TO = ' Publishing@JMerrill.One '
    assert.equal(getNotificationRecipient(), 'publishing@jmerrill.one')
    for (const address of ['author@example.com', 'publishing@jmerrill.one,author@example.com',
      'publishing@jmerrill.one\r\nBcc: author@example.com', 'publishing@email.jmerrill.one']) {
      process.env.FORM_NOTIFICATION_TO = address
      assert.throws(getNotificationRecipient, /INTERNAL_FORM_NOTIFICATION_RECIPIENT_DENIED/)
    }
  } finally {
    if (prior === undefined) delete process.env.FORM_NOTIFICATION_TO
    else process.env.FORM_NOTIFICATION_TO = prior
  }
})
