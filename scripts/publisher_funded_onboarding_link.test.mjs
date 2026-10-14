import test from 'node:test'
import assert from 'node:assert/strict'
import createJiti from 'jiti'
import { readFileSync } from 'node:fs'
const { signOnboardingClaims, verifyOnboardingToken, validateOnboardingRecordBinding } = createJiti(import.meta.url)('../lib/server/publisher-funded-onboarding.ts')
test('executed offer authority supports a missing legacy lookup, never a conflict', () => {
  const titleId = '11111111-1111-4111-8111-111111111111', contactId = '22222222-2222-4222-8222-222222222222', hash = 'a'.repeat(64)
  const prepared = { titleId, offerSha256: hash, authorElectionReference: `publisher-funded/stage04/${titleId}/${hash}/responses/exact.json`,
    completeness: { complete: true, authorSourceReference: `contacts(${contactId})/W/"123"` } }
  const body = { authorContactId: contactId, replacement: prepared, execution: { ...prepared } }
  const contact = { contactid: contactId }, title = { jm1pub_titleid: titleId, _jm1_primaryauthor_value: null }
  assert.doesNotThrow(() => validateOnboardingRecordBinding(titleId, body, contact, title))
  assert.doesNotThrow(() => validateOnboardingRecordBinding(titleId, body, contact, { ...title, _jm1_primaryauthor_value: contactId }))
  for (const [b, c, t] of [
    [body, contact, { ...title, _jm1_primaryauthor_value: 'different-author' }],
    [body, contact, { ...title, jm1pub_titleid: 'different-title' }],
    [body, { contactid: 'different-author' }, title],
    [{ ...body, execution: { ...prepared, offerSha256: 'b'.repeat(64) } }, contact, title],
    [{ ...body, execution: { ...prepared, authorElectionReference: 'stale-response' } }, contact, title],
    [{ ...body, replacement: { ...prepared, completeness: { complete: false } } }, contact, title],
    [{ ...body, replacement: { ...prepared, completeness: { complete: true, authorSourceReference: 'unbound' } } }, contact, title],
  ]) assert.throws(() => validateOnboardingRecordBinding(titleId, b, c, t), /IDENTITY_CONFLICT/)
})
test('funded onboarding retains author choice without retail package or new editorial election', () => {
  const page = readFileSync(new URL('../app/onboarding/page.tsx', import.meta.url), 'utf8')
  assert.match(page, /fundedNotes\[field.name\]/)
  assert.match(page, /Preferences do not authorize new spending/)
  assert.match(page, /\['editingLevelAcknowledgment', 'payment_acknowledgment'\]\.includes\(field.name\)/)
  assert.match(page, /No portal account is required/)
  assert.match(page, /field.name === 'governedFormatSelection'/)
  assert.match(page, /key: 'paperback_ebook_hardcover', label: 'Paperback \+ eBook \+ hardcover'/)
  const route = readFileSync(new URL('../app/api/publishing/onboarding/route.ts', import.meta.url), 'utf8')
  assert.match(route, /genreKey: body.genre/)
  assert.doesNotMatch(page, /Starter includes/)
  assert.match(page, /min-h-screen bg-\[#070710\] pt-28 text-white/)
})
test('onboarding capability binds purpose, exact title, contact, version and expiry', t => {
  const before = process.env.INTAKE_CONTINUATION_TOKEN_SECRET
  process.env.INTAKE_CONTINUATION_TOKEN_SECRET = 'synthetic-test-only-not-a-production-key'
  t.after(() => { if (before === undefined) delete process.env.INTAKE_CONTINUATION_TOKEN_SECRET; else process.env.INTAKE_CONTINUATION_TOKEN_SECRET = before })
  const claims = { purpose: 'PUBLISHING_ONBOARDING_V1', titleId: '11111111-1111-4111-8111-111111111111',
    contactId: '22222222-2222-4222-8222-222222222222', agreementSha256: 'a'.repeat(64), exp: Math.floor(Date.now() / 1000) + 3600 }
  const token = signOnboardingClaims(claims)
  assert.deepEqual(verifyOnboardingToken(token), claims)
  assert.throws(() => verifyOnboardingToken(token + '.extra'), /INVALID/)
  assert.throws(() => verifyOnboardingToken(token.slice(0, -2) + 'xx'), /INVALID/)
  for (const fields of [{ purpose: 'INTAKE' }, { exp: 1 }, { exp: claims.exp + 30 * 86400 },
    { contactId: 'invalid' }, { agreementSha256: 'old-version' }]) {
    assert.throws(() => verifyOnboardingToken(signOnboardingClaims({ ...claims, ...fields })), /INVALID/)
  }
})
