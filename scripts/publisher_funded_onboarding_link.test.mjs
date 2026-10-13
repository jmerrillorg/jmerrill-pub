import test from 'node:test'
import assert from 'node:assert/strict'
import createJiti from 'jiti'
import { readFileSync } from 'node:fs'
const { signOnboardingClaims, verifyOnboardingToken } = createJiti(import.meta.url)('../lib/server/publisher-funded-onboarding.ts')
test('funded onboarding retains author choice without retail package or new editorial election', () => {
  const page = readFileSync(new URL('../app/onboarding/page.tsx', import.meta.url), 'utf8')
  assert.match(page, /fundedNotes\[field.name\]/)
  assert.match(page, /Preferences do not authorize new spending/)
  assert.match(page, /field.name !== 'editingLevelAcknowledgment'/)
  assert.match(page, /No portal account is required/)
  assert.doesNotMatch(page, /Starter includes/)
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
