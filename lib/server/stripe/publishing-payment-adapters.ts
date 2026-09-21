import { randomUUID } from 'node:crypto'

import {
  dataverseFirst,
  dataverseList,
  getDataverseServerConfig,
  type DataverseRow,
  type DataverseServerConfig,
} from '../dataverse-server'
import type {
  AgreementPayment,
  AgreementPaymentSnapshot,
  AgreementRefund,
  ScheduledObligation,
} from './publishing-agreement-payment'
import { calculateAgreementPaymentState } from './publishing-agreement-payment'
import {
  productionPaymentGateReadback,
  type AgreementLedgerRecord,
  type CollectionAttempt,
  type PaymentEventRecord,
  type PublishingPaymentLedger,
  type QboPaymentEffect,
  type QboPublishingPaymentAdapter,
  type StripeAgreementCollections,
} from './publishing-payment-runtime'

const STRIPE_API_BASE = 'https://api.stripe.com'
const AGREEMENTS = 'jmpv2_agreementrecords'
const OBLIGATIONS = 'jmpv2_paymentrequirements'
const EVENTS = 'jmpv2_paymentevidences'

export function createDataversePublishingPaymentLedger(): PublishingPaymentLedger {
  const config = getDataverseServerConfig()
  if (!config) throw new Error('DATAVERSE_PAYMENT_LEDGER_CONFIG_MISSING')
  return new DataversePublishingPaymentLedger(config)
}

export class DataversePublishingPaymentLedger implements PublishingPaymentLedger {
  constructor(private readonly config: DataverseServerConfig) {}

  async getAgreement(agreementId: string) {
    const id = guid(agreementId)
    const row = await dataverseFirst(this.config, AGREEMENTS, {
      $select: agreementSelect,
      $filter: `jmpv2_agreementrecordid eq ${id}`,
    })
    return row ? this.hydrateAgreement(row) : null
  }

  async listDueAgreements(asOf: string) {
    const rows = await dataverseList(this.config, AGREEMENTS, {
      $select: agreementSelect,
      $filter: `jmpv2_paymentledgerstatus eq 'ACTIVE' and jmpv2_nextduedate le ${asOf}`,
      $orderby: 'jmpv2_nextduedate asc',
    })
    return Promise.all(rows.map((row) => this.hydrateAgreement(row)))
  }

  async findPaymentEvent(stripeEventId: string, stripePaymentId: string) {
    const filter = `jmpv2_stripeeventid eq '${odata(stripeEventId)}' or jmpv2_stripepaymentid eq '${odata(stripePaymentId)}'`
    const row = await dataverseFirst(this.config, EVENTS, { $select: eventSelect, $filter: filter })
    if (!row) return null
    const event = mapEvent(row)
    const reconciliation = await dataverseFirst(this.config, EVENTS, {
      $select: 'jmpv2_eventstatus,jmpv2_qbotransactionid',
      $filter: `jmpv2_eventkind eq 'QBO_RECONCILIATION' and jmpv2_originalpaymentid eq '${odata(event.paymentEventId)}'`,
      $orderby: 'jmpv2_occurredat desc',
    })
    if (reconciliation) {
      event.qboReconciliationStatus = text(reconciliation.jmpv2_eventstatus) as PaymentEventRecord['qboReconciliationStatus']
      event.qboTransactionId = text(reconciliation.jmpv2_qbotransactionid) || null
    }
    return event
  }

  async appendConfirmedPayment(input: {
    agreement: AgreementLedgerRecord
    event: PaymentEventRecord
    payment: AgreementPayment
    expectedEtag: string
  }) {
    const state = calculateAgreementPaymentState({
      ...input.agreement.snapshot,
      payments: [...input.agreement.snapshot.payments, input.payment],
    })
    await this.atomicLedgerCommit({
      agreementId: input.agreement.snapshot.agreementId,
      expectedEtag: input.expectedEtag,
      event: paymentEventPayload(input.event),
      agreementPatch: agreementStatePatch(state),
    })
    const record = await this.getAgreement(input.agreement.snapshot.agreementId)
    if (!record) throw new Error('DATAVERSE_LEDGER_READBACK_MISSING')
    return { applied: true, record }
  }

  async appendRefund(input: {
    agreement: AgreementLedgerRecord
    refund: AgreementRefund
    expectedEtag: string
  }) {
    const state = calculateAgreementPaymentState({
      ...input.agreement.snapshot,
      refunds: [...(input.agreement.snapshot.refunds || []), input.refund],
    })
    await this.atomicLedgerCommit({
      agreementId: input.agreement.snapshot.agreementId,
      expectedEtag: input.expectedEtag,
      event: refundEventPayload(input.agreement.snapshot.agreementId, input.refund, state),
      agreementPatch: agreementStatePatch(state),
    })
    const record = await this.getAgreement(input.agreement.snapshot.agreementId)
    if (!record) throw new Error('DATAVERSE_LEDGER_READBACK_MISSING')
    return { applied: true, record }
  }

  async findCollectionAttempt(executionKey: string) {
    const row = await dataverseFirst(this.config, EVENTS, {
      $select: 'jmpv2_idempotencykey,jmpv2_agreementkey,jmpv2_obligationid,jmpv2_grossamountcents,jmpv2_stripeinvoiceid,jmpv2_eventstatus,jmpv2_occurredat',
      $filter: `jmpv2_eventkind eq 'COLLECTION_ATTEMPT' and jmpv2_idempotencykey eq '${odata(executionKey)}'`,
    })
    if (!row) return null
    return {
      executionKey: text(row.jmpv2_idempotencykey),
      agreementId: text(row.jmpv2_agreementkey),
      obligationId: text(row.jmpv2_obligationid) || null,
      amountCents: integer(row.jmpv2_grossamountcents),
      stripeInvoiceId: text(row.jmpv2_stripeinvoiceid),
      status: 'CREATED' as const,
      createdAt: text(row.jmpv2_occurredat),
    }
  }

  async recordCollectionAttempt(attempt: CollectionAttempt) {
    await this.createEvidence({
      jmpv2_paymentevidencekey: attempt.executionKey,
      jmpv2_agreementkey: attempt.agreementId,
      jmpv2_eventkind: 'COLLECTION_ATTEMPT',
      jmpv2_paymenttype: 'SCHEDULED_INSTALLMENT',
      jmpv2_obligationid: attempt.obligationId,
      jmpv2_grossamountcents: attempt.amountCents,
      jmpv2_stripeinvoiceid: attempt.stripeInvoiceId,
      jmpv2_eventstatus: attempt.status,
      jmpv2_idempotencykey: attempt.executionKey,
      jmpv2_occurredat: attempt.createdAt,
    })
  }

  async markQboReconciliation(input: {
    paymentEventId: string
    status: 'PASS' | 'ATTENTION_REQUIRED'
    qboTransactionId?: string | null
  }) {
    const row = await dataverseFirst(this.config, EVENTS, {
      $select: 'jmpv2_agreementkey',
      $filter: `jmpv2_paymentevidencekey eq '${odata(input.paymentEventId)}'`,
    })
    if (!row) throw new Error('DATAVERSE_PAYMENT_EVENT_NOT_FOUND')
    const reconciliationKey = `qbo:${input.paymentEventId}:${input.status}:${input.qboTransactionId || 'none'}`
    const existing = await dataverseFirst(this.config, EVENTS, {
      $select: 'jmpv2_paymentevidenceid',
      $filter: `jmpv2_paymentevidencekey eq '${odata(reconciliationKey)}'`,
    })
    if (existing) return
    await this.createEvidence({
      jmpv2_paymentevidencekey: reconciliationKey,
      jmpv2_agreementkey: text(row.jmpv2_agreementkey),
      jmpv2_eventkind: 'QBO_RECONCILIATION',
      jmpv2_originalpaymentid: input.paymentEventId,
      jmpv2_eventstatus: input.status,
      jmpv2_qbotransactionid: input.qboTransactionId || null,
      jmpv2_idempotencykey: reconciliationKey,
      jmpv2_occurredat: new Date().toISOString(),
    })
  }

  private async hydrateAgreement(row: DataverseRow): Promise<AgreementLedgerRecord> {
    const agreementId = text(row.jmpv2_agreementrecordid)
    const agreementKey = text(row.jmpv2_agreementkey)
    const [obligationRows, eventRows] = await Promise.all([
      dataverseList(this.config, OBLIGATIONS, {
        $select: 'jmpv2_paymentrequirementid,jmpv2_duedate,jmpv2_amountcents,jmpv2_obligationstatus',
        $filter: `jmpv2_agreementkey eq '${odata(agreementKey)}'`,
        $orderby: 'jmpv2_duedate asc',
      }),
      dataverseList(this.config, EVENTS, {
        $select: eventSelect,
        $filter: `jmpv2_agreementkey eq '${odata(agreementKey)}' and (jmpv2_eventkind eq 'PAYMENT' or jmpv2_eventkind eq 'REFUND')`,
        $orderby: 'jmpv2_occurredat asc',
      }),
    ])
    const payments: AgreementPayment[] = eventRows
      .filter((event) => text(event.jmpv2_eventkind) === 'PAYMENT')
      .map((event) => ({
        paymentId: text(event.jmpv2_stripepaymentid),
        eventId: text(event.jmpv2_stripeeventid),
        paymentType: text(event.jmpv2_paymenttype) as AgreementPayment['paymentType'],
        amountCents: integer(event.jmpv2_grossamountcents),
        status: text(event.jmpv2_eventstatus) === 'CONFIRMED' ? 'SUCCEEDED' : 'FAILED',
        allocations: json(event.jmpv2_allocationsjson, []),
        paidAt: text(event.jmpv2_occurredat),
      }))
    const refunds: AgreementRefund[] = eventRows
      .filter((event) => text(event.jmpv2_eventkind) === 'REFUND')
      .map((event) => ({
        refundId: text(event.jmpv2_refundid),
        eventId: text(event.jmpv2_stripeeventid),
        originalPaymentId: text(event.jmpv2_originalpaymentid),
        amountCents: integer(event.jmpv2_grossamountcents),
        status: text(event.jmpv2_eventstatus) === 'CONFIRMED' ? 'SUCCEEDED' : 'FAILED',
        refundedAt: text(event.jmpv2_occurredat),
      }))
    const scheduledObligations: ScheduledObligation[] = obligationRows.map((obligation) => ({
      obligationId: text(obligation.jmpv2_paymentrequirementid),
      dueDate: text(obligation.jmpv2_duedate),
      amountCents: integer(obligation.jmpv2_amountcents),
      status: text(obligation.jmpv2_obligationstatus) as ScheduledObligation['status'],
    }))
    const snapshot: AgreementPaymentSnapshot = {
      agreementId,
      authorId: text(row.jmpv2_authoridentity),
      titleId: text(row.jmpv2_titleid),
      paymentScheduleId: text(row.jmpv2_paymentscheduleid),
      currency: 'usd',
      contractualBalanceCents: integer(row.jmpv2_totalagreementamountcents),
      normalInstallmentCents: integer(row.jmpv2_scheduledinstallmentamountcents),
      nextScheduledDueDate: text(row.jmpv2_nextduedate) || null,
      scheduledObligations,
      payments,
      refunds,
    }
    return {
      snapshot,
      stripeCustomerId: text(row.jmpv2_stripecustomerid),
      qboCustomerReference: text(row.jmpv2_qbocustomerreference),
      qboReceivableReference: text(row.jmpv2_qboreceivablereference),
      etag: text(row['@odata.etag']),
      status: text(row.jmpv2_paymentledgerstatus) as AgreementLedgerRecord['status'],
    }
  }

  private async createEvidence(payload: Record<string, unknown>) {
    return this.evidenceRequest('', 'POST', payload)
  }

  private async evidenceRequest(suffix: string, method: 'POST', payload: Record<string, unknown>) {
    const response = await fetch(`${this.config.webApiBaseUrl}/${EVENTS}${suffix}`, {
      method,
      headers: {
        Authorization: `Bearer ${await getDataverseActionToken(this.config)}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`DATAVERSE_PAYMENT_EVIDENCE_WRITE_FAILED_${response.status}`)
  }

  private async atomicLedgerCommit(input: {
    agreementId: string
    expectedEtag: string
    event: Record<string, unknown>
    agreementPatch: Record<string, unknown>
  }) {
    const batch = buildAtomicLedgerBatch(input)
    const response = await fetch(`${this.config.webApiBaseUrl}/$batch`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await getDataverseActionToken(this.config)}`,
        Accept: 'application/json',
        'Content-Type': `multipart/mixed; boundary=${batch.boundary}`,
      },
      body: batch.body,
      cache: 'no-store',
    })
    const body = await response.text()
    if (response.status === 412 || /HTTP\/1\.1 412/.test(body)) throw new Error('CONCURRENT_BALANCE_WRITE_REJECTED')
    if (!response.ok || /HTTP\/1\.1 [45]\d\d/.test(body)) throw new Error('DATAVERSE_PAYMENT_BATCH_FAILED')
  }
}

export function createStripeAgreementCollections(): StripeAgreementCollections {
  const gate = productionPaymentGateReadback()
  if (!gate.enabled) throw new Error(`AGREEMENT_PAYMENT_GATE_CLOSED:${gate.missing.join(',')}`)
  const secret = clean(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_CHECKOUT_SECRET_KEY)
  if (!/^(sk|rk)_live_/.test(secret)) throw new Error('STRIPE_LIVE_PAYMENT_CREDENTIAL_REQUIRED')
  return {
    async createInvoice(input) {
      const item = new URLSearchParams({
        customer: input.customerId,
        amount: String(input.amountCents),
        currency: 'usd',
        description: 'Publishing agreement payment',
      })
      addMetadata(item, input.metadata)
      await stripePost('/v1/invoiceitems', item, `${input.idempotencyKey}:item`, secret)
      const invoiceBody = new URLSearchParams({
        customer: input.customerId,
        collection_method: 'send_invoice',
        days_until_due: '1',
        auto_advance: 'true',
        description: 'Publishing agreement payment',
      })
      addMetadata(invoiceBody, input.metadata)
      const invoice = await stripePost('/v1/invoices', invoiceBody, `${input.idempotencyKey}:invoice`, secret)
      const invoiceId = requiredText(invoice.id, 'STRIPE_INVOICE_ID_MISSING')
      const finalized = await stripePost(`/v1/invoices/${encodeURIComponent(invoiceId)}/finalize`, new URLSearchParams(), `${input.idempotencyKey}:finalize`, secret)
      return {
        invoiceId,
        hostedInvoiceUrl: requiredText(finalized.hosted_invoice_url, 'STRIPE_HOSTED_INVOICE_URL_MISSING'),
      }
    },
  }
}

export function createGovernedQboPaymentAdapter(): QboPublishingPaymentAdapter {
  const endpoint = clean(process.env.JM1_QBO_PAYMENT_ADAPTER_URL)
  const credential = clean(process.env.JM1_QBO_PAYMENT_ADAPTER_KEY)
  const scopes = new Set(clean(process.env.JM1_QBO_PAYMENT_ADAPTER_SCOPES).split(/\s+/).filter(Boolean))
  if (!endpoint || !credential) throw new Error('QBO_PAYMENT_ADAPTER_NOT_COMMISSIONED')
  if (!scopes.has('customer_payment:create') || !scopes.has('customer_payment:read')) {
    throw new Error('QBO_PAYMENT_PERMISSION_SCOPE_INCOMPLETE')
  }
  if ([...scopes].some((scope) => !['customer_payment:create', 'customer_payment:read'].includes(scope))) {
    throw new Error('QBO_PAYMENT_PERMISSION_SCOPE_TOO_BROAD')
  }
  return {
    async postCustomerPayment(effect) {
      const response = await qboAdapterRequest(endpoint, credential, '/customer-payments', {
        method: 'POST',
        body: effect,
        idempotencyKey: effect.idempotencyKey,
      })
      return { transactionId: requiredText(response.transactionId, 'QBO_TRANSACTION_ID_MISSING') }
    },
    async readCustomerPayment(transactionId) {
      const response = await qboAdapterRequest(endpoint, credential, `/customer-payments/${encodeURIComponent(transactionId)}`, { method: 'GET' })
      return response.effect && typeof response.effect === 'object' ? response.effect as QboPaymentEffect : null
    },
  }
}

const agreementSelect = [
  'jmpv2_agreementrecordid', 'jmpv2_agreementkey', 'jmpv2_authoridentity', 'jmpv2_titleid', 'jmpv2_paymentscheduleid',
  'jmpv2_totalagreementamountcents', 'jmpv2_scheduledinstallmentamountcents', 'jmpv2_schedulecadence', 'jmpv2_nextduedate',
  'jmpv2_stripecustomerid', 'jmpv2_qbocustomerreference', 'jmpv2_qboreceivablereference', 'jmpv2_paymentledgerstatus',
].join(',')

const eventSelect = [
  'jmpv2_paymentevidenceid', 'jmpv2_paymentevidencekey', 'jmpv2_agreementkey', 'jmpv2_eventkind', 'jmpv2_paymenttype',
  'jmpv2_stripeeventid', 'jmpv2_stripepaymentid', 'jmpv2_stripeinvoiceid', 'jmpv2_refundid',
  'jmpv2_originalpaymentid', 'jmpv2_grossamountcents', 'jmpv2_scheduledallocationcents',
  'jmpv2_pastdueallocationcents', 'jmpv2_additionalallocationcents', 'jmpv2_allocationsjson',
  'jmpv2_balancebeforecents', 'jmpv2_balanceaftercents', 'jmpv2_eventstatus',
  'jmpv2_qboreconciliationstatus', 'jmpv2_qbotransactionid', 'jmpv2_idempotencykey', 'jmpv2_occurredat',
].join(',')

function mapEvent(row: DataverseRow): PaymentEventRecord {
  return {
    paymentEventId: text(row.jmpv2_paymentevidencekey),
    agreementId: text(row.jmpv2_agreementkey),
    paymentType: text(row.jmpv2_paymenttype) as PaymentEventRecord['paymentType'],
    stripeEventId: text(row.jmpv2_stripeeventid),
    stripePaymentId: text(row.jmpv2_stripepaymentid),
    stripeInvoiceId: text(row.jmpv2_stripeinvoiceid) || null,
    grossAmountCents: integer(row.jmpv2_grossamountcents),
    scheduledAllocationCents: integer(row.jmpv2_scheduledallocationcents),
    pastDueAllocationCents: integer(row.jmpv2_pastdueallocationcents),
    additionalAllocationCents: integer(row.jmpv2_additionalallocationcents),
    allocations: json(row.jmpv2_allocationsjson, []),
    balanceBeforeCents: integer(row.jmpv2_balancebeforecents),
    balanceAfterCents: integer(row.jmpv2_balanceaftercents),
    status: text(row.jmpv2_eventstatus) as PaymentEventRecord['status'],
    qboReconciliationStatus: text(row.jmpv2_qboreconciliationstatus) as PaymentEventRecord['qboReconciliationStatus'],
    qboTransactionId: text(row.jmpv2_qbotransactionid) || null,
    idempotencyKey: text(row.jmpv2_idempotencykey),
    occurredAt: text(row.jmpv2_occurredat),
  }
}

function paymentEventPayload(event: PaymentEventRecord) {
  return {
    jmpv2_paymentevidencekey: event.paymentEventId,
    jmpv2_agreementkey: event.agreementId,
    jmpv2_eventkind: 'PAYMENT',
    jmpv2_paymenttype: event.paymentType,
    jmpv2_stripeeventid: event.stripeEventId,
    jmpv2_stripepaymentid: event.stripePaymentId,
    jmpv2_stripeinvoiceid: event.stripeInvoiceId,
    jmpv2_grossamountcents: event.grossAmountCents,
    jmpv2_scheduledallocationcents: event.scheduledAllocationCents,
    jmpv2_pastdueallocationcents: event.pastDueAllocationCents,
    jmpv2_additionalallocationcents: event.additionalAllocationCents,
    jmpv2_allocationsjson: JSON.stringify(event.allocations),
    jmpv2_balancebeforecents: event.balanceBeforeCents,
    jmpv2_balanceaftercents: event.balanceAfterCents,
    jmpv2_eventstatus: event.status,
    jmpv2_qboreconciliationstatus: event.qboReconciliationStatus,
    jmpv2_qbotransactionid: event.qboTransactionId,
    jmpv2_idempotencykey: event.idempotencyKey,
    jmpv2_occurredat: event.occurredAt,
  }
}

function refundEventPayload(agreementId: string, refund: AgreementRefund, state: ReturnType<typeof calculateAgreementPaymentState>) {
  return {
    jmpv2_paymentevidencekey: refund.eventId,
    jmpv2_agreementkey: agreementId,
    jmpv2_eventkind: 'REFUND',
    jmpv2_stripeeventid: refund.eventId,
    jmpv2_refundid: refund.refundId,
    jmpv2_originalpaymentid: refund.originalPaymentId,
    jmpv2_grossamountcents: refund.amountCents,
    jmpv2_balanceaftercents: state.remainingBalanceCents,
    jmpv2_eventstatus: refund.status === 'SUCCEEDED' ? 'CONFIRMED' : 'FAILED',
    jmpv2_qboreconciliationstatus: 'PENDING',
    jmpv2_idempotencykey: refund.refundId,
    jmpv2_occurredat: refund.refundedAt,
  }
}

function agreementStatePatch(state: ReturnType<typeof calculateAgreementPaymentState>) {
  return {
    jmpv2_currentbalancecents: state.remainingBalanceCents,
    jmpv2_pastduebalancecents: state.pastDueBalanceCents,
    jmpv2_balanceversion: state.balanceVersion,
    jmpv2_paymentledgerstatus: state.paidInFull ? 'PAID_IN_FULL' : 'ACTIVE',
    jmpv2_payoffstatus: state.paidInFull ? 'PAID_IN_FULL' : 'OPEN',
    jmpv2_nextduedate: state.nextScheduledDueDate,
    jmpv2_nextpaymentat: state.nextScheduledDueDate,
  }
}

function buildAtomicLedgerBatch(input: {
  agreementId: string
  expectedEtag: string
  event: Record<string, unknown>
  agreementPatch: Record<string, unknown>
}) {
  const suffix = randomUUID()
  const boundary = `batch_${suffix}`
  const changeset = `changeset_${suffix}`
  const lines = [
    `--${boundary}`,
    `Content-Type: multipart/mixed; boundary=${changeset}`,
    '',
    `--${changeset}`,
    'Content-Type: application/http',
    'Content-Transfer-Encoding: binary',
    'Content-ID: 1',
    '',
    `POST /api/data/v9.2/${EVENTS} HTTP/1.1`,
    'Content-Type: application/json;type=entry',
    '',
    JSON.stringify(input.event),
    `--${changeset}`,
    'Content-Type: application/http',
    'Content-Transfer-Encoding: binary',
    'Content-ID: 2',
    '',
    `PATCH /api/data/v9.2/${AGREEMENTS}(${guid(input.agreementId)}) HTTP/1.1`,
    'Content-Type: application/json;type=entry',
    `If-Match: ${input.expectedEtag}`,
    '',
    JSON.stringify(input.agreementPatch),
    `--${changeset}--`,
    `--${boundary}--`,
    '',
  ]
  return { boundary, body: lines.join('\r\n') }
}

async function stripePost(path: string, body: URLSearchParams, idempotencyKey: string, secret: string) {
  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': idempotencyKey },
    body,
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result?.error?.code || `STRIPE_PAYMENT_REQUEST_FAILED_${response.status}`)
  return result
}

function addMetadata(body: URLSearchParams, metadata: Record<string, string>) {
  for (const [key, value] of Object.entries(metadata)) body.set(`metadata[${key}]`, value)
}

async function qboAdapterRequest(endpoint: string, credential: string, path: string, input: {
  method: 'GET' | 'POST'
  body?: QboPaymentEffect
  idempotencyKey?: string
}) {
  const response = await fetch(`${endpoint.replace(/\/$/, '')}${path}`, {
    method: input.method,
    headers: {
      Authorization: `Bearer ${credential}`,
      Accept: 'application/json',
      ...(input.body ? { 'Content-Type': 'application/json' } : {}),
      ...(input.idempotencyKey ? { 'Idempotency-Key': input.idempotencyKey } : {}),
    },
    body: input.body ? JSON.stringify(input.body) : undefined,
    cache: 'no-store',
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result?.code || `QBO_PAYMENT_ADAPTER_FAILED_${response.status}`)
  return result
}

async function getDataverseActionToken(config: DataverseServerConfig) {
  const { getDataverseRuntimeAccessToken } = await import('../publisher-runtime-auth')
  return getDataverseRuntimeAccessToken(config.resourceUrl)
}

function guid(value: string) {
  const normalized = value.trim().replace(/[{}]/g, '').toLowerCase()
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(normalized)) {
    throw new Error('AGREEMENT_ID_INVALID')
  }
  return normalized
}

function odata(value: string) { return value.replace(/'/g, "''") }
function text(value: unknown) { return typeof value === 'string' ? value.trim() : '' }
function clean(value: unknown) { return text(value) }
function integer(value: unknown) {
  const number = Number(value)
  if (!Number.isSafeInteger(number)) throw new Error('DATAVERSE_LEDGER_INTEGER_INVALID')
  return number
}
function json<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || !value.trim()) return fallback
  try { return JSON.parse(value) as T } catch { throw new Error('DATAVERSE_LEDGER_JSON_INVALID') }
}
function requiredText(value: unknown, code: string) {
  const result = text(value)
  if (!result) throw new Error(code)
  return result
}
