import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PR_656_HEAD,
  PR_656_MERGE_SHA,
  classifyConnectState,
  classifyReminderEligibility,
  parseKeyVaultReference,
} from './stripe_connect_post_remediation_closure.mjs'
import { classifyConnectReminderEligibility } from './stripe_connect_reminder_cadence.mjs'

test('post-remediation production release may be the proven head or merge commit', () => {
  assert.ok([PR_656_HEAD, PR_656_MERGE_SHA].includes(PR_656_HEAD))
  assert.ok([PR_656_HEAD, PR_656_MERGE_SHA].includes(PR_656_MERGE_SHA))
})

test('production app setting loader recognizes Key Vault SecretUri references', () => {
  const parsed = parseKeyVaultReference('@Microsoft.KeyVault(SecretUri=https://kv-jm1.vault.azure.net/secrets/stripe-connect-secret/abc123)')
  assert.deepEqual(parsed, {
    id: 'https://kv-jm1.vault.azure.net/secrets/stripe-connect-secret/abc123',
  })
  assert.equal(parseKeyVaultReference('sk_live_not_a_real_key'), null)
})

test('live Stripe readiness maps complete setup only from submitted, payout-enabled, no-due state', () => {
  assert.equal(classifyConnectState({
    contact: { jm1pub_stripeconnectedaccountid: 'acct_complete' },
    account: {
      id: 'acct_complete',
      details_submitted: true,
      payouts_enabled: true,
      requirements: { currently_due: [], past_due: [] },
    },
    duplicate: false,
  }), 'SETUP_COMPLETE')

  assert.equal(classifyConnectState({
    contact: { jm1pub_stripeconnectedaccountid: 'acct_due' },
    account: {
      id: 'acct_due',
      details_submitted: false,
      payouts_enabled: false,
      requirements: { currently_due: ['external_account'], past_due: [] },
    },
    duplicate: false,
  }), 'SETUP_IN_PROGRESS')

  assert.equal(classifyConnectState({
    contact: { jm1pub_stripeconnectedaccountid: 'acct_review' },
    account: {
      id: 'acct_review',
      details_submitted: true,
      payouts_enabled: false,
      requirements: { currently_due: [], past_due: [] },
    },
    duplicate: false,
  }), 'UNDER_REVIEW')
})

test('reminder gate blocks setup complete, active support, review, and duplicate states', () => {
  const base = {
    authorName: 'Author',
    contactId: 'contact-1',
    accountExists: true,
    state: 'SETUP_IN_PROGRESS',
    supportState: 'NONE',
  }

  assert.equal(classifyReminderEligibility({ ...base, state: 'SETUP_COMPLETE' }, [], new Date().toISOString()).reason, 'SETUP_COMPLETE')
  assert.equal(classifyReminderEligibility({ ...base, supportState: 'ACTIVE_SUPPORT' }, [], new Date().toISOString()).reason, 'ACTIVE_SUPPORT_THREAD')
  assert.equal(classifyReminderEligibility({ ...base, state: 'UNDER_REVIEW' }, [], new Date().toISOString()).reason, 'UNDER_REVIEW')
  assert.equal(classifyReminderEligibility({ ...base, state: 'DUPLICATE_REVIEW' }, [], new Date().toISOString()).reason, 'DUPLICATE_REVIEW')
})

test('reminder gate treats recent Connect communication as not eligible now', () => {
  const row = {
    authorName: 'Author',
    contactId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    accountExists: true,
    state: 'SETUP_IN_PROGRESS',
    supportState: 'NONE',
  }
  const logs = [{
    jm1_sourcerecordid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    jm1_actiontype: 'STRIPE_CONNECT_AUTHOR_ONBOARDING_INVITED',
  }]
  assert.equal(classifyReminderEligibility(row, logs, new Date().toISOString()).reason, 'RECENT_SETUP_COMMUNICATION')
})

test('canonical reminder cadence uses Day 0 valid delivery and sends only the next elapsed stage', () => {
  const decision = classifyConnectReminderEligibility({
    authorName: 'Author',
    contactId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    accountExists: true,
    state: 'SETUP_IN_PROGRESS',
    supportState: 'NONE',
    initialValidInvitationAt: '2026-08-20T12:00:00Z',
  }, [
    { eventType: 'INITIAL_INVITATION', deliveryStatus: 'SENT' },
  ], '2026-08-27T12:01:00Z')

  assert.equal(decision.send, true)
  assert.equal(decision.reminderStage, 'REMINDER_1')
  assert.equal(decision.disposition, 'DAY_3_ELIGIBLE')
})
