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
const AGREEMENTS = 'jm1pub_publishingagreements'
const OBLIGATIONS = 'jm1pub_paymentobligations'
const EVENTS = 'jm1pub_paymentevents'
const ATTEMPTS = 'jm1pub_paymentcollectionattempts'

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
      $filter: `jm1pub_agreementid eq '${odata(id)}'`,
    })
    return row ? this.hydrateAgreement(row) : null
  }

  async listDueAgreements(asOf: string) {
    const rows = await dataverseList(this.config, AGREEMENTS, {
      $select: agreementSelect,
      $filter: `jm1pub_paymentstatus eq 'ACTIVE' and jm1pub_nextpaymentat le ${asOf}`,
      $orderby: 'jm1pub_nextpaymentat asc',
    })
    return Promise.all(rows.map((row) => this.hydrateAgreement(row)))
  }

  async findPaymentEvent(stripeEventId: string, stripePaymentId: string) {
    const filter = `jm1pub_stripeeventid eq '${odata(stripeEventId)}' or jm1pub_stripepaymentid eq '${odata(stripePaymentId)}'`
    const row = await dataverseFirst(this.config, EVENTS, { $select: eventSelect, $filter: filter })
    return row ? mapEvent(row) : null
  }

  async appendConfirmedPayment(input: {
    agreement: AgreementLedgerRecord
    event: PaymentEventRecord
    payment: AgreementPayment
    expectedEtag: string
  }) {
    await this.invokeAtomicAction('jm1pub_ApplyPublishingPaymentEvent', {
      AgreementId: input.agreement.snapshot.agreementId,
      ExpectedETag: input.expectedEtag,
      EventJson: JSON.stringify(input.event),
      PaymentJson: JSON.stringify(input.payment),
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
    await this.invokeAtomicAction('jm1pub_ApplyPublishingPaymentRefund', {
      AgreementId: input.agreement.snapshot.agreementId,
      ExpectedETag: input.expectedEtag,
      RefundJson: JSON.stringify(input.refund),
    })
    const record = await this.getAgreement(input.agreement.snapshot.agreementId)
    if (!record) throw new Error('DATAVERSE_LEDGER_READBACK_MISSING')
    return { applied: true, record }
  }

  async findCollectionAttempt(executionKey: string) {
    const row = await dataverseFirst(this.config, ATTEMPTS, {
      $select: 'jm1pub_executionkey,jm1pub_agreementid,jm1pub_obligationid,jm1pub_amountcents,jm1pub_stripeinvoiceid,jm1pub_status,createdon',
      $filter: `jm1pub_executionkey eq '${odata(executionKey)}'`,
    })
    if (!row) return null
    return {
      executionKey: text(row.jm1pub_executionkey),
      agreementId: text(row.jm1pub_agreementid),
      obligationId: text(row.jm1pub_obligationid) || null,
      amountCents: integer(row.jm1pub_amountcents),
      stripeInvoiceId: text(row.jm1pub_stripeinvoiceid),
      status: 'CREATED' as const,
      createdAt: text(row.createdon),
    }
  }

  async recordCollectionAttempt(attempt: CollectionAttempt) {
    await this.invokeAtomicAction('jm1pub_RecordPublishingCollectionAttempt', { AttemptJson: JSON.stringify(attempt) })
  }

  async markQboReconciliation(input: {
    paymentEventId: string
    status: 'PASS' | 'ATTENTION_REQUIRED'
    qboTransactionId?: string | null
  }) {
    await this.invokeAtomicAction('jm1pub_SetPublishingQboReconciliation', {
      PaymentEventId: input.paymentEventId,
      ReconciliationStatus: input.status,
      QboTransactionId: input.qboTransactionId || null,
    })
  }

  private async hydrateAgreement(row: DataverseRow): Promise<AgreementLedgerRecord> {
    const agreementId = text(row.jm1pub_agreementid)
    const [obligationRows, eventRows] = await Promise.all([
      dataverseList(this.config, OBLIGATIONS, {
        $select: 'jm1pub_obligationid,jm1pub_duedate,jm1pub_amountcents,jm1pub_status',
        $filter: `jm1pub_agreementid eq '${odata(agreementId)}'`,
        $orderby: 'jm1pub_duedate asc',
      }),
      dataverseList(this.config, EVENTS, {
        $select: eventSelect,
        $filter: `jm1pub_agreementid eq '${odata(agreementId)}'`,
        $orderby: 'jm1pub_occurredat asc',
      }),
    ])
    const payments: AgreementPayment[] = eventRows
      .filter((event) => text(event.jm1pub_eventkind) === 'PAYMENT')
      .map((event) => ({
        paymentId: text(event.jm1pub_stripepaymentid),
        eventId: text(event.jm1pub_stripeeventid),
        paymentType: text(event.jm1pub_paymenttype) as AgreementPayment['paymentType'],
        amountCents: integer(event.jm1pub_grossamountcents),
        status: text(event.jm1pub_status) === 'CONFIRMED' ? 'SUCCEEDED' : 'FAILED',
        allocations: json(event.jm1pub_allocationsjson, []),
        paidAt: text(event.jm1pub_occurredat),
      }))
    const refunds: AgreementRefund[] = eventRows
      .filter((event) => text(event.jm1pub_eventkind) === 'REFUND')
      .map((event) => ({
        refundId: text(event.jm1pub_refundid),
        eventId: text(event.jm1pub_stripeeventid),
        originalPaymentId: text(event.jm1pub_originalpaymentid),
        amountCents: integer(event.jm1pub_grossamountcents),
        status: text(event.jm1pub_status) === 'CONFIRMED' ? 'SUCCEEDED' : 'FAILED',
        refundedAt: text(event.jm1pub_occurredat),
      }))
    const scheduledObligations: ScheduledObligation[] = obligationRows.map((obligation) => ({
      obligationId: text(obligation.jm1pub_obligationid),
      dueDate: text(obligation.jm1pub_duedate),
      amountCents: integer(obligation.jm1pub_amountcents),
      status: text(obligation.jm1pub_status) as ScheduledObligation['status'],
    }))
    const snapshot: AgreementPaymentSnapshot = {
      agreementId,
      authorId: text(row.jm1pub_authorid),
      titleId: text(row.jm1pub_titleid),
      paymentScheduleId: text(row.jm1pub_paymentscheduleid),
      currency: 'usd',
      contractualBalanceCents: integer(row.jm1pub_totalagreementamountcents),
      normalInstallmentCents: integer(row.jm1pub_scheduledinstallmentamountcents),
      nextScheduledDueDate: text(row.jm1pub_nextduedate) || null,
      scheduledObligations,
      payments,
      refunds,
    }
    return {
      snapshot,
      stripeCustomerId: text(row.jm1pub_stripecustomerid),
      qboCustomerReference: text(row.jm1pub_qbocustomerreference),
      qboReceivableReference: text(row.jm1pub_qboreceivablereference),
      etag: text(row['@odata.etag']),
      status: text(row.jm1pub_paymentstatus) as AgreementLedgerRecord['status'],
    }
  }

  private async invokeAtomicAction(action: string, payload: Record<string, unknown>) {
    const response = await fetch(`${this.config.webApiBaseUrl}/${action}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await getDataverseActionToken(this.config)}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })
    if (!response.ok) {
      if (response.status === 404) throw new Error('DATAVERSE_PAYMENT_CUSTOM_API_NOT_COMMISSIONED')
      if (response.status === 412) throw new Error('CONCURRENT_BALANCE_WRITE_REJECTED')
      throw new Error(`DATAVERSE_PAYMENT_ACTION_FAILED_${response.status}`)
    }
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
      return { invoiceId: requiredText(invoice.id, 'STRIPE_INVOICE_ID_MISSING') }
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
  'jm1pub_agreementid', 'jm1pub_authorid', 'jm1pub_titleid', 'jm1pub_paymentscheduleid',
  'jm1pub_totalagreementamountcents', 'jm1pub_scheduledinstallmentamountcents', 'jm1pub_nextduedate',
  'jm1pub_stripecustomerid', 'jm1pub_qbocustomerreference', 'jm1pub_qboreceivablereference', 'jm1pub_paymentstatus',
].join(',')

const eventSelect = [
  'jm1pub_paymenteventid', 'jm1pub_agreementid', 'jm1pub_eventkind', 'jm1pub_paymenttype',
  'jm1pub_stripeeventid', 'jm1pub_stripepaymentid', 'jm1pub_stripeinvoiceid', 'jm1pub_refundid',
  'jm1pub_originalpaymentid', 'jm1pub_grossamountcents', 'jm1pub_scheduledallocationcents',
  'jm1pub_pastdueallocationcents', 'jm1pub_additionalallocationcents', 'jm1pub_allocationsjson',
  'jm1pub_balancebeforecents', 'jm1pub_balanceaftercents', 'jm1pub_status',
  'jm1pub_qboreconciliationstatus', 'jm1pub_qbotransactionid', 'jm1pub_idempotencykey', 'jm1pub_occurredat',
].join(',')

function mapEvent(row: DataverseRow): PaymentEventRecord {
  return {
    paymentEventId: text(row.jm1pub_paymenteventid),
    agreementId: text(row.jm1pub_agreementid),
    paymentType: text(row.jm1pub_paymenttype) as PaymentEventRecord['paymentType'],
    stripeEventId: text(row.jm1pub_stripeeventid),
    stripePaymentId: text(row.jm1pub_stripepaymentid),
    stripeInvoiceId: text(row.jm1pub_stripeinvoiceid) || null,
    grossAmountCents: integer(row.jm1pub_grossamountcents),
    scheduledAllocationCents: integer(row.jm1pub_scheduledallocationcents),
    pastDueAllocationCents: integer(row.jm1pub_pastdueallocationcents),
    additionalAllocationCents: integer(row.jm1pub_additionalallocationcents),
    allocations: json(row.jm1pub_allocationsjson, []),
    balanceBeforeCents: integer(row.jm1pub_balancebeforecents),
    balanceAfterCents: integer(row.jm1pub_balanceaftercents),
    status: text(row.jm1pub_status) as PaymentEventRecord['status'],
    qboReconciliationStatus: text(row.jm1pub_qboreconciliationstatus) as PaymentEventRecord['qboReconciliationStatus'],
    qboTransactionId: text(row.jm1pub_qbotransactionid) || null,
    idempotencyKey: text(row.jm1pub_idempotencykey),
    occurredAt: text(row.jm1pub_occurredat),
  }
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
