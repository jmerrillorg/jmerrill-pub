import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const source = readFileSync('app/api/publishing/intake/recovery/route.ts', 'utf8')
test('continuation acceptance fixture remains inside existing expiring worker scope', () => {
  assert.ok(source.indexOf("code: 'ACCEPTANCE_SCOPE_DENIED'") < source.indexOf("body.operation === 'seed-continuation'"))
  assert.match(source, /timingSafeEqual\(expected, supplied\)/)
  assert.match(source, /expiry > Date\.now\(\) \+ 4 \* 60 \* 60_000/)
  assert.match(source, /email: 'jm1-admin@jmerrill\.one'/)
  assert.match(source, /synthetic: true, notifications: 0/)
  assert.match(source, /verified\.fingerprint !== fingerprint/)
  assert.doesNotMatch(source, /createTitle|sendMail|createInvoice|chargeCard/)
})
