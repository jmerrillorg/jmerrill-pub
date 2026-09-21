import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const root = new URL('../powerplatform/solutions/JMPPublishingV2PaymentRuntime/', import.meta.url)
const manifest = JSON.parse(readFileSync(new URL('payment-ledger-schema.json', root), 'utf8'))
const registration = JSON.parse(readFileSync(new URL('evidence/authoring-registration.json', root), 'utf8'))
const exported = JSON.parse(readFileSync(new URL('evidence/solution-export.json', root), 'utf8'))
const role = readFileSync(new URL('src/Roles/JMP Publishing Payment Runtime.xml', root), 'utf8')
const solution = readFileSync(new URL('src/Other/Solution.xml', root), 'utf8')
const runtimeGate = readFileSync(new URL('src/environmentvariabledefinitions/jmpv2_PaymentRuntimeEnabled/environmentvariabledefinition.xml', root), 'utf8')
const timerGate = readFileSync(new URL('src/environmentvariabledefinitions/jmpv2_PaymentTimerMode/environmentvariabledefinition.xml', root), 'utf8')
const adapter = readFileSync(new URL('../lib/server/stripe/publishing-payment-adapters.ts', import.meta.url), 'utf8')
const paymentRuntime = readFileSync(new URL('../lib/server/stripe/publishing-payment-runtime.ts', import.meta.url), 'utf8')
const timerRuntime = readFileSync(new URL('../azure-functions/diagnostic-ai-runner/src/payment/publishingPaymentTimer.js', import.meta.url), 'utf8')

test('payment solution extends only the three canonical Publishing V2 tables', () => {
  assert.deepEqual(Object.keys(manifest.tables).sort(), ['jmpv2_agreementrecord', 'jmpv2_paymentevidence', 'jmpv2_paymentrequirement'])
  assert.equal(manifest.authority.parallelTablesCreated, false)
  assert.equal(JSON.stringify(manifest).includes('jm1pub_publishingagreement'), false)
})

test('managed schema contains balance, installment, idempotency, refund, fee, and version authority', () => {
  const schema = JSON.stringify(manifest.tables)
  for (const field of [
    'jmpv2_currentbalancecents', 'jmpv2_pastduebalancecents', 'jmpv2_balanceversion',
    'jmpv2_amountcents', 'jmpv2_duedate', 'jmpv2_obligationstatus',
    'jmpv2_idempotencykey', 'jmpv2_refundid', 'jmpv2_originalpaymentid',
    'jmpv2_stripefeecents', 'jmpv2_netsettlementcents', 'jmpv2_settlementreference',
  ]) assert.match(schema, new RegExp(field))
  assert.match(solution, /jmpv2_agreementrecord/)
  assert.match(solution, /jmpv2_paymentevidence/)
  assert.match(solution, /jmpv2_paymentrequirement/)
})

test('runtime role is append-only for evidence and excludes destructive authority', () => {
  assert.match(role, /prvCreatejmpv2_PaymentEvidence/)
  assert.doesNotMatch(role, /prvWritejmpv2_PaymentEvidence/)
  assert.doesNotMatch(role, /prvDeletejmpv2_/)
  assert.doesNotMatch(role, /prvAssignjmpv2_/)
  assert.doesNotMatch(role, /prvSharejmpv2_/)
  assert.equal(registration.status, 'PASS')
  assert.equal(registration.runtimeEnabledDefault, false)
  assert.equal(registration.timerModeDefault, 'DISABLED')
})

test('managed defaults fail closed', () => {
  assert.match(runtimeGate, /<defaultvalue>false<\/defaultvalue>/i)
  assert.match(timerGate, /<defaultvalue>DISABLED<\/defaultvalue>/i)
  assert.match(paymentRuntime, /JMP_PAYMENT_QBO_WRITE_COMMISSIONED/)
  assert.match(timerRuntime, /PAYMENT_COLLECTION_NOT_AUTHORIZED/)
})

test('production adapter uses canonical entities and atomic ETag changesets', () => {
  assert.match(adapter, /jmpv2_agreementrecords/)
  assert.match(adapter, /jmpv2_paymentrequirements/)
  assert.match(adapter, /jmpv2_paymentevidences/)
  assert.match(adapter, /If-Match:/)
  assert.match(adapter, /\/\$batch/)
  assert.doesNotMatch(adapter, /jm1pub_ApplyPublishingPaymentEvent/)
})

test('managed artifact checksum matches the immutable export evidence', () => {
  const artifact = readFileSync(new URL(`artifacts/${exported.managed.name}`, root))
  assert.equal(createHash('sha256').update(artifact).digest('hex'), exported.managed.sha256)
  assert.equal(exported.sourceOrganizationId, 'bb7a9d9e-8e73-f111-b27b-000d3a31ff17')
})
