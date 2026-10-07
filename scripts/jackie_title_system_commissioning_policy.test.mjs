import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const {
  JACKIE_CANONICAL_AUTHOR_CONTACT_ID,
  isJackieAuthoredTitle,
  jackieTitleCommissioningBlocker,
} = jiti('../lib/server/jackie-title-system-commissioning-policy.ts')

test('canonical Jackie contact references pass regardless of lookup representation', () => {
  assert.equal(isJackieAuthoredTitle({ _jm1_primaryauthor_value: JACKIE_CANONICAL_AUTHOR_CONTACT_ID }), true)
  assert.equal(isJackieAuthoredTitle({ jm1_canonicalauthorcontactreference: `contact:${JACKIE_CANONICAL_AUTHOR_CONTACT_ID}` }), true)
  assert.equal(isJackieAuthoredTitle({
    _jm1_primaryauthor_value: JACKIE_CANONICAL_AUTHOR_CONTACT_ID,
    _jm1_author_value: JACKIE_CANONICAL_AUTHOR_CONTACT_ID,
    jm1_canonicalauthorcontactreference: `contact:${JACKIE_CANONICAL_AUTHOR_CONTACT_ID}`,
  }), true)
})

test('non-Jackie, missing, malformed, and conflicting authority fail closed', () => {
  for (const authority of [
    { _jm1_primaryauthor_value: '11111111-1111-1111-1111-111111111111' },
    {},
    null,
    { _jm1_primaryauthor_value: 'not-a-guid' },
    {
      _jm1_primaryauthor_value: JACKIE_CANONICAL_AUTHOR_CONTACT_ID,
      _jm1_author_value: `unexpected-prefix-${JACKIE_CANONICAL_AUTHOR_CONTACT_ID}`,
    },
    {
      _jm1_primaryauthor_value: JACKIE_CANONICAL_AUTHOR_CONTACT_ID,
      jm1_canonicalauthorcontactreference: 42,
    },
    {
      _jm1_primaryauthor_value: JACKIE_CANONICAL_AUTHOR_CONTACT_ID,
      _jm1_author_value: '11111111-1111-1111-1111-111111111111',
    },
  ]) {
    assert.equal(isJackieAuthoredTitle(authority), false)
    assert.equal(jackieTitleCommissioningBlocker(authority), 'JACKIE_AUTHOR_ONLY_SYSTEM_COMMISSIONING_DENIED')
  }
})

test('dispatcher, recovery, and closeout use the shared guard', () => {
  for (const file of [
    '../lib/server/publishing-dispatch-service.ts',
    '../lib/server/five-title-executive-recovery-dispatch.ts',
    '../lib/server/publishing-title-closeout-service.ts',
    '../lib/server/publishing-orchestrator.ts',
  ]) {
    assert.match(readFileSync(new URL(file, import.meta.url), 'utf8'), /jackieTitleCommissioningBlocker/)
  }
})

test('automatic inquiry initialization requires the canonical Jackie contact', () => {
  assert.match(
    readFileSync(new URL('../lib/server/publisher-operating-center.ts', import.meta.url), 'utf8'),
    /isJackieAuthorContact/,
  )
})
