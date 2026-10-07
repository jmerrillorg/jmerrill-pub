import assert from 'node:assert/strict'
import test from 'node:test'
import { canonicalAuthorContactReference, isCanonicalAuthorContactReference } from '../docs/operations/generated/PUBLISHING-OPERATING-CENTER-WAVE1-CANONICAL-AUTHORITY-2026-09-01/canonical-author-contact-reference.mjs'

const CONTACT = 'd38aa56a-882a-f111-88b4-6045bdd69678'
const PROFILE = '1f000000-0000-0000-0000-000000000001'

test('serializes only one canonical contact reference', () => {
  assert.equal(canonicalAuthorContactReference(CONTACT), `contact:${CONTACT}`)
  assert.equal(isCanonicalAuthorContactReference(`contact:${CONTACT}`), true)
  assert.equal(isCanonicalAuthorContactReference('UNRESOLVED'), true)
})

test('does not serialize the author profile identifier into the contact field', () => {
  assert.equal(canonicalAuthorContactReference(CONTACT), `contact:${CONTACT}`)
  assert.notEqual(canonicalAuthorContactReference(CONTACT), `contact:${CONTACT}; authorProfile:${PROFILE}`)
})

test('missing contacts remain unresolved; malformed and composite values fail closed', () => {
  assert.equal(canonicalAuthorContactReference(null), 'UNRESOLVED')
  assert.throws(() => canonicalAuthorContactReference('not-a-guid'), /INVALID_CANONICAL/)
  assert.throws(() => canonicalAuthorContactReference(`${CONTACT}; authorProfile:${PROFILE}`), /INVALID_CANONICAL/)
  assert.equal(isCanonicalAuthorContactReference(`contact:${CONTACT}; authorProfile:${PROFILE}`), false)
})

test('conflicting references are rejected and repeated serialization is stable', () => {
  assert.throws(() => canonicalAuthorContactReference(`${CONTACT}|${PROFILE}`), /INVALID_CANONICAL/)
  const first = canonicalAuthorContactReference(CONTACT)
  assert.equal(canonicalAuthorContactReference(CONTACT), first)
})
