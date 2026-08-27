import assert from 'node:assert/strict'
import test from 'node:test'

import {
  STRIPE_CONNECT_REMINDER_POLICY_ID,
  buildReminderEvent,
  classifyConnectReminderEligibility,
  renderStripeConnectReminderEmail,
  validateStripeConnectReminderMessage,
} from './stripe_connect_reminder_cadence.mjs'

const base = Object.freeze({
  authorName: 'Mildred Beard',
  contactId: '11111111-1111-1111-1111-111111111111',
  authorRelationshipId: '22222222-2222-2222-2222-222222222222',
  stripeAccountId: 'acct_1U8RzdJjsoYeZ82A',
  accountExists: true,
  initialValidInvitationAt: '2026-08-20T12:00:00Z',
  supportState: 'NONE',
  state: 'SETUP_IN_PROGRESS',
})

test('Day 3 eligible / not started selects only reminder 1', () => {
  const decision = classifyConnectReminderEligibility({
    ...base,
    state: 'NOT_STARTED',
  }, [{ eventType: 'INITIAL_INVITATION', deliveryStatus: 'SENT' }], '2026-08-23T12:01:00Z')

  assert.equal(decision.send, true)
  assert.equal(decision.reminderStage, 'REMINDER_1')
  assert.equal(decision.disposition, 'DAY_3_ELIGIBLE')
})

test('Day 7 eligible / started selects reminder 2 after reminder 1', () => {
  const decision = classifyConnectReminderEligibility(base, [
    { eventType: 'INITIAL_INVITATION', deliveryStatus: 'SENT' },
    { eventType: 'REMINDER_1', deliveryStatus: 'SENT', sentAt: '2026-08-23T12:01:00Z' },
  ], '2026-08-27T12:01:00Z')

  assert.equal(decision.send, true)
  assert.equal(decision.reminderStage, 'REMINDER_2')
  assert.equal(decision.disposition, 'DAY_7_ELIGIBLE')
})

test('Day 14 eligible selects final automated reminder', () => {
  const decision = classifyConnectReminderEligibility(base, [
    { eventType: 'INITIAL_INVITATION', deliveryStatus: 'SENT' },
    { eventType: 'REMINDER_1', deliveryStatus: 'SENT' },
    { eventType: 'REMINDER_2', deliveryStatus: 'SENT' },
  ], '2026-09-03T12:01:00Z')

  assert.equal(decision.send, true)
  assert.equal(decision.reminderStage, 'FINAL_REMINDER')
  assert.equal(decision.disposition, 'DAY_14_ELIGIBLE')
})

test('setup complete, under review, active support, identity review, and duplicate review do not send', () => {
  for (const state of ['SETUP_COMPLETE', 'UNDER_REVIEW', 'IDENTITY_REVIEW', 'DUPLICATE_REVIEW']) {
    const decision = classifyConnectReminderEligibility({ ...base, state }, [], '2026-09-03T12:01:00Z')
    assert.equal(decision.send, false)
    assert.equal(decision.reason, state)
  }

  const support = classifyConnectReminderEligibility({ ...base, state: 'MORE_INFORMATION_NEEDED', supportState: 'ACTIVE_SUPPORT' }, [], '2026-09-03T12:01:00Z')
  assert.equal(support.send, false)
  assert.equal(support.disposition, 'SUPPORT_HOLD')
  assert.equal(support.reason, 'ACTIVE_SUPPORT_THREAD')
})

test('expired Account Link scenario requires same canonical account and does not create a new account', () => {
  const decision = classifyConnectReminderEligibility(base, [{ eventType: 'INITIAL_INVITATION', deliveryStatus: 'SENT' }], '2026-08-23T12:01:00Z')
  const event = buildReminderEvent({
    row: base,
    decision,
    communication: {
      deliveryStatus: 'SENT',
      communicationId: 'msg-1',
      accountLinkGenerated: true,
      sentAt: '2026-08-23T12:02:00Z',
    },
  })

  assert.equal(event.stripeAccountId, base.stripeAccountId)
  assert.equal(event.accountLinkGenerated, true)
  assert.equal(event.eventType, 'REMINDER_1')
})

test('same reminder already sent and same-day duplicate attempt fail closed', () => {
  const history = [
    { eventType: 'INITIAL_INVITATION', deliveryStatus: 'SENT' },
    { eventType: 'REMINDER_1', deliveryStatus: 'SENT', sentAt: '2026-08-23T12:01:00Z' },
  ]
  const next = classifyConnectReminderEligibility(base, history, '2026-08-23T13:01:00Z')
  assert.equal(next.send, false)
  assert.equal(next.reason, 'NOT_DUE')

  const duplicate = classifyConnectReminderEligibility(base, [
    ...history,
    { eventType: 'REMINDER_2', deliveryStatus: 'FAILED', sentAt: '2026-08-27T12:01:00Z' },
  ], '2026-08-27T13:01:00Z')
  assert.equal(duplicate.send, false)
  assert.equal(duplicate.reason, 'SAME_DAY_DUPLICATE_GUARD')
})

test('reminder history partial sends at most one next governed stage', () => {
  const decision = classifyConnectReminderEligibility(base, [
    { jm1_actiontype: 'STRIPE_CONNECT_SETUP_LINK_REFRESHED', jm1_actiondescription: 'Stripe Connect setup evidence' },
  ], '2026-09-20T12:01:00Z')

  assert.equal(decision.send, true)
  assert.equal(decision.reminderStage, 'REMINDER_1')
  assert.match(decision.reason, /REMINDER_HISTORY_PARTIAL/)
})

test('final reminder already sent stops automation after Day 14', () => {
  const decision = classifyConnectReminderEligibility(base, [
    { eventType: 'INITIAL_INVITATION', deliveryStatus: 'SENT' },
    { eventType: 'REMINDER_1', deliveryStatus: 'SENT' },
    { eventType: 'REMINDER_2', deliveryStatus: 'SENT' },
    { eventType: 'FINAL_REMINDER', deliveryStatus: 'SENT' },
  ], '2026-09-20T12:01:00Z')

  assert.equal(decision.send, false)
  assert.equal(decision.disposition, 'AUTOMATION_COMPLETE')
  assert.equal(decision.reason, 'FINAL_REMINDER_ALREADY_SENT')
})

test('Human-First reminder copy is setup-only and uses canonical Publishing sender route', () => {
  const rendered = renderStripeConnectReminderEmail({
    authorName: 'Mildred Beard',
    stage: 'REMINDER_2',
    state: 'SETUP_IN_PROGRESS',
    linkUrl: 'https://jmerrill.pub/api/author/stripe/connect/refresh?token=mock',
  })

  assert.equal(rendered.validation.decision, 'ALLOW')
  assert.equal(rendered.validation.policyId, STRIPE_CONNECT_REMINDER_POLICY_ID)
  assert.match(rendered.html, /Continue Direct Deposit Setup/)
  assert.match(rendered.text, /No separate J Merrill Publishing activation code is required/)
  assert.doesNotMatch(rendered.text, /royalty amount|royalty payment date|payment schedule|payout|PaymentIntent/i)
})

test('wrong sender, internal Stripe fields, and royalty/payment language fail closed', () => {
  const result = validateStripeConnectReminderMessage({
    from: 'noreply@email.jmerrill.one',
    replyTo: 'publishing@jmerrill.one',
    cc: 'publishing@jmerrill.one',
    subject: 'Complete Your Direct Deposit Setup',
    text: 'Good day, Mildred,\nrequirements.currently_due payouts_enabled royalty payment date PaymentIntent',
    html: '<!doctype html><html><body>runtime artifact</body></html>',
  })

  assert.equal(result.decision, 'DENY')
  assert.ok(result.violations.includes('WRONG_SENDER'))
  assert.ok(result.violations.some((violation) => violation.startsWith('PROHIBITED_LANGUAGE')))
})
