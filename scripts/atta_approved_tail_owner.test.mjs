import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createJiti } from 'jiti'
const j = createJiti(import.meta.url)
const plan = await j.import('../lib/server/stripe/atta-approved-tail-plan.ts')
const { executeAttaApprovedTail, AttaTailOwnerIO } = await j.import('../lib/server/stripe/atta-approved-tail-runtime.ts')
const { AgreementPaymentGuard, paymentMutationHash } = await j.import('../lib/server/stripe/publishing-payment-guard.ts')
const { calculateAgreementPaymentState } = await j.import('../lib/server/stripe/publishing-agreement-payment.ts')
const { ATTA_TAIL: P, ATTA_TAIL_PAYLOAD: payload } = plan
const copy = structuredClone

function fixture() {
  const requirements = Array.from({ length: 8 }, (_, i) => ({ jmpv2_paymentrequirementid:
    i === 6 ? P.february : i === 7 ? P.march : `req-${i}`, jmpv2_amountcents: i === 7 ? 25983 : 25988,
  jmpv2_obligationstatus: i < 2 ? 'SATISFIED' : 'SCHEDULED', jmpv2_duedate: new Date(Date.UTC(2026, 7 + i, 27, 12, 18, 59)).toISOString().replace('.000Z', 'Z') }))
  const agreement = { jmpv2_agreementrecordid: P.agreement, jmpv2_authoridentity: P.author,
    jmpv2_titleid: P.title, jmpv2_stripecustomerid: P.customer, jmpv2_currentbalancecents: P.balance,
    jmpv2_totalagreementamountcents: 207899, jmpv2_nextduedate: P.octoberDue, jmpv2_nextpaymentat: P.octoberDue,
    jmpv2_balanceversion: P.originalVersion }
  const subscription = { id: P.subscription, customer: P.customer, schedule: P.schedule, status: 'active',
    livemode: true, collection_method: 'send_invoice', days_until_due: 7, pending_update: null,
    pause_collection: null, cancel_at: null, cancel_at_period_end: false }
  const schedule = { id: P.schedule, subscription: P.subscription, status: 'active', end_behavior: 'cancel',
    phases: copy(payload.phases).map((phase, i) => ({ ...phase, start_date: i ? 1805545139 : 1787228339,
      end_date: i ? 1808223539 : 1805545139, proration_behavior: 'create_prorations' })),
    current_phase: { start_date: 1787228339, end_date: 1805545139 } }
  let snapshot = { agreement, requirements, subscription, schedule, schedules: [copy(schedule)],
    'payment-intents': [1, 2, 3].map(i => ({ id: `pi-${i}`, status: 'succeeded', amount_received: 25988 })),
    invoices: [1, 2].map(i => ({ id: `in-${i}`, status: 'paid', amount_remaining: 0 })) }
  const authority = { approvalReference: P.approval, approvalSourceHash: 'fixture',
    approvedPayloadHash: paymentMutationHash(payload), sourceHashes: plan.tailSnapshotHashes(snapshot) }
  let stored = null, intents = new Map(), result = null, journal = null
  const guard = new AgreementPaymentGuard({
    async bindOperation(agreement, operation, hash) { const prior = intents.get(operation.operationId)
      if (prior && prior !== hash) throw Error('PAYMENT_GUARD_OPERATION_REPLAY_MISMATCH'); intents.set(operation.operationId, hash) },
    async read() { return copy(stored) },
    async compareExchange(expected, next) { if (expected?.versionToken !== stored?.versionToken) return false
      stored = { claim: copy(next), versionToken: `${Number(stored?.versionToken || 0) + 1}` }; return true },
  })
  const counts = { stripe: 0, projection: 0, intent: 0 }, hooks = {}
  const ledger = { withAgreementMutation: (...args) => guard.run(...args), async getAgreement() {
    return { etag: 'W/"1"', snapshot: { agreementId: P.agreement, authorId: P.author, titleId: P.title,
      paymentScheduleId: P.schedule, currency: 'usd', contractualBalanceCents: 207899, normalInstallmentCents: 25988,
      nextScheduledDueDate: P.octoberDue, payments: [1, 2, 3].map(i => ({ paymentId: `pi-${i}`, amountCents: 25988,
        paymentType: 'ADDITIONAL_PAYMENT', status: 'SUCCEEDED', allocations: [{ kind: 'ADDITIONAL_PAYMENT', amountCents: 25988 }], paidAt: '2026-09-26T00:00:00Z' })), refunds: [],
      scheduledObligations: snapshot.requirements.map(r => ({ obligationId: r.jmpv2_paymentrequirementid,
        amountCents: r.jmpv2_amountcents, dueDate: r.jmpv2_duedate, status: r.jmpv2_obligationstatus })) } }
  } }
  const io = { lastReceipt: () => ({ requestId: 'req_fixture', persistentMutation: true }), async audit() { return result }, async capture() { hooks.capture?.(snapshot); return {
    snapshot: copy(snapshot), agreement: { ...snapshot.agreement, '@odata.etag': 'W/"1"' },
    requirements: copy(snapshot.requirements), receipts: [] } },
  async preview() { if (hooks.preview) throw Error('ATTA_TAIL_OCTOBER_PREVIEW_MISMATCH'); return { ok: true } },
  async persistIntent(facts) { journal = copy(facts); counts.intent++ },
  async stripe(path, body, mutate) { assert(journal); assert.equal(path, `subscription_schedules/${P.schedule}`)
    assert.deepEqual(body, payload); assert.equal(mutate, true); counts.stripe++
    snapshot = plan.expectedTailProviderSnapshot(snapshot); if (hooks.stripe) throw Error('TIMEOUT_AFTER_PROVIDER_EFFECT') },
  async applyProjection(before, version, facts) { if (hooks.projection) throw Error('PROJECTION_FAILURE')
    counts.projection++; snapshot.requirements.find(r => r.jmpv2_paymentrequirementid === P.february).jmpv2_amountcents = 25983
    snapshot.requirements.find(r => r.jmpv2_paymentrequirementid === P.march).jmpv2_obligationstatus = 'CANCELLED'
    snapshot.agreement.jmpv2_balanceversion = version; result = copy(facts) },
  }
  return { io, ledger, authority, counts, hooks, snapshot: () => snapshot, claim: () => stored, result: () => result }
}

test('exact approved request, cents and idempotency key are unchanged', () => {
  assert.equal(P.key, `jmp-atta-tail-001-${createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 32)}`)
  assert.equal(4 * 25988 + 25983, 129935)
  assert.equal(new Date(payload.phases[1].end_date * 1000).toISOString(), '2027-03-20T12:18:59.000Z')
  assert.equal(payload.proration_behavior, 'none'); assert(payload.phases.every(p => p.proration_behavior === 'none'))
})
test('default-off and exact existing-key authorization', () => {
  assert.equal(plan.tailAuthorized('k', { JM1_PAYMENT_EVENT_RECOVERY_KEY: 'k' }), false)
  assert.equal(plan.tailAuthorized('bad', { JM1_PAYMENT_EVENT_RECOVERY_KEY: 'k', JMP_ATTA_APPROVED_TAIL_ENABLED: 'true' }), false)
  assert.equal(plan.tailAuthorized('k', { JM1_PAYMENT_EVENT_RECOVERY_KEY: 'k', JMP_ATTA_APPROVED_TAIL_ENABLED: 'true' }), true)
})
test('normalization removes receipt transport only, not tax, payments or identity', () => {
  const a = { id: 'pi', amount_received: 25988, tax: 0, customer: P.customer, receipt_url: 'signed-a' }
  assert.deepEqual(plan.tailNormalize(a), plan.tailNormalize({ ...a, receipt_url: 'signed-b' }))
  for (const field of ['amount_received', 'tax', 'customer']) assert.notDeepEqual(plan.tailNormalize(a), plan.tailNormalize({ ...a, [field]: 'changed' }))
})
test('fresh bounded execution and replay yield one provider effect and one result audit', async () => {
  const f = fixture()
  assert.equal((await executeAttaApprovedTail(f.io, f.ledger, f.authority)).status, 'APPLIED_VERIFIED')
  assert.equal((await executeAttaApprovedTail(f.io, f.ledger, f.authority)).status, 'ALREADY_APPLIED')
  assert.deepEqual(f.counts, { stripe: 1, projection: 1, intent: 1 })
  plan.assertTailIdentity(f.snapshot(), true)
  assert.equal(f.claim().claim.status, 'RELEASED')
  assert.notEqual(f.result().projectedBalanceVersion, P.originalVersion)
})
for (const kind of ['payment', 'balance', 'identity', 'tax', 'phase']) test(`${kind} drift stops before provider mutation`, async () => {
  const f = fixture()
  f.hooks.capture = s => { if (kind === 'payment') s['payment-intents'].push({ id: 'new', status: 'succeeded', amount_received: 10 })
    if (kind === 'balance') s.agreement.jmpv2_currentbalancecents--
    if (kind === 'identity') s.agreement.jmpv2_titleid = 'wrong'
    if (kind === 'tax') s.subscription.automatic_tax = { enabled: true }
    if (kind === 'phase') s.schedule.phases[0].end_date++ }
  await assert.rejects(executeAttaApprovedTail(f.io, f.ledger, f.authority))
  assert.equal(f.counts.stripe, 0); assert.equal(f.counts.projection, 0)
})
test('preview failure cannot write the schedule', async () => {
  const f = fixture(); f.hooks.preview = true
  await assert.rejects(executeAttaApprovedTail(f.io, f.ledger, f.authority)); assert.equal(f.counts.stripe, 0)
})
for (const kind of ['stripe', 'projection']) test(`${kind} ambiguity retains claim and never restores oversized tail or retries provider`, async () => {
  const f = fixture(); f.hooks[kind] = true
  await assert.rejects(executeAttaApprovedTail(f.io, f.ledger, f.authority))
  assert.equal(f.claim().claim.status, 'RECOVERY_REQUIRED')
  await assert.rejects(executeAttaApprovedTail(f.io, f.ledger, f.authority), /PAYMENT_GUARD_RECOVERY_REQUIRED/)
  assert.equal(f.counts.stripe, 1); assert.equal(f.counts.projection, 0)
  assert.equal(f.snapshot().schedule.phases[1].end_date, 1805545139)
})
test('owner route exposes no arbitrary amount, agreement, request payload or callback', () => {
  const route = readFileSync(new URL('../app/api/author/stripe/payment/approved-tail/route.ts', import.meta.url), 'utf8')
  assert.match(route, /Object.keys\(body\).length !== 2/)
  assert.match(route, /executeAttaApprovedTail\(\)/)
  assert.doesNotMatch(route, /executeAttaApprovedTail\(body|create_invoice|sendMail/)
})
test('projected model version must be reconciled with the future-obligation change', () => {
  assert.equal(typeof calculateAgreementPaymentState, 'function')
  const io = readFileSync(new URL('../lib/server/stripe/atta-approved-tail-runtime.ts', import.meta.url), 'utf8')
  assert.match(io, /jmpv2_balanceversion: version/)
  assert.match(io, /If-Match:/)
  assert.match(io, /SCHEDULE_TAIL_APPLIED/)
  assert.doesNotMatch(io, /subscription_schedules\/.*\/cancel|refunds.*POST|invoice_now/)
})

test('provider adapter enforces guard and exact request, with pinned API and idempotency headers', async () => {
  const prior = process.env.STRIPE_CHECKOUT_SECRET_KEY
  process.env.STRIPE_CHECKOUT_SECRET_KEY = 'rk_test_fixture'
  try {
    const requests = []
    const io = new AttaTailOwnerIO(async (url, init) => { requests.push({ url, init }); return Response.json({ ok: true },
      { headers: { 'stripe-version': P.apiVersion, 'request-id': 'req_fixture' } }) })
    await assert.rejects(io.stripe(`subscription_schedules/${P.schedule}`, payload, true), /GUARD/)
    assert.equal(requests.length, 0)
    const f = fixture()
    await f.ledger.withAgreementMutation(P.agreement, { kind: 'SCHEDULE_ADJUSTMENT', operationId: 'test', payload }, async () => {
      await assert.rejects(io.stripe('invoices', payload, true), /EXACT_REQUEST_REQUIRED/)
      await assert.rejects(io.stripe(`subscription_schedules/${P.schedule}`, { ...payload, end_behavior: 'release' }, true), /EXACT_REQUEST_REQUIRED/)
      await io.stripe(`subscription_schedules/${P.schedule}`, payload, true)
    })
    assert.equal(requests.length, 1)
    assert.equal(requests[0].init.headers['Stripe-Version'], P.apiVersion)
    assert.equal(requests[0].init.headers['Idempotency-Key'], P.key)
    assert.equal(requests[0].init.body.get('proration_behavior'), 'none')
    assert.equal(requests[0].init.body.get('phases[1][end_date]'), '1805545139')
  } finally { if (prior === undefined) delete process.env.STRIPE_CHECKOUT_SECRET_KEY; else process.env.STRIPE_CHECKOUT_SECRET_KEY = prior }
})

test('provider collection reads every page and rejects repeating cursors', async () => {
  const io = new AttaTailOwnerIO(), paths = []
  io.stripe = async path => { paths.push(path); return paths.length === 1 ? { data: [{ id: 'a' }], has_more: true } : { data: [{ id: 'b' }], has_more: false } }
  assert.deepEqual(await io.stripeList('invoices?customer=fixture'), [{ id: 'a' }, { id: 'b' }])
  assert.match(paths[1], /starting_after=a/)
  io.stripe = async () => ({ data: [{ id: 'a' }], has_more: true })
  await assert.rejects(io.stripeList('invoices?customer=fixture'), /CURSOR_INVALID/)
})

test('atomic projection has exactly one audit and three ETag-bound writes; inner failures reject', async () => {
  const f = fixture(), io = new AttaTailOwnerIO(), requests = []
  const facts = { expectedAfterHashes: {}, fixture: true }
  io.audit = async () => facts
  io.dv = async (path, init) => { requests.push({ path, init }); return new Response('HTTP/1.1 201 Created\r\nHTTP/1.1 204 No Content\r\nHTTP/1.1 204 No Content\r\nHTTP/1.1 204 No Content') }
  const before = { agreement: { '@odata.etag': 'W/"1"' }, requirements: [P.february, P.march].map(id =>
    ({ jmpv2_paymentrequirementid: id, '@odata.etag': 'W/"2"' })) }
  await f.ledger.withAgreementMutation(P.agreement, { kind: 'SCHEDULE_ADJUSTMENT', operationId: 'batch', payload }, async () => {
    await io.applyProjection(before, 'version', facts)
  })
  assert.equal(requests.length, 1); assert.equal(requests[0].path, '$batch')
  const body = requests[0].init.body
  assert.equal([...body.matchAll(/If-Match:/g)].length, 3)
  assert.match(body, /"jmpv2_amountcents":25983/); assert.match(body, /"jmpv2_obligationstatus":"CANCELLED"/)
  assert.doesNotMatch(body, /jmpv2_currentbalancecents|\/invoices|SATISFIED/)
  io.dv = async () => new Response('HTTP/1.1 412 Precondition Failed')
  await assert.rejects(f.ledger.withAgreementMutation(P.agreement, { kind: 'SCHEDULE_ADJUSTMENT', operationId: 'bad-batch', payload },
    () => io.applyProjection(before, 'version', facts)), /ATOMIC_PROJECTION_FAILED_RECOVER_FORWARD/)
})
