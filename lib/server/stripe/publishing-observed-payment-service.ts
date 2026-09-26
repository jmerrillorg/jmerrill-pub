import { createHash, randomUUID } from 'node:crypto'

import { dataverseCreate, dataverseFirst, dataverseList, getDataverseServerConfig } from '../dataverse-server'
import { calculateAgreementPaymentState, parsePublishingPaymentMetadata } from './publishing-agreement-payment'
import { DataversePublishingPaymentLedger, createStripeAgreementPayoff } from './publishing-payment-adapters'
import { processConfirmedAgreementPayment, productionAdditionalPaymentGateReadback } from './publishing-payment-runtime'
import { retrieveStripePaymentIntent } from './publishing-payment-event'
import { startAdditionalPayment } from './publishing-additional-payment'
import { renderJm1EnterpriseCommunication } from '../jm1-enterprise-communication-renderer'

const EVENTS = 'jmpv2_paymentevidences'
const KIND = 'OBSERVED_ADDITIONAL_REQUEST'

export type ObservedAdditionalRequest = {
  requestId: string
  operationId: string
  authorId: string
  titleId: string
  agreementId: string
  engagementId: string
  obligationId: string
  requestType: 'ADDITIONAL_PAYMENT_REQUEST' | 'PAYMENT_ACCESS_REQUEST' | 'INSTALLMENT_INFORMATION_REQUEST' | 'PAYMENT_LINK_ACCESS_PROBLEM'
  requestedAmountCents: number
  sourceEvent: {
    kind: 'FOUNDER_RATIFIED_OBSERVATION'
    authorityReference: string
    originalText: string
    sourceDate: string
    providerMessageId: null
  }
  settlementObservations: { paymentIntentId: string; paymentType: 'ADDITIONAL_PAYMENT'; authorityReference: string }[]
  createdAt: string
  updatedAt: string
  idempotencyKey: string
  status: 'CAPTURED'
}

function config() {
  const value = getDataverseServerConfig()
  if (!value) throw new Error('DATAVERSE_PAYMENT_LEDGER_CONFIG_MISSING')
  return value
}

function text(value: unknown) { return typeof value === 'string' ? value.trim() : '' }
function guid(value: unknown) {
  const normalized = text(value).toLowerCase()
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(normalized)) throw new Error('PAYMENT_REQUEST_IDENTITY_INVALID')
  return normalized
}
function odata(value: string) { return value.replace(/'/g, "''") }

export function observedPaymentRequestIdentity(input: Pick<ObservedAdditionalRequest, 'authorId' | 'agreementId' | 'sourceEvent'>) {
  return `observed_payment_${createHash('sha256').update(JSON.stringify([
    input.authorId, input.agreementId, input.sourceEvent.authorityReference,
    input.sourceEvent.sourceDate, input.sourceEvent.originalText,
  ])).digest('hex').slice(0, 40)}`
}

export async function readObservedAdditionalRequest(requestId: string): Promise<ObservedAdditionalRequest | null> {
  if (!/^observed_payment_[a-f0-9]{40}$/.test(requestId)) throw new Error('OBSERVED_REQUEST_ID_INVALID')
  const row = await dataverseFirst(config(), EVENTS, {
    $select: 'jmpv2_allocationsjson',
    $filter: `jmpv2_eventkind eq '${KIND}' and jmpv2_idempotencykey eq '${odata(requestId)}'`,
  })
  return row ? JSON.parse(text(row.jmpv2_allocationsjson)) : null
}

export async function listObservedAdditionalRequests() {
  const rows = await dataverseList(config(), EVENTS, {
    $select: 'jmpv2_allocationsjson', $filter: `jmpv2_eventkind eq '${KIND}'`,
    $orderby: 'jmpv2_occurredat asc', $top: '100',
  })
  return rows.map(row => JSON.parse(text(row.jmpv2_allocationsjson)) as ObservedAdditionalRequest)
}

export async function captureObservedAdditionalRequest(input: unknown) {
  const body = input as Partial<ObservedAdditionalRequest> | null
  if (!body || !['ADDITIONAL_PAYMENT_REQUEST', 'PAYMENT_ACCESS_REQUEST', 'INSTALLMENT_INFORMATION_REQUEST', 'PAYMENT_LINK_ACCESS_PROBLEM'].includes(body.requestType || '') || body.sourceEvent?.kind !== 'FOUNDER_RATIFIED_OBSERVATION' ||
      body.sourceEvent.providerMessageId !== null || !text(body.sourceEvent.authorityReference) ||
      !text(body.sourceEvent.originalText) || !/^\d{4}-\d{2}-\d{2}$/.test(body.sourceEvent.sourceDate) ||
      body.sourceEvent.originalText.length > 8000 || body.sourceEvent.authorityReference.length > 200) {
    throw new Error('OBSERVED_REQUEST_SOURCE_AUTHORITY_REQUIRED')
  }
  const amount = body.requestedAmountCents
  if (!Number.isSafeInteger(amount) || Number(amount) < 100) throw new Error('PAYMENT_AMOUNT_INVALID')
  const request: ObservedAdditionalRequest = {
    requestId: '', operationId: randomUUID(), authorId: guid(body.authorId), titleId: guid(body.titleId),
    agreementId: guid(body.agreementId), engagementId: guid(body.engagementId), obligationId: guid(body.agreementId),
    requestType: body.requestType!, requestedAmountCents: amount!, sourceEvent: body.sourceEvent,
    settlementObservations: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), idempotencyKey: '', status: 'CAPTURED',
  }
  if (request.engagementId !== request.agreementId) throw new Error('PAYMENT_REQUEST_ENGAGEMENT_BINDING_INVALID')
  if (!Array.isArray(body.settlementObservations) || body.settlementObservations.length > 10) throw new Error('SETTLEMENT_OBSERVATIONS_INVALID')
  for (const item of body.settlementObservations) {
    if (item.paymentType !== 'ADDITIONAL_PAYMENT' || !/^pi_[A-Za-z0-9]+$/.test(item.paymentIntentId) ||
        !text(item.authorityReference) || item.authorityReference.length > 200) throw new Error('SETTLEMENT_OBSERVATION_AUTHORITY_REQUIRED')
    request.settlementObservations.push({ paymentIntentId: item.paymentIntentId, paymentType: item.paymentType, authorityReference: item.authorityReference })
  }
  request.requestId = observedPaymentRequestIdentity(request)
  request.idempotencyKey = request.requestId
  await resolveObservedRequestAuthority(request)
  const existing = await readObservedAdditionalRequest(request.requestId)
  if (existing) {
    assertObservedRequestReplay(request, existing)
    return { captured: true, idempotent: true, request: existing }
  }
  try {
    await dataverseCreate(config(), EVENTS, {
      jmpv2_paymentevidencekey: request.requestId, jmpv2_idempotencykey: request.requestId,
      jmpv2_agreementkey: request.agreementId, jmpv2_obligationid: request.obligationId,
      jmpv2_eventkind: KIND, jmpv2_paymenttype: request.requestType, jmpv2_eventstatus: 'CAPTURED',
      jmpv2_grossamountcents: request.requestedAmountCents, jmpv2_allocationsjson: JSON.stringify(request),
      jmpv2_occurredat: request.createdAt,
    })
  } catch (error) {
    const winner = await readObservedAdditionalRequest(request.requestId)
    if (!winner) throw error
    assertObservedRequestReplay(request, winner)
    return { captured: true, idempotent: true, request: winner }
  }
  return { captured: true, idempotent: false, request }
}

export function assertObservedRequestReplay(incoming: ObservedAdditionalRequest, existing: ObservedAdditionalRequest) {
  const facts = (request: ObservedAdditionalRequest) => JSON.stringify([
    request.authorId, request.titleId, request.agreementId, request.engagementId, request.obligationId,
    request.requestType, request.requestedAmountCents, request.sourceEvent, request.settlementObservations,
  ])
  if (facts(incoming) !== facts(existing)) throw new Error('OBSERVED_REQUEST_BINDING_CONFLICT')
}

async function resolveObservedRequestAuthority(request: ObservedAdditionalRequest) {
  const ledger = new DataversePublishingPaymentLedger(config())
  const agreement = await ledger.getAgreement(request.agreementId)
  if (!agreement || agreement.snapshot.authorId !== request.authorId || agreement.snapshot.titleId !== request.titleId ||
      !agreement.stripeCustomerId || !['ACTIVE', 'PAID_IN_FULL'].includes(agreement.status)) throw new Error('OBSERVED_REQUEST_AGREEMENT_BINDING_INVALID')
  const title = await dataverseFirst(config(), 'jm1pub_titles', {
    $select: 'jm1pub_titleid,jm1pub_name,_jm1pub_contract_value', $filter: `jm1pub_titleid eq ${request.titleId}`,
  })
  const contractId = guid(title?._jm1pub_contract_value)
  const contract = await dataverseFirst(config(), 'jm1pub_contracts', {
    $select: 'jm1pub_providerstatus,_jm1pub_opportunity_value,_new_author_value', $filter: `jm1pub_contractid eq ${contractId}`,
  })
  if (contract?._new_author_value !== request.authorId || contract?._jm1pub_opportunity_value !== request.engagementId ||
      contract?.jm1pub_providerstatus !== 'ADOBE_SIGNED_COMPLETED') throw new Error('OBSERVED_REQUEST_EXECUTED_TERMS_UNPROVEN')
  const author = await dataverseFirst(config(), 'contacts', {
    $select: 'contactid,fullname,emailaddress1', $filter: `contactid eq ${request.authorId}`,
  })
  if (!text(author?.emailaddress1) || author?.contactid !== request.authorId) throw new Error('OBSERVED_REQUEST_AUTHOR_CONTACT_UNPROVEN')
  return { ledger, agreement, author, title }
}

export async function stripeSettlementRead(path: string) {
  const secret = process.env.STRIPE_CHECKOUT_SECRET_KEY || process.env.STRIPE_SECRET_KEY
  if (!secret) throw new Error('STRIPE_READ_CREDENTIAL_MISSING')
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${secret}` }, cache: 'no-store', signal: AbortSignal.timeout(20000),
  })
  if (!response.ok) throw new Error(`STRIPE_SETTLEMENT_READ_FAILED_${response.status}`)
  return response.json()
}

async function stripeList(path: string) {
  const all = []
  let cursor = ''
  for (let page = 0; page < 100; page++) {
    const result = await stripeSettlementRead(`${path}${cursor ? `&starting_after=${encodeURIComponent(cursor)}` : ''}`)
    if (!Array.isArray(result.data)) throw new Error('STRIPE_SETTLEMENT_LIST_INVALID')
    all.push(...result.data)
    if (!result.has_more) return all
    const next = text(result.data.at(-1)?.id)
    if (!next || next === cursor) throw new Error('STRIPE_SETTLEMENT_CURSOR_INVALID')
    cursor = next
  }
  throw new Error('STRIPE_SETTLEMENT_CENSUS_INCOMPLETE')
}

async function readObservedSettlement(request: ObservedAdditionalRequest, paymentIntentId: string, customerId: string, scheduleId: string) {
  const payment = await retrieveStripePaymentIntent(paymentIntentId)
  if (payment.customerId !== customerId || payment.currency !== 'usd') throw new Error('OBSERVED_SETTLEMENT_CUSTOMER_MISMATCH')
  if (!payment.chargeId) throw new Error('OBSERVED_SETTLEMENT_CHARGE_REQUIRED')
  const charge = await stripeSettlementRead(`/charges/${encodeURIComponent(payment.chargeId)}`)
  if (charge.amount_refunded > 0 || charge.refunded === true || charge.disputed === true) throw new Error('OBSERVED_SETTLEMENT_REFUND_OR_DISPUTE_REVIEW_REQUIRED')
  const invoices = await stripeList(`/invoices?customer=${encodeURIComponent(customerId)}&limit=100`)
  const matches = invoices.filter((invoice: { payment_intent: unknown }) => invoice.payment_intent === paymentIntentId)
  if (matches.length !== 1) throw new Error('OBSERVED_SETTLEMENT_INVOICE_AMBIGUOUS')
  const invoice = matches[0]
  if (invoice.status !== 'paid' || invoice.livemode !== true || invoice.customer !== customerId || invoice.amount_paid !== payment.amountCents) {
    throw new Error('OBSERVED_SETTLEMENT_INVOICE_PARITY_FAILED')
  }
  const subscription = await stripeSettlementRead(`/subscriptions/${encodeURIComponent(text(invoice.subscription))}`)
  if (subscription.customer !== customerId || subscription.schedule !== scheduleId) throw new Error('OBSERVED_SETTLEMENT_SCHEDULE_BINDING_FAILED')
  const paidAt = Number(invoice.status_transitions?.paid_at)
  if (!Number.isSafeInteger(paidAt) || paidAt <= 0) throw new Error('OBSERVED_SETTLEMENT_TIMESTAMP_MISSING')
  const query = new URLSearchParams({ type: 'invoice.paid', 'created[gte]': String(paidAt - 3600), 'created[lte]': String(paidAt + 3600), limit: '100' })
  const events = await stripeList(`/events?${query}`)
  const event = events.find((candidate: { data?: { object?: { id?: string } } }) => candidate.data?.object?.id === invoice.id)
  if (!/^evt_[A-Za-z0-9]+$/.test(text(event?.id))) throw new Error('OBSERVED_SETTLEMENT_PROVIDER_EVENT_REQUIRED')
  return { payment, invoiceId: invoice.id as string, eventId: event.id as string, paidAt: new Date(paidAt * 1000).toISOString(), requestId: request.requestId }
}

export async function reconcileObservedSettlements(requestId: string) {
  const gate = productionAdditionalPaymentGateReadback()
  if (!gate.enabled) throw new Error('ADDITIONAL_PAYMENT_GATE_CLOSED')
  const request = await readObservedAdditionalRequest(requestId)
  if (!request) throw new Error('OBSERVED_REQUEST_NOT_FOUND')
  let authority = await resolveObservedRequestAuthority(request)
  for (const observation of request.settlementObservations) {
    const prior = await authority.ledger.findPaymentEvent('provider-event-unavailable', observation.paymentIntentId)
    if (prior) {
      const live = await retrieveStripePaymentIntent(observation.paymentIntentId)
      if (prior.agreementId !== request.agreementId || prior.paymentType !== observation.paymentType ||
          prior.grossAmountCents !== live.amountCents || live.customerId !== authority.agreement.stripeCustomerId) {
        throw new Error('OBSERVED_SETTLEMENT_CLASSIFICATION_CONFLICT')
      }
      continue
    }
    const settlement = await readObservedSettlement(request, observation.paymentIntentId,
      authority.agreement.stripeCustomerId, authority.agreement.snapshot.paymentScheduleId)
    const existing = await authority.ledger.findPaymentEvent(settlement.eventId, observation.paymentIntentId)
    if (existing && existing.paymentType !== observation.paymentType) throw new Error('OBSERVED_SETTLEMENT_CLASSIFICATION_CONFLICT')
    const result = await processConfirmedAgreementPayment({
      agreementId: request.agreementId, stripeEventId: settlement.eventId, stripePaymentId: observation.paymentIntentId,
      stripeInvoiceId: settlement.invoiceId, amountCents: settlement.payment.amountCents,
      intent: 'ADDITIONAL_PAYMENT', occurredAt: settlement.paidAt,
      submittedBalanceVersion: calculateAgreementPaymentState(authority.agreement.snapshot).balanceVersion,
      ledger: authority.ledger, qbo: null, payoff: createStripeAgreementPayoff(),
    })
    if (!result.ok) throw new Error(result.reason)
    authority = await resolveObservedRequestAuthority(request)
  }
  const state = calculateAgreementPaymentState(authority.agreement.snapshot)
  // Verify every canonical settled payment against Stripe, including pre-existing scheduled payments.
  for (const item of authority.agreement.snapshot.payments.filter(item => item.status === 'SUCCEEDED')) {
    const live = await retrieveStripePaymentIntent(item.paymentId)
    if (live.customerId !== authority.agreement.stripeCustomerId || live.amountCents !== item.amountCents || live.currency !== 'usd') {
      throw new Error('CANONICAL_SETTLEMENT_PROVIDER_PARITY_FAILED')
    }
    if (!live.chargeId) throw new Error('CANONICAL_SETTLEMENT_CHARGE_REQUIRED')
    const charge = await stripeSettlementRead(`/charges/${encodeURIComponent(live.chargeId)}`)
    if (charge.amount_refunded > 0 || charge.refunded === true || charge.disputed === true) throw new Error('SETTLEMENT_REFUND_OR_DISPUTE_REVIEW_REQUIRED')
  }
  const invoices = await stripeList(`/invoices?customer=${encodeURIComponent(authority.agreement.stripeCustomerId)}&limit=100`)
  for (const invoice of invoices.filter(item => item.status === 'paid' && item.subscription)) {
    const subscription = await stripeSettlementRead(`/subscriptions/${encodeURIComponent(invoice.subscription)}`)
    if (subscription.schedule !== authority.agreement.snapshot.paymentScheduleId) continue
    if (!authority.agreement.snapshot.payments.some(item => item.paymentId === invoice.payment_intent && item.status === 'SUCCEEDED')) {
      throw new Error('UNCLASSIFIED_SETTLED_PAYMENT_RECONCILIATION_REQUIRED')
    }
  }
  return { request, authority, state }
}

export async function reconcileAdditionalPaymentTail() {
  const ledger = new DataversePublishingPaymentLedger(config())
  const results = []
  const preparations = await dataverseList(config(), EVENTS, {
    $select: 'jmpv2_allocationsjson', $filter: "jmpv2_eventkind eq 'ADDITIONAL_PAYMENT_PREPARATION'",
  })
  // Recover a provider-created session after a crash before the completion evidence was persisted.
  for (const row of preparations) {
    const preparation = JSON.parse(text(row.jmpv2_allocationsjson))
    try {
      if (await ledger.findAdditionalPaymentRequest(preparation.requestId)) continue
      const agreement = await ledger.getAgreement(guid(preparation.agreementId))
      if (!agreement || agreement.snapshot.authorId !== preparation.authorId || agreement.snapshot.titleId !== preparation.titleId ||
          preparation.obligationId !== null) throw new Error('PAYMENT_PREPARATION_IDENTITY_DENIED')
      const sessions = await stripeList(`/checkout/sessions?customer=${encodeURIComponent(agreement.stripeCustomerId)}&limit=100`)
      const matches = sessions.filter(session => session.client_reference_id === preparation.requestId)
      if (matches.length > 1) throw new Error('PAYMENT_PREPARATION_PROVIDER_AMBIGUOUS')
      if (!matches.length) {
        if (Date.now() - Date.parse(preparation.createdAt) >= 23 * 60 * 60 * 1000) throw new Error('PAYMENT_PREPARATION_PROVIDER_RECOVERY_REQUIRED')
        continue
      }
      const session = matches[0]
      if (session.livemode !== true || session.customer !== agreement.stripeCustomerId || session.amount_total !== preparation.amountCents ||
          session.currency !== 'usd' || session.metadata?.jm1_idempotency_key !== preparation.idempotencyKey ||
          session.metadata?.jm1_author_id !== preparation.authorId || session.metadata?.jm1_title_id !== preparation.titleId ||
          session.metadata?.jm1_agreement_id !== preparation.agreementId || session.metadata?.jm1_scheduled_obligation_id) {
        throw new Error('PAYMENT_PREPARATION_PROVIDER_BINDING_DENIED')
      }
      await ledger.recordAdditionalPaymentRequest({ ...preparation, stripeCheckoutSessionId: session.id,
        expiresAt: Number(session.expires_at) || null })
    } catch (error) {
      results.push({ requestId: preparation.requestId, status: 'RECONCILIATION_PENDING',
        reason: error instanceof Error && /^[A-Z0-9_]+$/.test(error.message) ? error.message : 'PREPARATION_TAIL_RETRY_REQUIRED' })
    }
  }
  const rows = await dataverseList(config(), EVENTS, {
    $select: 'jmpv2_allocationsjson', $filter: "jmpv2_eventkind eq 'ADDITIONAL_PAYMENT_REQUEST'",
  })
  for (const row of rows) {
    const request = JSON.parse(text(row.jmpv2_allocationsjson))
    try {
      const agreement = await ledger.getAgreement(guid(request.agreementId))
      if (!agreement || agreement.snapshot.authorId !== request.authorId || agreement.snapshot.titleId !== request.titleId ||
          request.obligationId !== null) throw new Error('PAYMENT_TAIL_IDENTITY_DENIED')
      const session = await stripeSettlementRead(`/checkout/sessions/${encodeURIComponent(request.stripeCheckoutSessionId)}`)
      if (session.livemode !== true || session.customer !== agreement.stripeCustomerId ||
          session.client_reference_id !== request.requestId || session.amount_total !== request.amountCents || session.currency !== 'usd') {
        throw new Error('PAYMENT_TAIL_SESSION_BINDING_DENIED')
      }
      if (session.payment_status !== 'paid') {
        results.push({ requestId: request.requestId, status: session.status === 'expired' ? 'ACCESS_EXPIRED' : 'AWAITING_PAYMENT' })
        continue
      }
      const paymentId = text(session.payment_intent)
      const payment = await retrieveStripePaymentIntent(paymentId)
      const rawPayment = await stripeSettlementRead(`/payment_intents/${encodeURIComponent(paymentId)}`)
      const metadata = parsePublishingPaymentMetadata(rawPayment.metadata)
      if (payment.customerId !== agreement.stripeCustomerId || payment.amountCents !== request.amountCents ||
          !metadata.ok || metadata.authorId !== request.authorId || metadata.titleId !== request.titleId || metadata.agreementId !== request.agreementId ||
          metadata.paymentScheduleId !== agreement.snapshot.paymentScheduleId || rawPayment.metadata?.jm1_request_id !== request.requestId ||
          rawPayment.metadata?.jm1_engagement_id !== request.engagementId ||
          metadata.paymentType !== 'ADDITIONAL_PAYMENT' || metadata.scheduledObligationId) throw new Error('PAYMENT_TAIL_CORRELATION_DENIED')
      const existing = await ledger.findPaymentEvent('provider-event-unavailable', paymentId)
      if (existing) {
        if (existing.agreementId !== request.agreementId || existing.paymentType !== 'ADDITIONAL_PAYMENT' || existing.grossAmountCents !== payment.amountCents) {
          throw new Error('PAYMENT_TAIL_DUPLICATE_BINDING_DENIED')
        }
        results.push({ requestId: request.requestId, status: 'RECONCILED', idempotent: true })
        continue
      }
      const events = await stripeList(`/events?type=checkout.session.completed&created[gte]=${session.created}&limit=100`)
      const event = events.find(candidate => candidate.data?.object?.id === session.id)
      if (!event || !/^evt_[A-Za-z0-9]+$/.test(text(event.id))) throw new Error('PAYMENT_TAIL_PROVIDER_EVENT_REQUIRED')
      const result = await processConfirmedAgreementPayment({
        agreementId: request.agreementId, stripeEventId: event.id, stripePaymentId: paymentId,
        amountCents: payment.amountCents, intent: 'ADDITIONAL_PAYMENT', occurredAt: new Date(event.created * 1000).toISOString(),
        submittedBalanceVersion: calculateAgreementPaymentState(agreement.snapshot).balanceVersion,
        ledger, qbo: null, payoff: createStripeAgreementPayoff(),
      })
      if (!result.ok) throw new Error(result.reason)
      results.push({ requestId: request.requestId, status: 'RECONCILED', idempotent: false })
    } catch (error) {
      results.push({ requestId: request.requestId, status: 'RECONCILIATION_PENDING',
        reason: error instanceof Error && /^[A-Z0-9_]+$/.test(error.message) ? error.message : 'PROVIDER_TAIL_RETRY_REQUIRED',
        observedAt: new Date().toISOString() })
    }
  }
  return results
}

export async function prepareObservedAdditionalService(requestId: string) {
  const { request, authority, state } = await reconcileObservedSettlements(requestId)
  const access = state.remainingBalanceCents > 0 && request.requestType !== 'INSTALLMENT_INFORMATION_REQUEST'
    ? await startAdditionalPayment({ contactId: request.authorId, engagementId: request.agreementId,
      amountCents: request.requestedAmountCents, operationId: request.operationId,
      sourceEvent: { kind: 'OBSERVED_AUTHOR_REQUEST', requestId: request.requestId } }) : null
  if (access && (!access.eligible || !('started' in access) || !access.started)) throw new Error('OBSERVED_PAYMENT_ACCESS_HELD')
  const paymentUrl = access && 'checkoutUrl' in access ? access.checkoutUrl : null
  if (paymentUrl) {
    const response = await fetch(paymentUrl, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(15000), cache: 'no-store' })
    if (response.status !== 200) throw new Error('OBSERVED_PAYMENT_LINK_ACCESS_UNVERIFIED')
  }
  const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`
  const copy = renderJm1EnterpriseCommunication({
    brand: 'publishing', executionAuthority: { authoritySource: 'JM1 Governed Bootstrap', renderAllowed: true, communicationAllowed: false },
    templateName: 'AUTHOR_PAYMENT_ACCOUNT_SERVICE_V1', templateVersion: '1.0',
    subject: `${text(authority.title?.jm1pub_name)} - Your payment information`,
    recipientName: text(authority.author?.fullname).split(/\s+/)[0], title: 'Your publishing account',
    subtitle: text(authority.title?.jm1pub_name), preheader: 'Your current payment information and secure payment access.',
    reason: request.requestType === 'INSTALLMENT_INFORMATION_REQUEST' ? 'Thank you for asking about your publishing payment information.' : 'Thank you for getting in touch about making a payment toward your publishing package.',
    summaryItems: [`We have received ${dollars(state.netPaymentsAppliedCents)} in payments. Your remaining balance is ${dollars(state.remainingBalanceCents)}.`],
    reviewPrompt: paymentUrl ? `You can make an additional payment of ${dollars(request.requestedAmountCents)} using the secure payment link below. This is a payment toward your existing publishing agreement, not a new charge or replacement installment. Your scheduled installment dates remain unchanged.` : 'No additional payment access is needed for this request.',
    actionInstruction: paymentUrl ? `Secure payment link: ${paymentUrl}` : 'Please reply if you have any questions about your account.',
    replyOnly: true, supportNote: 'Please do not send card or bank details by email. We are happy to help if you have trouble opening the link.',
    presentationStyle: 'CORRESPONDENCE',
  })
  return {
    request, authorName: text(authority.author?.fullname), recipient: text(authority.author?.emailaddress1).toLowerCase(),
    titleName: text(authority.title?.jm1pub_name), totalAppliedCents: state.netPaymentsAppliedCents,
    currentBalanceCents: state.remainingBalanceCents, paymentAmountCents: request.requestedAmountCents,
    paymentUrl, copy,
    balanceVersion: state.balanceVersion, qboSync: 'QUEUED_PENDING_RECONCILIATION',
    scheduledObligations: authority.agreement.snapshot.scheduledObligations,
    settledPayments: authority.agreement.snapshot.payments.filter(item => item.status === 'SUCCEEDED').length,
    pastDueCents: state.pastDueBalanceCents,
  }
}
