import assert from 'node:assert/strict'
import test from 'node:test'

import {
  classifyRepairCandidate,
  splitName,
} from './author_royalty_structured_link_repair.mjs'

const sourceRecord = {
  'Vendor Name': 'Sample Author, Author',
  'Vendor Id': 'vendor-1',
  'Primary Email': 'sample-at-example.test',
  'Name on Check': 'Sample Author',
  'Company Name': '',
}

test('splits a normal full name while preserving middle names', () => {
  assert.deepEqual(splitName('M Darlene Carson'), {
    firstname: 'M Darlene',
    lastname: 'Carson',
  })
})

test('single-token name keeps a usable first and last value', () => {
  assert.deepEqual(splitName('Prince'), {
    firstname: 'Prince',
    lastname: 'Prince',
  })
})

test('title evidence with no Contact is the only structured-link repair class', () => {
  const result = classifyRepairCandidate({
    sourceRecord,
    emailCount: 1,
    emailContacts: [],
    nameContacts: [],
    titleMatches: [{ jm1pub_titleid: 'title-1', _jm1_primaryauthor_value: null }],
  })

  assert.equal(result, 'REPAIRABLE_STRUCTURED_LINK_MISSING')
})

test('duplicate email fails closed', () => {
  const result = classifyRepairCandidate({
    sourceRecord,
    emailCount: 2,
    emailContacts: [],
    nameContacts: [],
    titleMatches: [{ jm1pub_titleid: 'title-1', _jm1_primaryauthor_value: null }],
  })

  assert.equal(result, 'HUMAN_REVIEW_REQUIRED')
})

test('entity payee fails closed even with title evidence', () => {
  const result = classifyRepairCandidate({
    sourceRecord: { ...sourceRecord, 'Company Name': 'Sample Author LLC' },
    emailCount: 1,
    emailContacts: [],
    nameContacts: [],
    titleMatches: [{ jm1pub_titleid: 'title-1', _jm1_primaryauthor_value: null }],
  })

  assert.equal(result, 'HUMAN_REVIEW_REQUIRED')
})

test('name-only Contact candidate without title evidence fails closed', () => {
  const result = classifyRepairCandidate({
    sourceRecord,
    emailCount: 1,
    emailContacts: [],
    nameContacts: [{ contactid: 'contact-1', fullname: 'Sample Author' }],
    titleMatches: [],
  })

  assert.equal(result, 'HUMAN_REVIEW_REQUIRED')
})

test('unique Contact name plus title evidence is repairable by reusing Contact', () => {
  const result = classifyRepairCandidate({
    sourceRecord,
    emailCount: 1,
    emailContacts: [],
    nameContacts: [{ contactid: 'contact-1', fullname: 'Sample Author' }],
    titleMatches: [{ jm1pub_titleid: 'title-1', _jm1_primaryauthor_value: null }],
  })

  assert.equal(result, 'REPAIRABLE_STRUCTURED_LINK_MISSING')
})

test('exact email Contact without existing Connect is ready but not repaired', () => {
  const result = classifyRepairCandidate({
    sourceRecord,
    emailCount: 1,
    emailContacts: [{ contactid: 'contact-1', fullname: 'Sample Author' }],
    nameContacts: [],
    titleMatches: [],
  })

  assert.equal(result, 'READY_FOR_STRIPE_CONNECT')
})

test('exact email Contact with existing Connect remains existing-ready', () => {
  const result = classifyRepairCandidate({
    sourceRecord,
    emailCount: 1,
    emailContacts: [{ contactid: 'contact-1', fullname: 'Sample Author', jm1pub_stripeconnectedaccountid: 'acct_123' }],
    nameContacts: [],
    titleMatches: [],
  })

  assert.equal(result, 'EXISTING_CONNECT_READY')
})
