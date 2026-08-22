import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AUTHOR_SUBJECT,
  PR567_MERGE_SHA,
  selectPilotAuthors,
} from './stripe_connect_author_pilot.mjs'

test('pilot selection prefers clean individual authors and excludes exception patterns', () => {
  const source = {
    contacts: [
      contact('1', 'Alice Author', 'alice@example.test'),
      contact('2', 'Beta Writer', 'beta@example.test'),
      contact('3', 'Carol Clean', 'carol@example.test'),
      contact('4', 'Shared One', 'shared@example.test'),
      contact('5', 'Shared Two', 'shared@example.test'),
      contact('6', 'Entity Trust', 'entity@example.test'),
      contact('7', 'Existing Ready', 'existing@example.test', 'acct_existing'),
    ],
    profiles: [
      profile('p1', '1', 'Alice Author'),
      profile('p2', '2', 'Beta Writer'),
      profile('p3', '3', 'Carol Clean'),
      profile('p4', '4', 'Shared One'),
      profile('p5', '5', 'Shared Two'),
      profile('p6', '6', 'Entity Trust'),
      profile('p7', '7', 'Existing Ready'),
    ],
  }

  const selection = selectPilotAuthors(source, { max: 3 })

  assert.equal(selection.readyNewCount, 3)
  assert.equal(selection.existingReadyCount, 1)
  assert.equal(selection.exceptionCount, 3)
  assert.deepEqual(selection.selected.map((row) => row.authorName), ['Alice Author', 'Beta Writer', 'Carol Clean'])
})

test('pilot selection blocks when fewer than three first-time clean authors exist', () => {
  const source = {
    contacts: [
      contact('1', 'Alice Author', 'alice@example.test'),
      contact('2', 'Existing Ready', 'existing@example.test', 'acct_existing'),
    ],
    profiles: [
      profile('p1', '1', 'Alice Author'),
      profile('p2', '2', 'Existing Ready'),
    ],
  }

  const selection = selectPilotAuthors(source, { max: 3 })

  assert.equal(selection.readyNewCount, 1)
  assert.equal(selection.selectionStatus, 'PILOT_SELECTION_BLOCKED')
})

test('author communication contract uses canonical subject and #567 merge authority', () => {
  assert.equal(AUTHOR_SUBJECT, 'Set Up Your J Merrill Publishing Royalty Payments')
  assert.match(PR567_MERGE_SHA, /^[0-9a-f]{40}$/)
})

function contact(id, fullname, email, stripeAccount = '') {
  return {
    contactid: `${id}${id}${id}${id}${id}${id}${id}${id}-${id}${id}${id}${id}-${id}${id}${id}${id}-${id}${id}${id}${id}-${id}${id}${id}${id}${id}${id}${id}${id}${id}${id}${id}${id}`,
    fullname,
    emailaddress1: email,
    jm1pub_stripeconnectedaccountid: stripeAccount,
    statecode: 0,
  }
}

function profile(id, contactId, name) {
  const guid = `${id}${id}${id}${id}${id}${id}${id}${id}-${id}${id}${id}${id}-${id}${id}${id}${id}-${id}${id}${id}${id}-${id}${id}${id}${id}${id}${id}${id}${id}${id}${id}${id}${id}`.replaceAll('p', 'a')
  const contactGuid = `${contactId}${contactId}${contactId}${contactId}${contactId}${contactId}${contactId}${contactId}-${contactId}${contactId}${contactId}${contactId}-${contactId}${contactId}${contactId}${contactId}-${contactId}${contactId}${contactId}${contactId}-${contactId}${contactId}${contactId}${contactId}${contactId}${contactId}${contactId}${contactId}${contactId}${contactId}${contactId}${contactId}`
  return {
    jm1_authorprofileid: guid,
    _jm1_contact_value: contactGuid,
    jm1_name: name,
    statecode: 0,
  }
}
