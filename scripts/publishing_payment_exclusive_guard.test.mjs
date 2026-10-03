import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const { AgreementPaymentGuard, assertAgreementPaymentGuard, paymentMutationHash, paymentGuardHttpStatus } = jiti('../lib/server/stripe/publishing-payment-guard.ts')
const { DataversePaymentGuardStore, paymentGuardRowId } = jiti('../lib/server/stripe/publishing-payment-guard-store.ts')
const { executeGovernedScheduleMutation } = jiti('../lib/server/stripe/publishing-schedule-mutation.ts')
const { executeGuardAcceptance, guardAcceptanceAuthorized, parseGuardAcceptanceRequest, PAYMENT_GUARD_ACCEPTANCE_ID } = jiti('../lib/server/stripe/publishing-payment-guard-acceptance.ts')
const runtime = jiti('../lib/server/stripe/publishing-payment-runtime.ts')
const AGREEMENT = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const operation = (kind = 'PAYMENT', operationId = 'evt_test') => ({ kind, operationId, payload: { amountCents: 25988 } })

class Store {
  rows = new Map()
  intents = new Map()
  receipts = []
  async bindOperation(agreementId, op, hash) {
    const key = `${agreementId}:${op.kind}:${op.operationId}`
    if (this.intents.has(key) && this.intents.get(key) !== hash) throw new Error('PAYMENT_GUARD_OPERATION_REPLAY_MISMATCH')
    this.intents.set(key, hash)
  }
  async read(id) { return structuredClone(this.rows.get(id) || null) }
  async compareExchange(expected, next) {
    const current = this.rows.get(next.agreementId)
    if ((current?.versionToken || null) !== (expected?.versionToken || null)) return false
    const versionToken = `test-version-${this.receipts.length + 1}`
    this.rows.set(next.agreementId, { claim: structuredClone(next), versionToken })
    this.receipts.push(structuredClone(next))
    return true
  }
}

function deferred() {
  let resolve
  const promise = new Promise((r) => { resolve = r })
  return { promise, resolve }
}

async function recover(guard, overrides = {}) {
  const { claim } = await guard.readback(AGREEMENT)
  return guard.recover({ agreementId: AGREEMENT, claimId: claim.claimId, payloadHash: claim.payloadHash,
    evidence: { authorityReference: 'approved-owner-recovery', producerQuiescenceReference: 'drained-process-receipt',
      providerReadbackReference: 'provider-readback', ledgerReadbackReference: 'ledger-readback', disposition: 'EFFECTS_RECONCILED' },
    verify: async () => true, ...overrides })
}

test('separate runtime instances contend across schedule, payment and refund; other agreements proceed', async () => {
  const store = new Store()
  const owner = new AgreementPaymentGuard(store)
  const worker = new AgreementPaymentGuard(store)
  const entered = deferred(), release = deferred()
  const running = owner.run(AGREEMENT, operation('SCHEDULE_ADJUSTMENT', 'schedule-1'), async () => {
    entered.resolve(); await release.promise; return { ok: true }
  })
  await entered.promise
  let effects = 0
  for (const kind of ['PAYMENT', 'REFUND', 'COLLECTION', 'CHECKOUT', 'SCHEDULE_ADJUSTMENT']) {
    await assert.rejects(worker.run(AGREEMENT, operation(kind, kind), async () => effects++), /PAYMENT_GUARD_BUSY/)
  }
  await worker.run(OTHER, operation(), async () => effects++)
  assert.equal(effects, 1)
  release.resolve(); await running
  await worker.run(AGREEMENT, operation(), async () => effects++)
  assert.equal(effects, 2)
  assert.equal((await worker.readback(AGREEMENT)).claim.status, 'RELEASED')
})

test('concurrent acquire race has one winner, including same-operation replay', async () => {
  const store = new Store(), release = deferred(), entered = deferred()
  let executions = 0
  const work = async () => { executions++; entered.resolve(); await release.promise }
  const a = new AgreementPaymentGuard(store).run(AGREEMENT, operation(), work)
  const b = new AgreementPaymentGuard(store).run(AGREEMENT, operation(), work)
  const settled = Promise.allSettled([a, b])
  await entered.promise; release.resolve()
  const results = await settled
  assert.equal(executions, 1)
  assert.equal(results.filter((row) => row.status === 'rejected').length, 1)
})

test('timeout holds durable ownership across restart and age; verified recovery then replay is allowed', async () => {
  const store = new Store()
  const first = new AgreementPaymentGuard(store, () => '2026-10-01T00:00:00Z')
  await assert.rejects(first.run(AGREEMENT, operation(), async () => { throw new Error('PROVIDER_TIMEOUT') }), /PROVIDER_TIMEOUT/)
  const restart = new AgreementPaymentGuard(store, () => '2026-10-05T00:00:00Z')
  assert.equal((await restart.readback(AGREEMENT)).claim.status, 'RECOVERY_REQUIRED')
  await assert.rejects(restart.run(AGREEMENT, operation(), async () => assert.fail('must not retry')), /RECOVERY_REQUIRED/)
  await assert.rejects(recover(restart, { verify: async () => false }), /EVIDENCE_REQUIRED/)
  await assert.rejects(recover(restart, { claimId: 'wrong-owner' }), /BINDING_MISMATCH/)
  await assert.rejects(recover(restart, { evidence: {} }), /EVIDENCE_REQUIRED/)
  await recover(restart)
  assert.deepEqual(await recover(restart), { recovered: true, idempotent: true })
  await restart.run(AGREEMENT, operation(), async () => ({ ok: true }))
  assert.equal(store.receipts.filter((r) => r.recovery).length, 1)
})

test('crashed HELD claim does not expire or permit a competing writer', async () => {
  const store = new Store(), entered = deferred(), release = deferred()
  const old = new AgreementPaymentGuard(store, () => '2020-01-01T00:00:00Z')
  const running = old.run(AGREEMENT, operation(), async () => { entered.resolve(); await release.promise })
  await entered.promise
  const restarted = new AgreementPaymentGuard(store)
  await assert.rejects(restarted.run(AGREEMENT, operation('REFUND'), async () => {}), /BUSY/)
  release.resolve(); await running
})

test('uncertain provider result retains claim; business denials and separately retryable QBO outcomes release it', async () => {
  const store = new Store(), guard = new AgreementPaymentGuard(store)
  await guard.run(AGREEMENT, operation(), async () => ({ ok: false, reason: 'AMOUNT_DENIED' }))
  assert.equal((await guard.readback(AGREEMENT)).claim.status, 'RELEASED')
  await guard.run(AGREEMENT, operation(), async () => ({ ok: false, paymentRecorded: true, reason: 'QBO_RECONCILIATION_FAILED' }))
  assert.equal((await guard.readback(AGREEMENT)).claim.status, 'RELEASED')
  await guard.run(AGREEMENT, operation(), async () => ({ ok: false, requiresExclusiveRecovery: true }))
  assert.equal((await guard.readback(AGREEMENT)).claim.status, 'RECOVERY_REQUIRED')
})

test('immutable intent rejects changed replay even after other operations and restart', async () => {
  const store = new Store(), guard = new AgreementPaymentGuard(store)
  await guard.run(AGREEMENT, operation(), async () => {})
  await guard.run(AGREEMENT, operation('REFUND', 'refund-1'), async () => {})
  await assert.rejects(new AgreementPaymentGuard(store).run(AGREEMENT, { ...operation(), payload: { amountCents: 26000 } },
    async () => assert.fail('altered replay')), /REPLAY_MISMATCH/)
  assert.equal(paymentMutationHash({ b: 2, a: 1 }), paymentMutationHash({ a: 1, b: 2 }))
})

test('failed or uncertain claim persistence never executes work', async () => {
  const store = new Store()
  store.compareExchange = async () => { throw new Error('STORE_UNCERTAIN') }
  await assert.rejects(new AgreementPaymentGuard(store).run(AGREEMENT, operation(), async () => assert.fail('no claim')), /STORE_UNCERTAIN/)
  store.compareExchange = async () => true
  await assert.rejects(new AgreementPaymentGuard(store).run(AGREEMENT, operation(), async () => assert.fail('no readback')), /OWNERSHIP_LOST/)
})

test('write-adapter context is agreement-bound and cannot outlive the guarded work', async () => {
  const guard = new AgreementPaymentGuard(new Store())
  assert.throws(() => assertAgreementPaymentGuard(AGREEMENT), /CONTEXT_REQUIRED/)
  let late
  const release = deferred()
  await guard.run(AGREEMENT, operation(), async () => {
    assert.doesNotThrow(() => assertAgreementPaymentGuard(AGREEMENT))
    assert.throws(() => assertAgreementPaymentGuard(OTHER), /CONTEXT_REQUIRED/)
    late = release.promise.then(() => assert.throws(() => assertAgreementPaymentGuard(AGREEMENT), /CONTEXT_REQUIRED/))
  })
  release.resolve(); await late
})

test('stale owner cannot release a replacement claim', async () => {
  const store = new Store(), guard = new AgreementPaymentGuard(store)
  await assert.rejects(guard.run(AGREEMENT, operation(), async () => {
    const original = await store.read(AGREEMENT)
    store.rows.set(AGREEMENT, { claim: { ...original.claim, claimId: 'replacement' }, versionToken: 'test-version-99' })
  }), /OWNERSHIP_LOST/)
  assert.equal((await store.read(AGREEMENT)).claim.claimId, 'replacement')
})

test('all financial entry points contend before reading or writing ledger and provider state', async () => {
  const store = new Store(), guard = new AgreementPaymentGuard(store), entered = deferred(), release = deferred()
  const running = guard.run(AGREEMENT, operation('SCHEDULE_ADJUSTMENT'), async () => { entered.resolve(); await release.promise })
  await entered.promise
  const ledger = { withAgreementMutation: (...args) => new AgreementPaymentGuard(store).run(...args),
    listDueAgreements: async () => [{ snapshot: { agreementId: AGREEMENT } }],
    getAgreement: async () => assert.fail('read before claim'), findPaymentEvent: async () => assert.fail('read before claim') }
  await assert.rejects(runtime.processConfirmedAgreementPayment({ agreementId: AGREEMENT, stripeEventId: 'evt_2', ledger }), /BUSY/)
  await assert.rejects(runtime.processConfirmedAgreementRefund({ agreementId: AGREEMENT, refund: { eventId: 'evt_3' }, ledger }), /BUSY/)
  await assert.rejects(runtime.createAdditionalPaymentInvoice({ agreementId: AGREEMENT, amountCents: 100, expectedBalanceVersion: 'v1', ledger }), /BUSY/)
  const timer = await runtime.runRecurringInstallmentExecutor({ asOf: '2026-10-01T00:00:00Z', ledger })
  assert.equal(timer.results[0].code, 'PAYMENT_GUARD_BUSY')
  release.resolve(); await running
})

test('collection rereads eligibility under claim instead of using stale timer snapshot', async () => {
  const guard = new AgreementPaymentGuard(new Store())
  const ledger = { withAgreementMutation: (...args) => guard.run(...args),
    listDueAgreements: async () => [{ snapshot: { agreementId: AGREEMENT }, status: 'ACTIVE' }],
    getAgreement: async () => null }
  const result = await runtime.runRecurringInstallmentExecutor({ asOf: '2026-10-01T00:00:00Z', ledger,
    stripe: { createInvoice: async () => assert.fail('no longer eligible') } })
  assert.equal(result.results[0].status, 'SKIPPED_NOT_ACTIVE')
})

test('schedule owner requires authority and fresh preflight; provider success/projection failure holds for forward recovery', async () => {
  const guard = new AgreementPaymentGuard(new Store())
  const payload = { proration_behavior: 'none', phases: [] }
  const input = { agreementId: AGREEMENT, operationId: 'schedule-approved', approvalReference: 'approval-1', payload,
    approvedPayloadHash: paymentMutationHash(payload), ledger: { withAgreementMutation: (...args) => guard.run(...args) },
    readVerifiedCompletion: async () => null,
    verifyAuthority: async () => true, freshPreflight: async () => true,
    executeAndVerify: async () => { throw new Error('PROJECTION_FAILED_AFTER_PROVIDER_SUCCESS') } }
  await assert.rejects(executeGovernedScheduleMutation({ ...input, verifyAuthority: async () => false }), /AUTHORITY_REQUIRED/)
  assert.equal((await executeGovernedScheduleMutation({ ...input, freshPreflight: async () => false })).reason, 'SCHEDULE_MUTATION_PREFLIGHT_CHANGED')
  await assert.rejects(executeGovernedScheduleMutation(input), /PROJECTION_FAILED/)
  assert.equal((await guard.readback(AGREEMENT)).claim.status, 'RECOVERY_REQUIRED')
})

test('schedule owner replay reads its verified durable completion instead of repeating provider or projection effects', async () => {
  const store = new Store(), payload = { end_behavior: 'cancel', proration_behavior: 'none' }
  let receipt = null, writes = 0
  const run = () => executeGovernedScheduleMutation({
    agreementId: AGREEMENT, operationId: 'schedule-1', approvalReference: 'approved-1', payload,
    approvedPayloadHash: paymentMutationHash(payload),
    ledger: { withAgreementMutation: (...args) => new AgreementPaymentGuard(store).run(...args) },
    verifyAuthority: async () => true, freshPreflight: async () => true,
    readVerifiedCompletion: async () => receipt,
    executeAndVerify: async () => { writes++; receipt = { verified: true, result: { status: 'APPLIED' } }; return receipt },
  })
  assert.deepEqual(await run(), { status: 'APPLIED' })
  assert.deepEqual(await run(), { status: 'APPLIED' })
  assert.equal(writes, 1)
  assert.equal(store.intents.size, 1)
})

test('Dataverse claims are immutable create-only records; deterministic revision identity serializes writers', () => {
  assert.equal(paymentGuardRowId(AGREEMENT.toUpperCase(), 1), paymentGuardRowId(AGREEMENT, 1))
  assert.notEqual(paymentGuardRowId(AGREEMENT, 1), paymentGuardRowId(AGREEMENT, 2))
  assert.notEqual(paymentGuardRowId(AGREEMENT, 1), paymentGuardRowId(OTHER, 1))
  const source = readFileSync('lib/server/stripe/publishing-payment-guard-store.ts', 'utf8')
  assert.doesNotMatch(source, /method: '(PATCH|DELETE|PUT)'/)
  assert.match(source, /PAYMENT_MUTATION_INTENT/)
})

test('Dataverse adapter fails closed on permission, corrupt state and malformed success', async () => {
  const fetch = global.fetch
  const config = { webApiBaseUrl: 'https://example.invalid/api/data/v9.2', resourceUrl: 'https://example.invalid' }
  const adapter = new DataversePaymentGuardStore(config, async () => 'test-token')
  const store = new Store(), guard = new AgreementPaymentGuard(store)
  await guard.run(AGREEMENT, operation(), async () => {})
  const claim = store.receipts[0]
  try {
    global.fetch = async () => new Response('', { status: 403 })
    await assert.rejects(adapter.read(AGREEMENT), /READ_FAILED_403/)
    global.fetch = async () => Response.json({ jmpv2_allocationsjson: '{}' })
    await assert.rejects(adapter.read(AGREEMENT), /CORRUPT/)
    global.fetch = async () => Response.json({}, { status: 200 })
    await assert.rejects(adapter.compareExchange(null, claim), /WRITE_UNCERTAIN/)
    global.fetch = async (_url, options) => Response.json(JSON.parse(options.body), { status: 201 })
    assert.equal(await adapter.compareExchange(null, claim), true)
  } finally { global.fetch = fetch }
})

function fakeDataverse() {
  const rows = new Map(), methods = []
  let nextLinkOverride = null
  return { rows, methods, setNextLink: (value) => { nextLinkOverride = value }, fetch: async (url, options = {}) => {
    const parsed = new URL(url)
    methods.push(options.method || 'GET')
    if (options.method === 'POST') {
      const row = JSON.parse(options.body)
      if (rows.has(row.jmpv2_paymentevidenceid)) return Response.json({ error: 'duplicate primary ID' }, { status: 400 })
      rows.set(row.jmpv2_paymentevidenceid, row)
      return Response.json(row, { status: 201 })
    }
    const id = parsed.pathname.match(/\(([a-f0-9-]+)\)$/)?.[1]
    if (id) return rows.has(id) ? Response.json(rows.get(id)) : new Response('', { status: 404 })
    const agreement = parsed.searchParams.get('$filter')?.match(/jmpv2_agreementkey eq '([^']+)'/)?.[1]
    const found = [...rows.values()].filter((r) => r.jmpv2_eventkind === 'PAYMENT_MUTATION_GUARD' && r.jmpv2_agreementkey === agreement)
    const offset = Number(parsed.searchParams.get('page') || 0)
    parsed.searchParams.set('page', String(offset + 1))
    return Response.json({ value: found.slice(offset, offset + 1),
      ...(nextLinkOverride || offset + 1 < found.length ? { '@odata.nextLink': nextLinkOverride || parsed.toString() } : {}) })
  } }
}

test('real store follows all pages, survives restart/recovery, and retains intents without updating evidence', async () => {
  const original = global.fetch, server = fakeDataverse()
  global.fetch = server.fetch
  try {
    const config = { webApiBaseUrl: 'https://example.invalid/api/data/v9.2', resourceUrl: 'https://example.invalid' }
    const make = () => new AgreementPaymentGuard(new DataversePaymentGuardStore(config, async () => 'test-token'))
    const guard = make(), entered = deferred(), release = deferred()
    const pending = guard.run(AGREEMENT, operation(), async () => { entered.resolve(); await release.promise })
    await entered.promise
    await assert.rejects(make().run(AGREEMENT, operation('REFUND'), async () => assert.fail('competing writer')), /BUSY/)
    release.resolve(); await pending
    await assert.rejects(make().run(AGREEMENT, operation('REFUND'), async () => { throw new Error('timeout') }), /timeout/)
    assert.equal((await make().readback(AGREEMENT)).claim.status, 'RECOVERY_REQUIRED')
    await recover(make())
    assert.equal((await make().readback(AGREEMENT)).claim.status, 'RELEASED')
    assert.equal(server.methods.every((m) => ['GET', 'POST'].includes(m)), true)
    await assert.rejects(make().run(AGREEMENT, { ...operation(), payload: {} }, async () => {}), /REPLAY_MISMATCH/)
    const head = server.rows.get(paymentGuardRowId(AGREEMENT, 2))
    server.rows.delete(paymentGuardRowId(AGREEMENT, 2))
    await assert.rejects(make().readback(AGREEMENT), /CHAIN_INVALID/)
    server.rows.set(paymentGuardRowId(AGREEMENT, 2), head)
    server.setNextLink('https://other.invalid/steal-token')
    await assert.rejects(make().readback(AGREEMENT), /PAGINATION_INVALID/)
  } finally { global.fetch = original }
})

test('real append-only store rejects a stale version and same-revision contender', async () => {
  const original = global.fetch, server = fakeDataverse()
  global.fetch = server.fetch
  try {
    const config = { webApiBaseUrl: 'https://example.invalid/api/data/v9.2', resourceUrl: 'https://example.invalid' }
    const a = new DataversePaymentGuardStore(config, async () => 'token')
    const b = new DataversePaymentGuardStore(config, async () => 'token')
    const fixture = new Store()
    await new AgreementPaymentGuard(fixture).run(AGREEMENT, operation(), async () => {})
    const claim = fixture.receipts[0]
    assert.deepEqual(await Promise.all([a.compareExchange(null, claim), b.compareExchange(null, { ...claim, claimId: 'competitor' })]), [true, false])
    const head = await a.read(AGREEMENT)
    assert.equal(await a.compareExchange(head, { ...claim, status: 'RELEASED' }), true)
    assert.equal(await b.compareExchange(head, { ...claim, status: 'RECOVERY_REQUIRED' }), false)
    assert.equal((await a.read(AGREEMENT)).claim.status, 'RELEASED')
  } finally { global.fetch = original }
})

test('busy and recovery holds are retryable, never acknowledged as successful webhook processing', () => {
  for (const reason of ['PAYMENT_GUARD_BUSY', 'PAYMENT_GUARD_RECOVERY_REQUIRED', 'DATAVERSE_PAYMENT_GUARD_WRITE_UNCERTAIN_503']) {
    assert.equal(paymentGuardHttpStatus(reason), 503)
  }
  assert.equal(paymentGuardHttpStatus('PAYMENT_AMOUNT_INVALID'), 422)
  const webhook = readFileSync('app/api/author/stripe/webhook/route.ts', 'utf8')
  assert.match(webhook, /result\.ok \? 200 : paymentGuardHttpStatus\(result\.reason\)/)
  const checkout = readFileSync('lib/server/stripe/publishing-additional-payment.ts', 'utf8')
  assert.match(checkout, /ledger\.withAgreementMutation/)
  assert.match(checkout, /PAYMENT_GUARD_AGREEMENT_CHANGED/)
})

test('guard acceptance is default-off, requires existing privileged key, and rejects scope injection', () => {
  const env = { JM1_PAYMENT_EVENT_RECOVERY_KEY: 'test-secret' }
  assert.equal(guardAcceptanceAuthorized('test-secret', env), false)
  env.JMP_PAYMENT_GUARD_ACCEPTANCE_ENABLED = 'true'
  assert.equal(guardAcceptanceAuthorized(null, env), false)
  assert.equal(guardAcceptanceAuthorized('wrong-secret', env), false)
  assert.equal(guardAcceptanceAuthorized('test-secret', env), true)
  const good = { action: 'RUN', runId: AGREEMENT }
  assert.deepEqual(parseGuardAcceptanceRequest(good), good)
  for (const input of [{ ...good, agreementId: AGREEMENT }, { ...good, holdMs: 999999 },
    { ...good, action: 'CHARGE' }, { ...good, runId: 'bad' }, { ...good, claimId: 'bad' },
    { ...good, action: 'RECOVER' }]) assert.throws(() => parseGuardAcceptanceRequest(input), /INPUT_INVALID/)
})

test('nonfinancial acceptance proves separate request contention, failure, orphan retention and restricted recovery', async () => {
  const store = new Store(), entered = deferred(), release = deferred()
  const dep = { store, assertNonBusinessNamespace: async () => {}, delay: async () => { entered.resolve(); await release.promise } }
  const running = executeGuardAcceptance({ action: 'RUN', runId: AGREEMENT }, dep)
  await entered.promise
  await assert.rejects(executeGuardAcceptance({ action: 'RUN', runId: OTHER }, dep), /BUSY/)
  const live = await store.read(PAYMENT_GUARD_ACCEPTANCE_ID)
  await assert.rejects(executeGuardAcceptance({ action: 'RECOVER', runId: AGREEMENT, claimId: live.claim.claimId }, dep), /RECOVERY_DENIED/)
  release.resolve(); await running
  const failureRunId = '44444444-4444-4444-8444-444444444444'
  await assert.rejects(executeGuardAcceptance({ action: 'FAIL', runId: failureRunId }, dep), /EXPECTED_FAILURE/)
  const failed = await store.read(PAYMENT_GUARD_ACCEPTANCE_ID)
  assert.equal(failed.claim.status, 'RECOVERY_REQUIRED')
  await executeGuardAcceptance({ action: 'RECOVER', runId: failureRunId, claimId: failed.claim.claimId }, dep)
  const orphan = await executeGuardAcceptance({ action: 'ABANDON', runId: '33333333-3333-4333-8333-333333333333' }, dep)
  assert.equal(orphan.readback.claim.status, 'HELD')
  const independent = new AgreementPaymentGuard(store)
  assert.equal((await independent.readback(PAYMENT_GUARD_ACCEPTANCE_ID)).claim.claimId, orphan.readback.claim.claimId)
  await executeGuardAcceptance({ action: 'RECOVER', runId: '33333333-3333-4333-8333-333333333333', claimId: orphan.readback.claim.claimId }, dep)
  assert.equal((await independent.readback(PAYMENT_GUARD_ACCEPTANCE_ID)).claim.status, 'RELEASED')
  assert.equal([...store.rows.keys()].every((id) => id === PAYMENT_GUARD_ACCEPTANCE_ID), true)
})

test('acceptance refuses a real agreement namespace and has no provider/business write adapters', async () => {
  const store = new Store()
  await assert.rejects(executeGuardAcceptance({ action: 'ABANDON', runId: AGREEMENT }, {
    store, assertNonBusinessNamespace: async () => { throw new Error('NAMESPACE_COLLISION') },
  }), /NAMESPACE_COLLISION/)
  assert.equal(store.rows.size, 0)
  assert.equal(store.intents.size, 0)
  const route = readFileSync('app/api/author/stripe/payment/guard-acceptance/route.ts', 'utf8')
  const source = readFileSync('lib/server/stripe/publishing-payment-guard-acceptance.ts', 'utf8')
  assert.doesNotMatch(route + source, /api\.stripe\.com|createInvoice|appendConfirmedPayment|appendRefund|sendEmail|createAdditionalPaymentCheckoutSession/)
})
