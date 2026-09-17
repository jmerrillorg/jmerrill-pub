import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const agreement = fs.readFileSync('lib/server/publishing/agreement-execution-reconciliation.ts', 'utf8')
const consumer = fs.readFileSync('azure-functions/diagnostic-ai-runner/src/orchestration/paymentElectionCommunicationConsumer.js', 'utf8')

test('executed agreement creates a durable current-only payment-election requirement', () => {
  assert.match(agreement, /PAYMENT_ELECTION_ACTION_REQUEST_OPEN/)
  assert.match(agreement, /communicationAuthority=\$\{PAYMENT_ELECTION_COMMUNICATION_AUTHORITY\}/)
  assert.match(agreement, /historicalReplayAllowed=NO/)
  assert.match(agreement, /PAYMENT_OPTION_ALREADY_SELECTED/)
})

test('payment-election communication is template-only and preserves payment separation', () => {
  assert.match(consumer, /PUBLISHING\.PAYMENT_ELECTION_REQUIRED/)
  assert.match(consumer, /paymentRequestCreated=0/)
  assert.match(consumer, /deliveryReadback=ACCEPTANCE_ONLY/)
  assert.doesNotMatch(consumer, /publishing@email\.jmerrill\.one/)
})
