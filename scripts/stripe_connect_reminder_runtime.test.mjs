import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CORRECTIVE_DAY0_EVENT,
  REMINDER_ACTION_TYPES,
  buildRuntimeEstate,
  deriveReminderHistory,
  findCorrectiveDay0Anchor,
} from './stripe_connect_reminder_runtime.mjs'

test('corrective Day 0 anchor is sourced from CONNECT_CORRECTIVE_REISSUE, not older invitations', () => {
  const logs = [
    { jm1_actiontype: 'STRIPE_CONNECT_AUTHOR_ONBOARDING_INVITED', jm1_sourcerecordid: 'contact-1', createdon: '2026-08-22T12:00:00Z' },
    { jm1_actiontype: CORRECTIVE_DAY0_EVENT, jm1_sourcerecordid: 'contact-1', createdon: '2026-08-27T16:56:00Z' },
  ]

  assert.equal(findCorrectiveDay0Anchor(logs, 'contact-1'), '2026-08-27T16:56:00Z')
})

test('runtime maps Dataverse reminder action types into canonical reminder history', () => {
  const history = deriveReminderHistory([
    { jm1_actiontype: CORRECTIVE_DAY0_EVENT, jm1_sourcerecordid: 'contact-1', createdon: '2026-08-27T16:56:00Z' },
    { jm1_actiontype: REMINDER_ACTION_TYPES.REMINDER_1, jm1_sourcerecordid: 'contact-1', createdon: '2026-08-30T17:00:00Z' },
    { jm1_actiontype: REMINDER_ACTION_TYPES.REMINDER_2, jm1_sourcerecordid: 'contact-1', createdon: '2026-09-03T17:00:00Z' },
  ], 'contact-1')

  assert.deepEqual(history.map((event) => event.eventType), ['INITIAL_INVITATION', 'REMINDER_1', 'REMINDER_2'])
})

test('runtime estate keeps corrected Day 0, active support, and live Stripe states together', () => {
  const liveSource = {
    contacts: [
      {
        contactid: 'contact-1',
        fullname: 'Author One',
        emailaddress1: 'author@example.invalid',
        jm1pub_stripeconnectedaccountid: 'acct_one',
      },
      {
        contactid: 'contact-2',
        fullname: 'Mildred Beard',
        emailaddress1: 'mildred@example.invalid',
        jm1pub_stripeconnectedaccountid: 'acct_two',
      },
    ],
    profiles: [
      { jm1_authorprofileid: 'profile-1', jm1_name: 'Author One', _jm1_contact_value: 'contact-1' },
      { jm1_authorprofileid: 'profile-2', jm1_name: 'Mildred Beard', _jm1_contact_value: 'contact-2' },
    ],
    logs: [
      { jm1_actiontype: CORRECTIVE_DAY0_EVENT, jm1_sourcerecordid: 'contact-1', createdon: '2026-08-27T16:56:00Z' },
      { jm1_actiontype: CORRECTIVE_DAY0_EVENT, jm1_sourcerecordid: 'contact-2', createdon: '2026-08-27T16:56:00Z' },
    ],
  }
  const stripeAccounts = [
    { id: 'acct_one', details_submitted: false, payouts_enabled: false, requirements: { currently_due: ['external_account'], past_due: [] } },
    { id: 'acct_two', details_submitted: true, payouts_enabled: false, requirements: { currently_due: ['external_account'], past_due: [] } },
  ]

  const estate = buildRuntimeEstate({ liveSource, stripeAccounts, verifiedAt: '2026-08-27T17:00:00Z' })

  assert.equal(estate.rows[0].initialValidInvitationAt, '2026-08-27T16:56:00Z')
  assert.equal(estate.rows[0].state, 'SETUP_IN_PROGRESS')
  assert.equal(estate.rows[1].state, 'MORE_INFORMATION_NEEDED')
  assert.equal(estate.rows[1].supportState, 'ACTIVE_SUPPORT')
})
