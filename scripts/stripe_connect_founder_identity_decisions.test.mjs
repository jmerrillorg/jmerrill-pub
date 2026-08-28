import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  FOUNDER_AUTHOR_DECISIONS,
  TITLE_ATTRIBUTION_CORRECTIONS,
  buildExecutionPlan,
} from './stripe_connect_founder_identity_decisions.mjs'

process.env.JM1_STRIPE_CONNECT_ENABLED = 'true'

const contactId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const profileId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

function source(overrides = {}) {
  return {
    contacts: [
      {
        contactid: contactId,
        fullname: 'Daphanny Baker',
        emailaddress1: '',
        jm1pub_stripeconnectedaccountid: '',
        statecode: 0,
      },
      {
        contactid: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        fullname: 'Carolyn Booker-Pierce',
        emailaddress1: 'carolyn@example.invalid',
        statecode: 0,
      },
    ],
    profiles: [
      {
        jm1_authorprofileid: profileId,
        jm1_name: 'Daphanny Baker',
        _jm1_contact_value: contactId,
        statecode: 0,
      },
    ],
    legacyAuthors: [],
    titles: [
      {
        jm1pub_titleid: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        jm1pub_titlename: 'The Messenger 2',
        jm1pub_authorname: 'Thaddues Smith',
        jm1pub_authordisplayname: 'Thaddues Smith',
      },
      {
        jm1pub_titleid: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        jm1pub_titlename: 'More Than A Village',
        jm1pub_authorname: 'Shelley McIntosh',
        jm1pub_authordisplayname: 'Shelley McIntosh',
      },
    ],
    logs: [],
    ...overrides,
  }
}

test('founder decision list contains exactly fourteen approved author emails', () => {
  assert.equal(FOUNDER_AUTHOR_DECISIONS.length, 14)
  assert.equal(new Set(FOUNDER_AUTHOR_DECISIONS.map((row) => row.email)).size, 14)
})

test('title attribution correction list preserves all five founder rulings', () => {
  assert.deepEqual(
    TITLE_ATTRIBUTION_CORRECTIONS.map((row) => [row.title, row.newAuthor]),
    [
      ['The Messenger 2', 'Daphanny Baker'],
      ['Love of My Life', 'Thaddues Smith'],
      ["For What It's Worth", 'Kelli Milligan Stammen'],
      ['More Than A Village', 'Carolyn Booker-Pierce'],
      ['The Flame', 'Dennis Brown'],
    ],
  )
})

test('approved email repairs are planned without requiring historical email rewrite', () => {
  const plan = buildExecutionPlan({ source: source(), stripeAccounts: [], verifiedAt: '2026-08-28T00:00:00Z' })
  const daphanny = plan.rows.find((row) => row.author === 'Daphanny Baker')
  assert.equal(daphanny.approvedEmail, 'firstladydbaker@hotmail.com')
  assert.equal(daphanny.oldEmail, '')
  assert.equal(daphanny.actions.updateContactEmail, true)
  assert.equal(daphanny.actions.createAccount, true)
})

test('existing Stripe account with proven identity and stale email is repaired, not held', () => {
  const stripeAccounts = [{
    id: 'acct_TEST123',
    email: 'old@example.invalid',
    metadata: {
      jm1_contact_id: contactId,
      jm1_author_relationship_id: profileId,
      jm1_royalty_payee_id: profileId,
    },
    requirements: { currently_due: ['external_account'], past_due: [] },
  }]
  const plan = buildExecutionPlan({ source: source(), stripeAccounts, verifiedAt: '2026-08-28T00:00:00Z' })
  const daphanny = plan.rows.find((row) => row.author === 'Daphanny Baker')
  assert.equal(daphanny.stripe.ownership, 'STALE_EMAIL_REPAIR_REQUIRED')
  assert.equal(daphanny.actions.bindExistingAccount, false)
  assert.equal(daphanny.actions.replaceStaleAccount, true)
  assert.equal(daphanny.actions.sendSetup, true)
})

test('existing Stripe account with conflicting person metadata is not blindly bound', () => {
  const stripeAccounts = [{
    id: 'acct_TEST123',
    email: 'wrong@example.invalid',
    metadata: {
      jm1_contact_id: '99999999-9999-9999-9999-999999999999',
      jm1_author_relationship_id: profileId,
      jm1_royalty_payee_id: profileId,
    },
    requirements: { currently_due: [], past_due: [] },
  }]
  const plan = buildExecutionPlan({ source: source(), stripeAccounts, verifiedAt: '2026-08-28T00:00:00Z' })
  const daphanny = plan.rows.find((row) => row.author === 'Daphanny Baker')
  assert.equal(daphanny.stripe.ownership, 'CONFLICT')
  assert.match(daphanny.conflict, /metadata_contact_id/)
  assert.equal(daphanny.actions.bindExistingAccount, false)
})

test('stored replacement account wins over stale historical candidates when evidence matches', () => {
  const replacementAccount = {
    id: 'acct_REPLACEMENT',
    email: 'firstladydbaker@hotmail.com',
    metadata: {
      jm1_contact_id: contactId,
      jm1_author_relationship_id: profileId,
      jm1_royalty_payee_id: profileId,
    },
    requirements: { currently_due: ['external_account'], past_due: [] },
  }
  const staleAccount = {
    id: 'acct_STALE',
    email: 'old@example.invalid',
    metadata: {
      jm1_contact_id: contactId,
      jm1_author_relationship_id: profileId,
      jm1_royalty_payee_id: profileId,
    },
    requirements: { currently_due: ['external_account'], past_due: [] },
  }
  const plan = buildExecutionPlan({
    source: source({
      contacts: [{ ...source().contacts[0], jm1pub_stripeconnectedaccountid: replacementAccount.id }],
    }),
    stripeAccounts: [replacementAccount, staleAccount],
    verifiedAt: '2026-08-28T00:00:00Z',
  })
  const daphanny = plan.rows.find((row) => row.author === 'Daphanny Baker')
  assert.equal(daphanny.stripe.ownership, 'PROVEN')
  assert.equal(daphanny.stripe.accountId, replacementAccount.id)
  assert.equal(daphanny.actions.replaceStaleAccount, false)
})

test('public catalog title plan replaces wrong current author with founder-approved author', () => {
  const plan = buildExecutionPlan({ source: source(), stripeAccounts: [], verifiedAt: '2026-08-28T00:00:00Z' })
  const messenger = plan.titleCorrections.find((row) => row.title === 'The Messenger 2')
  const village = plan.titleCorrections.find((row) => row.title === 'More Than A Village')
  assert.equal(messenger.oldAuthor, 'Thaddues Smith')
  assert.equal(messenger.newAuthor, 'Daphanny Baker')
  assert.equal(messenger.patchRequired, true)
  assert.equal(village.oldAuthor, 'Shelley McIntosh')
  assert.equal(village.newAuthor, 'Carolyn Booker-Pierce')
  assert.equal(village.patchRequired, true)
})
