import { createHash, randomUUID } from 'node:crypto'
import { getDataverseServerConfig } from '../dataverse-server'
import { getDataverseRuntimeAccessToken } from '../publisher-runtime-auth'
import { createDataversePublishingPaymentLedger } from './publishing-payment-adapters'
import { calculateAgreementPaymentState } from './publishing-agreement-payment'
import { assertAgreementPaymentGuard, paymentMutationHash } from './publishing-payment-guard'
import { executeGovernedScheduleMutation } from './publishing-schedule-mutation'
import { ATTA_TAIL as P, ATTA_TAIL_PAYLOAD, assertTailIdentity, assertTailPreview, expectedTailProviderSnapshot,
  tailAssert, tailBusinessRow, tailSnapshotHashes } from './atta-approved-tail-plan'
import authority from './atta-approved-tail-authority.json'

type Capture = { snapshot: Record<string, any>; agreement: any; requirements: any[]; receipts: any[] }
function auditId(purpose: string) {
  const h = createHash('sha256').update(`${P.packet}:${purpose}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}
const intentId = auditId('APPROVED_INTENT')
const resultId = auditId('APPLIED_RESULT')
const sourceAgreement = `jmpv2_agreementrecords(${P.agreement})`
const guardEvidence = new Set(['PAYMENT_MUTATION_INTENT', 'PAYMENT_MUTATION_GUARD'])

function sameHashes(a: Record<string, string>, b: Record<string, string>) {
  tailAssert(paymentMutationHash(a) === paymentMutationHash(b), 'SOURCE_STATE_CHANGED')
}

function form(value: any, prefix = '', result = new URLSearchParams()): URLSearchParams {
  if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) form(item, prefix ? `${prefix}[${key}]` : key, result)
  } else result.append(prefix, String(value))
  return result
}

export class AttaTailOwnerIO {
  private config = getDataverseServerConfig()
  private receipts: any[] = []
  constructor(private fetcher: typeof fetch = fetch) {}
  lastReceipt() { return structuredClone(this.receipts.at(-1)) }

  async dv(path: string, init: RequestInit = {}) {
    tailAssert(this.config && this.config.authMode === 'MANAGED_IDENTITY', 'MANAGED_OWNER_REQUIRED')
    const response = await this.fetcher(`${this.config.webApiBaseUrl}/${path}`, { ...init,
      headers: { Authorization: `Bearer ${await getDataverseRuntimeAccessToken(this.config.resourceUrl)}`,
        Accept: 'application/json', ...init.headers }, cache: 'no-store', signal: AbortSignal.timeout(30000) })
    this.receipts.push({ provider: 'DATAVERSE', path, method: init.method || 'GET', status: response.status,
      requestId: response.headers.get('x-ms-service-request-id'), at: new Date().toISOString() })
    if (response.status === 404 && !init.method) return null
    tailAssert(response.ok, `DATAVERSE_${response.status}`)
    return response
  }

  async dvGet(path: string) { return (await this.dv(path))?.json() }

  async stripe(path: string, body?: unknown, mutate = false) {
    const key = process.env.STRIPE_CHECKOUT_SECRET_KEY || process.env.STRIPE_SECRET_KEY
    tailAssert(key, 'STRIPE_OWNER_KEY_MISSING')
    if (mutate) {
      assertAgreementPaymentGuard(P.agreement)
      tailAssert(path === `subscription_schedules/${P.schedule}` &&
        paymentMutationHash(body) === authority.approvedPayloadHash, 'EXACT_REQUEST_REQUIRED')
    } else if (body) tailAssert(path === 'invoices/create_preview', 'READ_ONLY_PROVIDER_PATH_REQUIRED')
    const response = await this.fetcher(`https://api.stripe.com/v1/${path}`, {
      method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${key}`, 'Stripe-Version': P.apiVersion,
        ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
        ...(mutate ? { 'Idempotency-Key': P.key } : {}) },
      ...(body ? { body: form(body) } : {}), cache: 'no-store', signal: AbortSignal.timeout(30000),
    })
    this.receipts.push({ provider: 'STRIPE', path, method: body ? 'POST' : 'GET', persistentMutation: mutate,
      status: response.status, requestId: response.headers.get('request-id'), apiVersion: response.headers.get('stripe-version'),
      at: new Date().toISOString() })
    tailAssert(response.ok, `STRIPE_${response.status}`)
    tailAssert(response.headers.get('stripe-version') === P.apiVersion, 'API_VERSION_DRIFT')
    return response.json()
  }

  async stripeList(path: string) {
    const rows: any[] = [], seen = new Set<string>()
    let cursor = ''
    for (let page = 0; page < 100; page++) {
      const body = await this.stripe(`${path}${path.includes('?') ? '&' : '?'}limit=100${cursor ? `&starting_after=${cursor}` : ''}`)
      tailAssert(Array.isArray(body.data), 'PROVIDER_PAGE_INVALID')
      rows.push(...body.data)
      if (body.has_more === false) return rows
      cursor = body.data.at(-1)?.id
      tailAssert(cursor && !seen.has(cursor), 'PROVIDER_CURSOR_INVALID')
      seen.add(cursor)
    }
    throw new Error('ATTA_TAIL_PROVIDER_PAGINATION_LIMIT')
  }

  async dvList(entity: string) {
    const query = new URLSearchParams({ $filter: `jmpv2_agreementkey eq '${P.agreement}'` })
    let path = `${entity}?${query}`
    const rows: any[] = [], seen = new Set<string>()
    for (let page = 0; page < 100; page++) {
      tailAssert(!seen.has(path), 'DATAVERSE_CURSOR_INVALID'); seen.add(path)
      const body = await this.dvGet(path)
      tailAssert(Array.isArray(body?.value), 'DATAVERSE_PAGE_INVALID')
      rows.push(...body.value)
      if (!body['@odata.nextLink']) return rows
      const next = new URL(body['@odata.nextLink']), base = new URL(`${this.config!.webApiBaseUrl}/${entity}`)
      tailAssert(next.origin === base.origin && next.pathname === base.pathname, 'DATAVERSE_CURSOR_SCOPE')
      path = `${entity}${next.search}`
    }
    throw new Error('ATTA_TAIL_DATAVERSE_PAGINATION_LIMIT')
  }

  async capture(): Promise<Capture> {
    const start = this.receipts.length
    const agreement = await this.dvGet(sourceAgreement)
    const requirements = await this.dvList('jmpv2_paymentrequirements')
    const payments = await this.dvList('jmpv2_paymentevidences')
    const snapshot: Record<string, any> = {
      agreement: tailBusinessRow(agreement),
      requirements: requirements.map(tailBusinessRow).sort((a, b) => a.jmpv2_paymentrequirementid.localeCompare(b.jmpv2_paymentrequirementid)),
      payments: payments.filter(r => !guardEvidence.has(r.jmpv2_eventkind) &&
        !((r.jmpv2_paymentevidenceid === intentId && r.jmpv2_eventkind === 'SCHEDULE_TAIL_INTENT') ||
          (r.jmpv2_paymentevidenceid === resultId && r.jmpv2_eventkind === 'SCHEDULE_TAIL_APPLIED'))).map(tailBusinessRow)
        .sort((a, b) => a.jmpv2_paymentevidenceid.localeCompare(b.jmpv2_paymentevidenceid)),
      customer: await this.stripe(`customers/${P.customer}`),
      subscription: await this.stripe(`subscriptions/${P.subscription}?expand[]=items.data.price`),
      schedule: await this.stripe(`subscription_schedules/${P.schedule}?expand[]=phases.items.price`),
    }
    const lists = { invoices: `invoices?customer=${P.customer}`, 'payment-intents': `payment_intents?customer=${P.customer}`,
      subscriptions: `subscriptions?customer=${P.customer}&status=all`, schedules: `subscription_schedules?customer=${P.customer}`,
      'pending-invoice-items': `invoiceitems?customer=${P.customer}&pending=true`,
      'all-invoice-items': `invoiceitems?customer=${P.customer}`, charges: `charges?customer=${P.customer}`,
      'balance-transactions': `customers/${P.customer}/balance_transactions`, 'tax-ids': `customers/${P.customer}/tax_ids` }
    for (const [name, path] of Object.entries(lists)) snapshot[name] = await this.stripeList(path)
    for (const invoice of snapshot.invoices) snapshot[`credit-notes-${invoice.id}`] = await this.stripeList(`credit_notes?invoice=${invoice.id}`)
    return { snapshot, agreement, requirements, receipts: this.receipts.slice(start) }
  }

  async preview(candidate: boolean) {
    const result = await this.stripe('invoices/create_preview', { schedule: P.schedule,
      ...(candidate ? { schedule_details: ATTA_TAIL_PAYLOAD } : {}) })
    assertTailPreview(result)
    return { invoiceId: result.id, amountDue: result.amount_due, dueDate: result.due_date, receipt: this.receipts.at(-1) }
  }

  async audit(id: string) {
    const row = await this.dvGet(`jmpv2_paymentevidences(${id})`)
    if (!row) return null
    const kind = id === intentId ? 'SCHEDULE_TAIL_INTENT' : 'SCHEDULE_TAIL_APPLIED'
    tailAssert(row.jmpv2_agreementkey === P.agreement && row.jmpv2_paymentevidenceid === id &&
      row.jmpv2_eventkind === kind && row.jmpv2_eventstatus === 'CONFIRMED' &&
      row.jmpv2_paymentevidencekey === `${P.packet}:${kind}`, 'AUDIT_BINDING_MISMATCH')
    return JSON.parse(row.jmpv2_allocationsjson)
  }

  auditRow(id: string, kind: string, facts: unknown) {
    return { jmpv2_paymentevidenceid: id, jmpv2_paymentevidencekey: `${P.packet}:${kind}`,
      jmpv2_idempotencykey: `${P.packet}:${kind}`, jmpv2_agreementkey: P.agreement, jmpv2_eventkind: kind,
      jmpv2_eventstatus: 'CONFIRMED', jmpv2_occurredat: new Date().toISOString(), jmpv2_allocationsjson: JSON.stringify(facts) }
  }

  async persistIntent(facts: unknown) {
    assertAgreementPaymentGuard(P.agreement)
    tailAssert(!await this.audit(intentId), 'EXISTING_INTENT_REQUIRES_OWNER_RECOVERY')
    await this.dv('jmpv2_paymentevidences', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.auditRow(intentId, 'SCHEDULE_TAIL_INTENT', facts)) })
    tailAssert(paymentMutationHash(await this.audit(intentId)) === paymentMutationHash(facts), 'INTENT_READBACK_FAILED')
  }

  async applyProjection(before: Capture, version: string, facts: unknown) {
    assertAgreementPaymentGuard(P.agreement)
    const feb = before.requirements.find(r => r.jmpv2_paymentrequirementid === P.february)
    const mar = before.requirements.find(r => r.jmpv2_paymentrequirementid === P.march)
    const requests = [
      { method: 'POST', path: 'jmpv2_paymentevidences', etag: null, body: this.auditRow(resultId, 'SCHEDULE_TAIL_APPLIED', facts) },
      { method: 'PATCH', path: `jmpv2_paymentrequirements(${P.february})`, etag: feb?.['@odata.etag'], body: { jmpv2_amountcents: 25983 } },
      { method: 'PATCH', path: `jmpv2_paymentrequirements(${P.march})`, etag: mar?.['@odata.etag'], body: { jmpv2_obligationstatus: 'CANCELLED' } },
      { method: 'PATCH', path: sourceAgreement, etag: before.agreement['@odata.etag'], body: { jmpv2_balanceversion: version } },
    ]
    tailAssert(requests.slice(1).every(r => /^W\/"\d+"$/.test(r.etag)), 'PROJECTION_ETAG_REQUIRED')
    const boundary = `batch_${randomUUID()}`, changeset = `changeset_${randomUUID()}`
    const lines = [`--${boundary}`, `Content-Type: multipart/mixed; boundary=${changeset}`, '']
    requests.forEach((r, index) => lines.push(`--${changeset}`, 'Content-Type: application/http',
      'Content-Transfer-Encoding: binary', `Content-ID: ${index + 1}`, '',
      `${r.method} /api/data/v9.2/${r.path} HTTP/1.1`, 'Content-Type: application/json',
      ...(r.etag ? [`If-Match: ${r.etag}`] : []), '', JSON.stringify(r.body)))
    lines.push(`--${changeset}--`, `--${boundary}--`, '')
    const response = await this.dv('$batch', { method: 'POST', headers: { 'Content-Type': `multipart/mixed; boundary=${boundary}` }, body: lines.join('\r\n') })
    const body = await response!.text(), codes = [...body.matchAll(/HTTP\/1\.1 (\d{3})/g)].map(m => Number(m[1]))
    tailAssert(codes.length === 4 && codes.every(code => code >= 200 && code < 300), 'ATOMIC_PROJECTION_FAILED_RECOVER_FORWARD')
    tailAssert(paymentMutationHash(await this.audit(resultId)) === paymentMutationHash(facts), 'RESULT_READBACK_FAILED')
  }
}

export async function inspectAttaApprovedTail(io = new AttaTailOwnerIO()) {
  const capture = await io.capture()
  const result = await io.audit(resultId)
  if (result) {
    tailAssert(result.packet === P.packet && result.approvedPayloadHash === authority.approvedPayloadHash && result.idempotencyKey === P.key,
      'RESULT_AUTHORITY_MISMATCH')
    assertTailIdentity(capture.snapshot, true)
    sameHashes(tailSnapshotHashes(capture.snapshot), result.expectedAfterHashes)
    return { status: 'APPLIED_VERIFIED', auditId: resultId, balanceCents: P.balance, mutations: 0 }
  }
  assertTailIdentity(capture.snapshot)
  sameHashes(tailSnapshotHashes(capture.snapshot), authority.sourceHashes)
  const previews = [await io.preview(false), await io.preview(true)]
  return { status: 'UNCHANGED_PREFLIGHT', balanceCents: P.balance, futureInvoiceAmounts: [25988, 25988, 25988, 25988, 25983],
    projectedScheduleEnd: '2027-03-20T12:18:59Z', previews, sourceHashes: tailSnapshotHashes(capture.snapshot), mutations: 0 }
}

// Dependency injection supports non-live integration tests; the HTTP owner supplies no overrides.
export async function executeAttaApprovedTail(io = new AttaTailOwnerIO(), ledger = createDataversePublishingPaymentLedger(), sourceAuthority = authority) {
  let before: Capture, previews: unknown[], projectedVersion: string
  const payload = { apiVersion: P.apiVersion, path: `subscription_schedules/${P.schedule}`, idempotencyKey: P.key, body: ATTA_TAIL_PAYLOAD }
  return executeGovernedScheduleMutation({ agreementId: P.agreement, operationId: P.packet,
    approvalReference: P.approval, approvedPayloadHash: paymentMutationHash(payload), payload, ledger,
    verifyAuthority: async () => sourceAuthority.approvalReference === P.approval &&
      sourceAuthority.approvedPayloadHash === paymentMutationHash(ATTA_TAIL_PAYLOAD),
    readVerifiedCompletion: async () => {
      const result = await io.audit(resultId)
      if (!result) return null
      tailAssert(result.packet === P.packet && result.approvedPayloadHash === sourceAuthority.approvedPayloadHash &&
        result.idempotencyKey === P.key, 'RESULT_AUTHORITY_MISMATCH')
      const live = await io.capture()
      assertTailIdentity(live.snapshot, true)
      sameHashes(tailSnapshotHashes(live.snapshot), result.expectedAfterHashes)
      return { verified: true, result: { status: 'ALREADY_APPLIED', auditId: resultId, balanceCents: P.balance } }
    },
    freshPreflight: async () => {
      tailAssert(Date.now() < 1792498739 * 1000, 'AUTHORITY_WINDOW_EXPIRED')
      before = await io.capture()
      assertTailIdentity(before.snapshot)
      sameHashes(tailSnapshotHashes(before.snapshot), sourceAuthority.sourceHashes)
      const record = await ledger.getAgreement(P.agreement)
      tailAssert(record && record.etag === before.agreement['@odata.etag'], 'LEDGER_SNAPSHOT_DRIFT')
      tailAssert(record.snapshot.scheduledObligations?.length === 8, 'LEDGER_OBLIGATIONS_INCOMPLETE')
      const snapshot = { ...record.snapshot, scheduledObligations: record.snapshot.scheduledObligations.map(r =>
        r.obligationId === P.february ? { ...r, amountCents: 25983 } :
          r.obligationId === P.march ? { ...r, status: 'CANCELLED' as const } : r) }
      const state = calculateAgreementPaymentState(snapshot)
      tailAssert(state.remainingBalanceCents === P.balance && state.nextScheduledDueDate === P.octoberDue, 'PROJECTED_MODEL_DRIFT')
      projectedVersion = state.balanceVersion
      previews = [await io.preview(false), await io.preview(true)]
      return true
    },
    executeAndVerify: async () => {
      const facts = { packet: P.packet, approvalReference: P.approval, approvalSourceHash: sourceAuthority.approvalSourceHash,
        approvedPayloadHash: sourceAuthority.approvedPayloadHash, payload, idempotencyKey: P.key,
        preimages: { agreement: before.agreement, requirements: before.requirements,
          schedule: before.snapshot.schedule, subscription: before.snapshot.subscription },
        beforeHashes: tailSnapshotHashes(before.snapshot), previews, receipts: before.receipts }
      await io.persistIntent(facts)
      const immediate = await io.capture()
      sameHashes(tailSnapshotHashes(immediate.snapshot), facts.beforeHashes)
      tailAssert(immediate.agreement['@odata.etag'] === before.agreement['@odata.etag'], 'AGREEMENT_ETAG_DRIFT')
      for (const id of [P.february, P.march]) tailAssert(
        immediate.requirements.find(r => r.jmpv2_paymentrequirementid === id)?.['@odata.etag'] ===
        before.requirements.find(r => r.jmpv2_paymentrequirementid === id)?.['@odata.etag'], 'REQUIREMENT_ETAG_DRIFT')
      await io.stripe(`subscription_schedules/${P.schedule}`, ATTA_TAIL_PAYLOAD, true)
      const providerMutationReceipt = io.lastReceipt()
      const expected = expectedTailProviderSnapshot(before.snapshot)
      const providerAfter = await io.capture()
      sameHashes(tailSnapshotHashes(providerAfter.snapshot), tailSnapshotHashes(expected))
      const afterPreview = await io.preview(false)
      expected.requirements.find((r: any) => r.jmpv2_paymentrequirementid === P.february).jmpv2_amountcents = 25983
      expected.requirements.find((r: any) => r.jmpv2_paymentrequirementid === P.march).jmpv2_obligationstatus = 'CANCELLED'
      expected.agreement.jmpv2_balanceversion = projectedVersion
      assertTailIdentity(expected, true)
      const result = { packet: P.packet, intentId, approvedPayloadHash: sourceAuthority.approvedPayloadHash, idempotencyKey: P.key,
        reason: 'TAIL_REDUCTION_FROM_CONFIRMED_ADDITIONAL_PRINCIPAL', extraPaymentId: 'pi_3UJyOeJCiOVFpgYu1UppQVP8',
        balanceCents: P.balance, activeFutureObligations: 5, expectedAfterHashes: tailSnapshotHashes(expected),
        priorBalanceVersion: before.snapshot.agreement.jmpv2_balanceversion, projectedBalanceVersion: projectedVersion,
        afterPreview, providerMutationReceipt, providerReceipts: providerAfter.receipts }
      await io.applyProjection(before, projectedVersion, result)
      const final = await io.capture()
      sameHashes(tailSnapshotHashes(final.snapshot), result.expectedAfterHashes)
      assertTailIdentity(final.snapshot, true)
      return { verified: true, result: { status: 'APPLIED_VERIFIED', auditId: resultId, balanceCents: P.balance } }
    },
  })
}
