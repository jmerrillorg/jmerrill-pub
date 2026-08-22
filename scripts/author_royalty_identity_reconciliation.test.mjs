import assert from 'node:assert/strict'
import test from 'node:test'

import {
  classifyReconciliationRow,
  hasPayeeEntitySignal,
  normalizeName,
  readinessForDisposition,
  stripAuthorSuffix,
} from './author_royalty_identity_reconciliation.mjs'

const source = {
  'Vendor Name': 'Sample Author, Author',
  'Vendor Id': 'V-1',
  'Primary Email': 'sample@example.test',
  'Name on Check': 'Sample Author',
  'Company Name': '',
}

test('normalizes author vendor names without treating embedded inc as entity signal', () => {
  assert.equal(stripAuthorSuffix('Tia Benincase, Author'), 'Tia Benincase')
  assert.equal(normalizeName('Tia Benincase'), 'tia benincase')
  assert.equal(
    hasPayeeEntitySignal({ ...source, 'Vendor Name': 'Tia Benincase, Author', 'Name on Check': 'Tia Benincase' }),
    false,
  )
})

test('flags explicit entity payee relationships for human review', () => {
  const result = classifyReconciliationRow({
    sourceRecord: { ...source, 'Company Name': 'True Creatives Media LLC' },
  })

  assert.equal(result.disposition, 'PAYEE_ENTITY_REVIEW')
  assert.equal(result.readiness, 'HUMAN_REVIEW_REQUIRED')
})

test('classifies exact email contact with existing Stripe Connect as ready existing connect', () => {
  const result = classifyReconciliationRow({
    sourceRecord: source,
    emailContacts: [
      {
        contactid: 'contact-1',
        fullname: 'Sample Author',
        jm1pub_stripeconnectedaccountid: 'acct_123',
      },
    ],
  })

  assert.equal(result.disposition, 'MATCHED_EXISTING_STRIPE_CONNECT')
  assert.equal(result.readiness, 'EXISTING_CONNECT_READY')
})

test('requires human review when an identity candidate has no publishing relationship', () => {
  const result = classifyReconciliationRow({
    sourceRecord: source,
    emailContacts: [{ contactid: 'contact-1', fullname: 'Sample Author' }],
    relationshipCounts: { title: 0, contract: 0, royaltyProfile: 0 },
  })

  assert.equal(result.disposition, 'AUTHOR_RELATIONSHIP_MISSING')
  assert.equal(result.readiness, 'HUMAN_REVIEW_REQUIRED')
})

test('marks deterministic author relationship as ready for Stripe Connect', () => {
  const result = classifyReconciliationRow({
    sourceRecord: source,
    emailContacts: [{ contactid: 'contact-1', fullname: 'Sample Author' }],
    relationshipCounts: { title: 1, contract: 0, royaltyProfile: 0 },
  })

  assert.equal(result.disposition, 'MATCHED_EXISTING_AUTHOR_RELATIONSHIP')
  assert.equal(result.readiness, 'READY_FOR_STRIPE_CONNECT')
})

test('holds duplicate source emails and duplicate Dataverse contacts', () => {
  assert.equal(
    classifyReconciliationRow({ sourceRecord: source, sourceEmailCount: 2 }).disposition,
    'DUPLICATE_EMAIL_REVIEW',
  )
  assert.equal(
    classifyReconciliationRow({
      sourceRecord: source,
      emailContacts: [
        { contactid: 'contact-1', fullname: 'Sample Author' },
        { contactid: 'contact-2', fullname: 'Sample Author' },
      ],
    }).disposition,
    'DUPLICATE_EMAIL_REVIEW',
  )
})

test('uses name-only matches as review-required name variation, not automatic merge', () => {
  const result = classifyReconciliationRow({
    sourceRecord: source,
    nameContacts: [{ contactid: 'contact-1', fullname: 'Sample Author' }],
  })

  assert.equal(result.disposition, 'NAME_VARIATION')
  assert.equal(result.readiness, 'HUMAN_REVIEW_REQUIRED')
})

test('does not collapse multiple candidate matches', () => {
  const result = classifyReconciliationRow({
    sourceRecord: source,
    nameContacts: [{ contactid: 'contact-1', fullname: 'Sample Author' }],
    nameAuthors: [{ jm1_authorid: 'author-1', jm1_name: 'Sample Author' }],
  })

  assert.equal(result.disposition, 'MULTIPLE_CANDIDATE_MATCHES')
})

test('records no confident match without inventing identity', () => {
  const result = classifyReconciliationRow({ sourceRecord: source })

  assert.equal(result.disposition, 'NO_CONFIDENT_MATCH')
  assert.equal(result.readiness, 'HUMAN_REVIEW_REQUIRED')
})

test('readiness mapping keeps unknown dispositions in other hold', () => {
  assert.equal(readinessForDisposition('SOMETHING_NEW'), 'OTHER_HOLD')
})

