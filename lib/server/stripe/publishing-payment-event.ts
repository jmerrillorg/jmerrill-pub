// Engine: Stage Transition Engine
// Reusable? Y
// Stage-specific exception? N

import { getDataverseRuntimeAccessToken, getPublisherRuntimeAuthMode } from '../publisher-runtime-auth'
import {
  canonicalInitialPaymentEffectKey,
  extractStripePaymentCorrelation,
  normalizeGuid,
  selectOpportunityCorrelation,
  stripePaymentBindingName,
} from './publishing-payment-correlation'
import type { PublishingPaymentType } from './publishing-agreement-payment'
import {
  createDataversePublishingPaymentLedger,
  createGovernedQboPaymentAdapter,
  createStripeAgreementPayoff,
} from './publishing-payment-adapters'
import {
  processConfirmedAgreementPayment,
  productionAdditionalPaymentGateReadback,
  productionPaymentGateReadback,
  type AgreementLedgerRecord,
} from './publishing-payment-runtime'

const STRIPE_API_BASE = 'https://api.stripe.com'

const EXECUTION_STATUS = {
  SUCCESS: 835500001,
  FAILED: 835500002,
} as const

const BAND_LEVEL = {
  BAND_1: 835500000,
} as const

const FIRST_PAYMENT_STATUS = {
  PAID_CONFIRMED: 835510002,
} as const

const FIRST_PAYMENT_CONFIRMATION_SOURCE = {
  STRIPE_LIVE_APPROVED: 835511002,
} as const

const OPPORTUNITY_CONTRACT_STATUS = {
  SIGNED: 196650003,
} as const

const CONTRACT_STATUS = {
  ACTIVE: 196650002,
} as const

const AUTHOR_PORTAL_STATUS = {
  ACTIVE: 835512003,
} as const

type DataverseConfig = {
  apiBase: string
  resourceUrl: string
  tenantId: string
  clientId: string
  clientSecret: string
  authMode: 'LEGACY_CLIENT_CREDENTIAL' | 'MANAGED_IDENTITY'
}

export type PublishingPaymentSuccess = {
  eventId?: string | null
  eventType?: string | null
  amountCents: number
  currency: string
  customerId?: string | null
  invoiceId?: string | null
  invoiceNumber?: string | null
  paymentIntentId?: string | null
  chargeId?: string | null
  subscriptionId?: string | null
  subscriptionScheduleId?: string | null
  created?: number | null
  paidAt?: string | null
  source?: string | null
  opportunityId?: string | null
  engagementId?: string | null
  titleId?: string | null
  paymentRequestId?: string | null
  actionRequestId?: string | null
  agreementId?: string | null
  paymentType?: PublishingPaymentType | null
  authorId?: string | null
  paymentScheduleId?: string | null
  balanceVersion?: string | null
  scheduledObligationId?: string | null
  contractBalanceBeforeCents?: number | null
  contractBalanceAfterCents?: number | null
  agreementPaymentMetadataStatus?: string | null
  invalidMetadataKeys?: string[]
  manualCorrectionConfirmed?: boolean
  correctionReason?: string | null
}

type DataverseRow = Record<string, any>

function requiredPaymentField(value: string | null | undefined, code: string) {
  const normalized = String(value || '').trim()
  if (!normalized) throw new Error(code)
  return normalized
}

export async function retrieveStripePaymentIntent(paymentIntentId: string): Promise<PublishingPaymentSuccess> {
  const response = await fetch(`${STRIPE_API_BASE}/v1/payment_intents/${encodeURIComponent(paymentIntentId)}?expand[]=latest_charge`, {
    headers: {
      Authorization: `Bearer ${getStripeSecret()}`,
    },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw Object.assign(new Error(body?.error?.code || `stripe_payment_intent_read_failed:${response.status}`), {
      safeCode: body?.error?.code || 'STRIPE_PAYMENT_INTENT_READ_FAILED',
      status: response.status,
    })
  }

  const latestCharge = body.latest_charge && typeof body.latest_charge === 'object' ? body.latest_charge : null
  const amountCents = Number(body.amount_received || body.amount || 0)
  if (body.status !== 'succeeded' || amountCents <= 0) {
    throw Object.assign(new Error('stripe_payment_intent_not_succeeded'), {
      safeCode: 'STRIPE_PAYMENT_INTENT_NOT_SUCCEEDED',
    })
  }

  return {
    eventType: 'payment_intent.succeeded.recovery',
    amountCents,
    currency: String(body.currency || '').toLowerCase(),
    customerId: typeof body.customer === 'string' ? body.customer : null,
    invoiceId: typeof body.invoice === 'string' ? body.invoice : null,
    paymentIntentId: body.id || paymentIntentId,
    chargeId: latestCharge?.id || null,
    subscriptionId: null,
    created: typeof latestCharge?.created === 'number' ? latestCharge.created : body.created || null,
    paidAt: isoFromStripeSeconds(typeof latestCharge?.created === 'number' ? latestCharge.created : body.created),
    source: 'STRIPE_LIVE_READBACK',
    ...extractStripePaymentCorrelation(body.metadata),
  }
}

export async function processPublishingPaymentSuccess(input: PublishingPaymentSuccess) {
  if (!input || !Number.isFinite(input.amountCents) || input.amountCents <= 0) {
    return blocked('PAYMENT_AMOUNT_INVALID')
  }
  if (String(input.currency || '').toLowerCase() !== 'usd') return blocked('PAYMENT_CURRENCY_INVALID')

  const config = getDataverseConfig()
  if (!config) return blocked('DATAVERSE_CONFIG_MISSING')
  const token = await getDataverseToken(config)
  const payment = normalizePayment(input)
  if (payment.invalidMetadataKeys.length > 0) {
    return blocked('PAYMENT_CORRELATION_METADATA_INVALID', {
      invalidMetadataKeys: payment.invalidMetadataKeys,
    })
  }
  if (payment.agreementPaymentMetadataStatus && payment.agreementPaymentMetadataStatus !== 'PAYMENT_TYPE_MISSING') {
    if (payment.agreementPaymentMetadataStatus !== 'VALID') {
      return blocked('AGREEMENT_PAYMENT_METADATA_INVALID', {
        metadataStatus: payment.agreementPaymentMetadataStatus,
        financialEffect: 0,
      })
    }
  }
  if (payment.paymentType) {
    const additionalPayment = payment.paymentType === 'ADDITIONAL_PAYMENT'
    const gate = additionalPayment
      ? productionAdditionalPaymentGateReadback()
      : productionPaymentGateReadback()
    if (!gate.enabled) {
      return blocked('AGREEMENT_PAYMENT_RUNTIME_NOT_COMMISSIONED', {
        paymentType: payment.paymentType,
        accountingAuthority: 'QBO',
        missing: gate.missing,
        financialEffect: 0,
      })
    }
    try {
      const ledger = createDataversePublishingPaymentLedger()
      const agreement = await ledger.getAgreement(requiredPaymentField(payment.agreementId, 'AGREEMENT_ID_REQUIRED'))
      const binding = validateAgreementPaymentBinding(payment, agreement)
      if (!binding.ok) return blocked(binding.reason, { financialEffect: 0 })
      return await processConfirmedAgreementPayment({
        agreementId: requiredPaymentField(payment.agreementId, 'AGREEMENT_ID_REQUIRED'),
        stripeEventId: requiredPaymentField(payment.eventId, 'STRIPE_EVENT_ID_REQUIRED'),
        stripePaymentId: requiredPaymentField(payment.paymentIntentId || payment.chargeId, 'STRIPE_PAYMENT_ID_REQUIRED'),
        stripeInvoiceId: payment.invoiceId,
        amountCents: payment.amountCents,
        intent: payment.paymentType === 'ADDITIONAL_PAYMENT' ? 'ADDITIONAL_PAYMENT' : 'CURRENT_PLUS_ADDITIONAL',
        occurredAt: payment.paidAt || isoFromStripeSeconds(payment.created) || new Date().toISOString(),
        submittedBalanceVersion: requiredPaymentField(payment.balanceVersion, 'BALANCE_VERSION_REQUIRED'),
        ledger,
        qbo: additionalPayment ? null : createGovernedQboPaymentAdapter(),
        payoff: createStripeAgreementPayoff(),
      })
    } catch (error) {
      return blocked(error instanceof Error ? error.message : 'AGREEMENT_PAYMENT_RUNTIME_FAILED', {
        paymentType: payment.paymentType,
        accountingAuthority: 'QBO',
      })
    }
  }
  if (payment.source === 'GOVERNED_MANUAL_CORRECTION') {
    if (!payment.manualCorrectionConfirmed || !payment.correctionReason || !normalizeGuid(payment.opportunityId)) {
      return blocked('PAYMENT_MANUAL_CORRECTION_AUTHORITY_INVALID')
    }
  }
  const opportunityLookup = await findOpportunityForPayment(config, token, payment)
  if (!opportunityLookup.ok) return opportunityLookup

  const opportunity = opportunityLookup.opportunity
  const opportunityId = normalizeString(opportunity.opportunityid)
  const expectedAmount = centsFromDataverseMoney(opportunity.jm1_m6selectedpaymentamount)
  if (expectedAmount > 0 && expectedAmount !== payment.amountCents) {
    return blocked('PAYMENT_AMOUNT_DOES_NOT_MATCH_SELECTED_INSTALLMENT', {
      opportunityId,
      expectedAmountCents: expectedAmount,
      receivedAmountCents: payment.amountCents,
    })
  }

  await persistPaymentBindings(config, token, opportunityId, payment)

  const idempotencyName = canonicalInitialPaymentEffectKey(opportunityId)
  const existingPaymentLog = await findExecutionLogForSource(
    config,
    token,
    opportunityId,
    'PUBLISHING_INITIAL_PAYMENT_CONFIRMED',
  )
  let paymentLogId = existingPaymentLog?.jm1_executionlogid || null
  let paymentUpdated = false
  if (!existingPaymentLog) {
    if (Number(opportunity.jm1_m6firstpaymentstatus) !== FIRST_PAYMENT_STATUS.PAID_CONFIRMED) {
      await dataverseRequest(config, token, `opportunities(${opportunityId})`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: {
          jm1_m6firstpaymentstatus: FIRST_PAYMENT_STATUS.PAID_CONFIRMED,
          jm1_m6firstpaymentconfirmedon: payment.paidAt || new Date().toISOString(),
          jm1_m6firstpaymentconfirmationsource: FIRST_PAYMENT_CONFIRMATION_SOURCE.STRIPE_LIVE_APPROVED,
        },
      })
      paymentUpdated = true
    }
    const created = await postExecutionLog(config, token, {
      name: idempotencyName,
      actionType: 'PUBLISHING_INITIAL_PAYMENT_CONFIRMED',
      description: paymentDescription(opportunity, payment),
      sourceEntity: 'opportunity',
      sourceRecordId: opportunityId,
      completedAt: payment.paidAt || undefined,
    })
    paymentLogId = created.jm1_executionlogid || null
  }

  const signedContract = await findSignedContractForOpportunity(config, token, opportunityId)
  let joinedFamily = false
  let joinedFamilyLogId: string | null = null
  let joinedFamilyState = 'BLOCKED_AGREEMENT_NOT_EXECUTED'
  if (signedContract) {
    await dataverseRequest(config, token, `opportunities(${opportunityId})`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: {
        jm1pub_contractstatus: OPPORTUNITY_CONTRACT_STATUS.SIGNED,
        jm1_m6agreementpreparationstatus: 'AGREEMENT_SIGNED_ACTIVE',
        jm1_m6authorportalstatus: AUTHOR_PORTAL_STATUS.ACTIVE,
      },
    })
    const joinName = `JOINED-THE-FAMILY-${opportunityId}`
    const existingJoinLog = await findExecutionLog(config, token, joinName, 'JOINED_THE_FAMILY')
    if (!existingJoinLog) {
      const created = await postExecutionLog(config, token, {
        name: joinName,
        actionType: 'JOINED_THE_FAMILY',
        description: [
          `Joined the Family confirmed for ${authorName(opportunity)} / ${titleName(opportunity)}.`,
          'Publishing agreement is signed/active and the required initial Stripe payment is confirmed.',
          `Package ${normalizeString(opportunity.jm1_m6authorselectedpackagecode) || normalizeString(opportunity.jm1pub_packagerecommended) || 'not provided'}.`,
          'This event may drive governed relationship, onboarding, workspace, referral, and internal-notification consequences.',
          'No Business Central posting, production progression, public deployment, or author-facing communication occurred in this payment consumer.',
        ].join(' '),
        sourceEntity: 'opportunity',
        sourceRecordId: opportunityId,
        completedAt: payment.paidAt || undefined,
      })
      joinedFamilyLogId = created.jm1_executionlogid || null
    } else {
      joinedFamilyLogId = existingJoinLog.jm1_executionlogid || null
    }
    joinedFamily = true
    joinedFamilyState = 'JOINED_THE_FAMILY'
  } else {
    const blockName = `JOINED-THE-FAMILY-BLOCKED-${opportunityId}`
    const existingBlockLog = await findExecutionLog(config, token, blockName, 'JOINED_THE_FAMILY_BLOCKED')
    if (!existingBlockLog) {
      await postExecutionLog(config, token, {
        name: blockName,
        actionType: 'JOINED_THE_FAMILY_BLOCKED',
        description: [
          `Joined the Family was not set for ${authorName(opportunity)} / ${titleName(opportunity)}.`,
          'The required initial Stripe payment is confirmed, but no signed/active agreement record was found for the Opportunity.',
          'Agreement execution remains the controlling gate. No workspace unlock, production progression, or referral earning occurred.',
        ].join(' '),
        sourceEntity: 'opportunity',
        sourceRecordId: opportunityId,
        completedAt: payment.paidAt || undefined,
      })
    }
  }

  const notification = await sendPaymentInternalNotificationOnce(config, token, {
    opportunity,
    opportunityId,
    payment,
    joinedFamilyState,
    paymentUpdated,
  })

  return {
    ok: true as const,
    code: 'PUBLISHING_PAYMENT_SUCCESS_PROCESSED',
    opportunityId,
    author: authorName(opportunity),
    title: titleName(opportunity),
    amountPaidCents: payment.amountCents,
    amountPaidFormatted: formatUsd(payment.amountCents),
    paidAt: payment.paidAt,
    paymentIntentId: payment.paymentIntentId || null,
    chargeId: payment.chargeId || null,
    invoiceId: payment.invoiceId || null,
    customerId: payment.customerId || null,
    subscriptionId: payment.subscriptionId || null,
    subscriptionScheduleId: payment.subscriptionScheduleId || null,
    paymentUpdated,
    paymentLogId,
    joinedFamily,
    joinedFamilyState,
    joinedFamilyLogId,
    correlationAuthority: opportunityLookup.authority,
    notification,
    liveActions: {
      updatesFirstPaymentStatus: paymentUpdated,
      setsJoinedTheFamily: joinedFamily,
      sendsInternalNotification: notification.accepted === true,
      sendsAuthorCommunication: false,
      changesPaymentArrangement: false,
      changesPaymentPolicy: false,
      postsBusinessCentral: false,
      startsProduction: false,
    },
  }
}

export function validateAgreementPaymentBinding(payment: PublishingPaymentSuccess, agreement: AgreementLedgerRecord | null) {
  if (!agreement) return { ok: false as const, reason: 'AGREEMENT_NOT_FOUND' }
  const matches = (left: unknown, right: unknown) => {
    const value = normalizeString(left)
    const expected = normalizeString(right)
    const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return Boolean(value) && (guid.test(value) && guid.test(expected)
      ? value.toLowerCase() === expected.toLowerCase()
      : value === expected)
  }
  if (!matches(payment.agreementId, agreement.snapshot.agreementId) ||
      !matches(payment.authorId, agreement.snapshot.authorId) ||
      !matches(payment.titleId, agreement.snapshot.titleId) ||
      !matches(payment.paymentScheduleId, agreement.snapshot.paymentScheduleId) ||
      !matches(payment.customerId, agreement.stripeCustomerId)) {
    return { ok: false as const, reason: 'AGREEMENT_PAYMENT_IDENTITY_BINDING_MISMATCH' }
  }
  if (payment.paymentType === 'ADDITIONAL_PAYMENT' && payment.scheduledObligationId) {
    return { ok: false as const, reason: 'ADDITIONAL_PAYMENT_SCHEDULE_BINDING_PROHIBITED' }
  }
  return { ok: true as const }
}

export async function recordPublishingPaymentException(input: PublishingPaymentSuccess, reason: string) {
  const config = getDataverseConfig()
  if (!config) return { created: false, code: 'DATAVERSE_CONFIG_MISSING' }
  const token = await getDataverseToken(config)
  const eventKey = normalizeString(input.eventId)
    || normalizeString(input.paymentIntentId)
    || normalizeString(input.invoiceId)
    || normalizeString(input.chargeId)
  if (!eventKey) return { created: false, code: 'PAYMENT_EXCEPTION_ID_MISSING' }
  const name = `PUBLISHING-PAYMENT-BLOCKED-${eventKey}`.slice(0, 200)
  const existing = await findExecutionLog(config, token, name, 'PUBLISHING_PAYMENT_CORRELATION_BLOCKED')
  if (existing) return { created: false, code: 'PAYMENT_EXCEPTION_ALREADY_RECORDED', id: existing.jm1_executionlogid }
  const created = await postExecutionLog(config, token, {
    name,
    actionType: 'PUBLISHING_PAYMENT_CORRELATION_BLOCKED',
    description: [
      `Verified Stripe payment event was denied before business-state mutation. Reason ${reason}.`,
      `Event type ${normalizeString(input.eventType) || 'not provided'}; source ${normalizeString(input.source) || 'not provided'}.`,
      'No title was selected, no payment state was changed, and no downstream effect was authorized.',
    ].join(' '),
    sourceEntity: 'stripe_event',
    sourceRecordId: eventKey,
    status: 'failed',
  })
  return { created: true, code: 'PAYMENT_EXCEPTION_RECORDED', id: created.jm1_executionlogid || null }
}

function normalizePayment(input: PublishingPaymentSuccess): Required<PublishingPaymentSuccess> {
  const created = typeof input.created === 'number' ? input.created : null
  return {
    eventId: input.eventId || null,
    eventType: input.eventType || null,
    amountCents: Math.round(Number(input.amountCents)),
    currency: String(input.currency || '').toLowerCase(),
    customerId: input.customerId || null,
    invoiceId: input.invoiceId || null,
    invoiceNumber: input.invoiceNumber || null,
    paymentIntentId: input.paymentIntentId || null,
    chargeId: input.chargeId || null,
    subscriptionId: input.subscriptionId || null,
    subscriptionScheduleId: input.subscriptionScheduleId || null,
    created,
    paidAt: input.paidAt || isoFromStripeSeconds(created) || new Date().toISOString(),
    source: input.source || 'STRIPE_WEBHOOK',
    opportunityId: normalizeString(input.opportunityId) || null,
    engagementId: normalizeString(input.engagementId) || null,
    titleId: normalizeString(input.titleId) || null,
    paymentRequestId: normalizeString(input.paymentRequestId) || null,
    actionRequestId: normalizeString(input.actionRequestId) || null,
    agreementId: normalizeString(input.agreementId) || null,
    paymentType: input.paymentType || null,
    authorId: normalizeString(input.authorId) || null,
    paymentScheduleId: normalizeString(input.paymentScheduleId) || null,
    balanceVersion: normalizeString(input.balanceVersion) || null,
    scheduledObligationId: normalizeString(input.scheduledObligationId) || null,
    contractBalanceBeforeCents: typeof input.contractBalanceBeforeCents === 'number' && Number.isSafeInteger(input.contractBalanceBeforeCents)
      ? input.contractBalanceBeforeCents
      : null,
    contractBalanceAfterCents: typeof input.contractBalanceAfterCents === 'number' && Number.isSafeInteger(input.contractBalanceAfterCents)
      ? input.contractBalanceAfterCents
      : null,
    agreementPaymentMetadataStatus: normalizeString(input.agreementPaymentMetadataStatus) || null,
    invalidMetadataKeys: Array.isArray(input.invalidMetadataKeys) ? input.invalidMetadataKeys : [],
    manualCorrectionConfirmed: input.manualCorrectionConfirmed === true,
    correctionReason: normalizeString(input.correctionReason) || null,
  }
}

function getDataverseConfig(): DataverseConfig | null {
  const apiBase =
    process.env.DATAVERSE_WEB_API_BASE_URL ||
    (process.env.DATAVERSE_ENVIRONMENT_URL
      ? `${process.env.DATAVERSE_ENVIRONMENT_URL.replace(/\/$/, '')}/api/data/v9.2`
      : '')
  const resourceUrl = process.env.DATAVERSE_RESOURCE_URL || process.env.DATAVERSE_ENVIRONMENT_URL || ''
  const tenantId = process.env.DATAVERSE_TENANT_ID || ''
  const clientId = process.env.DATAVERSE_CLIENT_ID || ''
  const clientSecret = process.env.DATAVERSE_CLIENT_SECRET || ''
  const authMode = getPublisherRuntimeAuthMode()
  if (!apiBase || !resourceUrl) return null
  if (authMode === 'LEGACY_CLIENT_CREDENTIAL' && (!tenantId || !clientId || !clientSecret)) return null
  return {
    apiBase: apiBase.replace(/\/$/, ''),
    resourceUrl: resourceUrl.replace(/\/$/, ''),
    tenantId,
    clientId,
    clientSecret,
    authMode,
  }
}

async function getDataverseToken(config: DataverseConfig) {
  return getDataverseRuntimeAccessToken(config.resourceUrl)
}

async function dataverseRequest(config: DataverseConfig, token: string, path: string, options: {
  method?: string
  headers?: Record<string, string>
  body?: Record<string, unknown>
} = {}) {
  const response = await fetch(`${config.apiBase}/${path.replace(/^\//, '')}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(removeNullish(options.body)) : undefined,
  })
  if (response.status === 204) return {}
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw Object.assign(new Error(body?.error?.message || `dataverse_request_failed:${response.status}`), {
      safeCode: body?.error?.code || 'DATAVERSE_REQUEST_FAILED',
      status: response.status,
    })
  }
  return body
}

async function findOpportunityForPayment(config: DataverseConfig, token: string, payment: Required<PublishingPaymentSuccess>) {
  const fragments = [
    payment.invoiceId,
    payment.invoiceNumber,
    payment.subscriptionId,
    payment.subscriptionScheduleId,
    payment.paymentIntentId,
    payment.chargeId,
    payment.engagementId,
    payment.titleId,
    payment.paymentRequestId,
    payment.actionRequestId,
    payment.agreementId,
  ].map(normalizeString).filter(Boolean)

  let rows: DataverseRow[] = []
  if (fragments.length > 0) {
    const bindingNames = fragments.map(stripePaymentBindingName)
    const filter = fragments
      .flatMap((fragment, index) => [
        `jm1_name eq '${encodeODataString(bindingNames[index])}'`,
        `contains(jm1_actiondescription,'${encodeODataString(fragment)}')`,
      ])
      .join(' or ')
    const result = await dataverseRequest(
      config,
      token,
      `jm1_executionlogs?$select=jm1_executionlogid,jm1_name,jm1_actiontype,jm1_actiondescription,jm1_sourcerecordid,createdon&$filter=${encodeURIComponent(filter)}&$orderby=createdon desc&$top=100`,
    )
    rows = Array.isArray(result.value) ? result.value : []
  }

  const selection = selectOpportunityCorrelation({
    directOpportunityId: payment.opportunityId,
    candidates: rows,
  })
  if (!selection.ok) {
    return blocked(selection.reason, { candidateCount: selection.candidateIds.length })
  }
  const opportunityId = selection.opportunityId
  const opportunity = await getOpportunity(config, token, opportunityId)
  if (!opportunity) return blocked('OPPORTUNITY_NOT_FOUND')
  return { ok: true as const, opportunity, authority: selection.authority }
}

async function persistPaymentBindings(
  config: DataverseConfig,
  token: string,
  opportunityId: string,
  payment: Required<PublishingPaymentSuccess>,
) {
  const identifiers = [
    ['invoice', payment.invoiceId],
    ['invoice_number', payment.invoiceNumber],
    ['payment_intent', payment.paymentIntentId],
    ['charge', payment.chargeId],
    ['subscription', payment.subscriptionId],
    ['subscription_schedule', payment.subscriptionScheduleId],
    ['engagement', payment.engagementId],
    ['title', payment.titleId],
    ['payment_request', payment.paymentRequestId],
    ['action_request', payment.actionRequestId],
    ['agreement', payment.agreementId],
  ] as const

  for (const [kind, rawValue] of identifiers) {
    const value = normalizeString(rawValue)
    if (!value) continue
    const name = stripePaymentBindingName(value)
    const existing = await findExecutionLog(config, token, name, 'PUBLISHING_PAYMENT_BUSINESS_BINDING')
    if (existing) continue
    await postExecutionLog(config, token, {
      name,
      actionType: 'PUBLISHING_PAYMENT_BUSINESS_BINDING',
      description: `Durable one-way ${kind} binding recorded for the governed Publishing opportunity. Source ${payment.source}. The provider identifier is represented only by its SHA-256-derived binding key.`,
      sourceEntity: 'opportunity',
      sourceRecordId: opportunityId,
      completedAt: payment.paidAt || undefined,
    })
  }
}

async function getOpportunity(config: DataverseConfig, token: string, opportunityId: string) {
  return dataverseRequest(
    config,
    token,
    `opportunities(${opportunityId})?$select=opportunityid,name,jm1pub_projecttitle,jm1pub_intaketrackingid,jm1pub_packagerecommended,jm1_m6authorselectedpackagecode,jm1_m6selectedpaymentamount,jm1_m6selectedpaymenttotal,jm1_m6selectedinstallmentcount,jm1_m6selectedpaymentoption,jm1_m6paymentselectionevidencelog,jm1pub_contractstatus,jm1_m6agreementpreparationstatus,jm1_m6authorportalstatus,jm1_m6onboardingstatus,jm1_m6firstpaymentstatus,jm1_m6firstpaymentconfirmedon,_parentcontactid_value,_customerid_value`,
  )
}

async function findSignedContractForOpportunity(config: DataverseConfig, token: string, opportunityId: string) {
  const signedProviderStatuses = [
    'SIGNNOW_SIGNED',
    'ADOBE_SIGNED',
    'ADOBE_SIGNED_COMPLETED',
    'ADOBE_COMPLETED',
    'SIGNED',
    'COMPLETED',
  ]
  const providerStatusFilter = signedProviderStatuses
    .map((status) => `jm1pub_providerstatus eq '${status}'`)
    .join(' or ')
  const filter = `_jm1pub_opportunity_value eq ${opportunityId} and (jm1pub_status eq ${CONTRACT_STATUS.ACTIVE} or ${providerStatusFilter})`
  const result = await dataverseRequest(
    config,
    token,
    `jm1pub_contracts?$select=jm1pub_contractid,jm1pub_contractname,jm1pub_status,jm1pub_providerstatus,jm1pub_signeddate,_jm1pub_opportunity_value&$filter=${encodeURIComponent(filter)}&$orderby=modifiedon desc&$top=1`,
  )
  if (Array.isArray(result.value) && result.value.length > 0) return result.value[0]

  const executedAgreementEvent = await findAgreementExecutedEventForOpportunity(config, token, opportunityId)
  if (!executedAgreementEvent) return null

  return {
    jm1pub_contractid: executedAgreementEvent.jm1_executionlogid,
    jm1pub_contractname: executedAgreementEvent.jm1_name,
    jm1pub_status: CONTRACT_STATUS.ACTIVE,
    jm1pub_providerstatus: 'AGREEMENT_FULLY_EXECUTED_EVENT',
    jm1pub_signeddate: executedAgreementEvent.jm1_completedon || executedAgreementEvent.createdon,
    _jm1pub_opportunity_value: opportunityId,
  }
}

async function findAgreementExecutedEventForOpportunity(config: DataverseConfig, token: string, opportunityId: string) {
  const filter = `jm1_sourcerecordid eq '${encodeODataString(opportunityId)}' and jm1_actiontype eq 'AGREEMENT_FULLY_EXECUTED'`
  const result = await dataverseRequest(
    config,
    token,
    `jm1_executionlogs?$select=jm1_executionlogid,jm1_name,jm1_actiontype,jm1_completedon,createdon,jm1_sourcerecordid&$filter=${encodeURIComponent(filter)}&$orderby=createdon desc&$top=1`,
  )
  return Array.isArray(result.value) && result.value.length > 0 ? result.value[0] : null
}

async function findExecutionLog(config: DataverseConfig, token: string, name: string, actionType: string) {
  const filter = `jm1_name eq '${encodeODataString(name)}' and jm1_actiontype eq '${encodeODataString(actionType)}'`
  const result = await dataverseRequest(
    config,
    token,
    `jm1_executionlogs?$select=jm1_executionlogid,jm1_name,jm1_actiontype,createdon&$filter=${encodeURIComponent(filter)}&$top=1`,
  )
  return Array.isArray(result.value) && result.value.length > 0 ? result.value[0] : null
}

async function findExecutionLogForSource(
  config: DataverseConfig,
  token: string,
  sourceRecordId: string,
  actionType: string,
) {
  const filter = `jm1_sourcerecordid eq '${encodeODataString(sourceRecordId)}' and jm1_actiontype eq '${encodeODataString(actionType)}'`
  const result = await dataverseRequest(
    config,
    token,
    `jm1_executionlogs?$select=jm1_executionlogid,jm1_name,jm1_actiontype,createdon&$filter=${encodeURIComponent(filter)}&$orderby=createdon desc&$top=1`,
  )
  return Array.isArray(result.value) && result.value.length > 0 ? result.value[0] : null
}

async function postExecutionLog(config: DataverseConfig, token: string, input: {
  name: string
  actionType: string
  description: string
  sourceEntity: string
  sourceRecordId: string
  completedAt?: string
  status?: 'success' | 'failed'
}) {
  const completedAt = input.completedAt || new Date().toISOString()
  return dataverseRequest(config, token, 'jm1_executionlogs', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: {
      jm1_name: input.name.slice(0, 200),
      jm1_actiondescription: safeDetail(input.description),
      jm1_actiontype: input.actionType,
      jm1_agentname: 'jmerrill.pub',
      jm1_agentmodel: 'publishing-payment-event-consumer',
      jm1_bandlevel: BAND_LEVEL.BAND_1,
      jm1_executionstatus: input.status === 'failed' ? EXECUTION_STATUS.FAILED : EXECUTION_STATUS.SUCCESS,
      jm1_startedon: completedAt,
      jm1_completedon: completedAt,
      jm1_sourceentity: input.sourceEntity,
      jm1_sourcerecordid: input.sourceRecordId,
    },
  })
}

async function sendPaymentInternalNotification(input: {
  opportunity: DataverseRow
  opportunityId: string
  payment: Required<PublishingPaymentSuccess>
  joinedFamilyState: string
  paymentUpdated: boolean
}) {
  const relayUrl = normalizeString(process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL || process.env.JM1_INTERNAL_NOTIFICATION_RELAY_URL)
  const relayKey = normalizeString(process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY || process.env.JM1_INTERNAL_NOTIFICATION_RELAY_KEY)
  if (!relayUrl || !relayKey) {
    return { accepted: false, code: 'PAYMENT_NOTIFICATION_RELAY_CONFIG_MISSING' }
  }
  const body = {
    notificationType: 'PUBLISHING_PAYMENT_RECEIVED',
    recipient: 'publishing@jmerrill.one',
    authorName: authorName(input.opportunity),
    projectTitle: titleName(input.opportunity),
    opportunityId: input.opportunityId,
    intakeReferenceCode: normalizeString(input.opportunity.jm1pub_intaketrackingid),
    packageCode: normalizeString(input.opportunity.jm1_m6authorselectedpackagecode) || normalizeString(input.opportunity.jm1pub_packagerecommended),
    paymentOption: normalizeString(input.opportunity.jm1_m6selectedpaymentoption),
    installmentCount: Number(input.opportunity.jm1_m6selectedinstallmentcount || 0),
    amountPaid: formatUsd(input.payment.amountCents),
    paymentTimestamp: input.payment.paidAt,
    paymentIntentId: input.payment.paymentIntentId || '',
    chargeId: input.payment.chargeId || '',
    invoiceId: input.payment.invoiceId || '',
    invoiceNumber: input.payment.invoiceNumber || '',
    customerId: input.payment.customerId || '',
    subscriptionId: input.payment.subscriptionId || '',
    subscriptionScheduleId: input.payment.subscriptionScheduleId || '',
    joinedFamilyState: input.joinedFamilyState,
    actionRequired: input.joinedFamilyState === 'JOINED_THE_FAMILY'
      ? 'Review Joined the Family/onboarding readiness.'
      : 'Confirm agreement execution before Joined the Family is set.',
    noAuthorCommunication: true,
  }
  const response = await fetch(`${relayUrl.replace(/\/$/, '')}/api/send-publishing-payment-internal-notification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-jm1-relay-key': relayKey,
    },
    body: JSON.stringify(body),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    return { accepted: false, code: result?.code || result?.error || `PAYMENT_NOTIFICATION_RELAY_FAILED_${response.status}` }
  }
  return {
    accepted: result.accepted === true,
    code: result.deliveryStatus || 'PAYMENT_NOTIFICATION_SENT',
    providerMessageId: result.providerMessageId || null,
    recipient: result.recipient || 'publishing@jmerrill.one',
  }
}

async function sendPaymentInternalNotificationOnce(config: DataverseConfig, token: string, input: {
  opportunity: DataverseRow
  opportunityId: string
  payment: Required<PublishingPaymentSuccess>
  joinedFamilyState: string
  paymentUpdated: boolean
}) {
  const sentName = `PUBLISHING_PAYMENT_NOTIFICATION_SENT-${input.opportunityId}`
  const existingSent = await findExecutionLog(config, token, sentName, 'PUBLISHING_PAYMENT_NOTIFICATION_SENT')
  if (existingSent) {
    return {
      accepted: false,
      skipped: true,
      code: 'PAYMENT_NOTIFICATION_ALREADY_SENT',
      recipient: 'publishing@jmerrill.one',
    }
  }

  const notification = await sendPaymentInternalNotification(input)
  await logNotificationResult(config, token, {
    opportunityId: input.opportunityId,
    opportunity: input.opportunity,
    payment: input.payment,
    notification,
    joinedFamilyState: input.joinedFamilyState,
  })
  return notification
}

async function logNotificationResult(config: DataverseConfig, token: string, input: {
  opportunityId: string
  opportunity: DataverseRow
  payment: Required<PublishingPaymentSuccess>
  notification: { accepted?: boolean; code?: string; providerMessageId?: string | null }
  joinedFamilyState: string
}) {
  const eventType = input.notification.accepted ? 'PUBLISHING_PAYMENT_NOTIFICATION_SENT' : 'PUBLISHING_PAYMENT_NOTIFICATION_FAILED'
  const name = `${eventType}-${input.opportunityId}`
  const existing = await findExecutionLog(config, token, name, eventType)
  if (existing) return
  await postExecutionLog(config, token, {
    name,
    actionType: eventType,
    description: [
      `Internal payment notification ${input.notification.accepted ? 'sent' : 'failed'} for ${authorName(input.opportunity)} / ${titleName(input.opportunity)}.`,
      `Amount ${formatUsd(input.payment.amountCents)}. Joined-family state ${input.joinedFamilyState}.`,
      `Notification code ${input.notification.code || 'unknown'}.`,
      'No author-facing communication was sent.',
    ].join(' '),
    sourceEntity: 'opportunity',
    sourceRecordId: input.opportunityId,
    status: input.notification.accepted ? 'success' : 'failed',
  })
}

function paymentDescription(opportunity: DataverseRow, payment: Required<PublishingPaymentSuccess>) {
  return [
    `Initial Stripe payment confirmed for ${authorName(opportunity)} / ${titleName(opportunity)}.`,
    `Amount ${formatUsd(payment.amountCents)} ${payment.currency.toUpperCase()}; paid at ${payment.paidAt}.`,
    `PaymentIntent ${payment.paymentIntentId || 'not provided'}; charge ${payment.chargeId || 'not provided'}; invoice ${payment.invoiceId || payment.invoiceNumber || 'not provided'}.`,
    `Customer ${payment.customerId || 'not provided'}; subscription ${payment.subscriptionId || 'not provided'}; schedule ${payment.subscriptionScheduleId || 'not provided'}.`,
    `Package ${normalizeString(opportunity.jm1_m6authorselectedpackagecode) || normalizeString(opportunity.jm1pub_packagerecommended) || 'not provided'}; selected option ${normalizeString(opportunity.jm1_m6selectedpaymentoption) || 'not provided'}.`,
    'Payment confirmation does not alter the payment plan, payment-policy version, Business Central, production, or author-facing communications.',
  ].join(' ')
}

function getStripeSecret() {
  const secret = process.env.STRIPE_CHECKOUT_SECRET_KEY || process.env.STRIPE_SECRET_KEY || process.env.JM1_STRIPE_SECRET_KEY || ''
  if (!secret) throw Object.assign(new Error('stripe_checkout_secret_missing'), { safeCode: 'STRIPE_CHECKOUT_SECRET_MISSING' })
  return secret
}

function encodeODataString(value: string) {
  return normalizeString(value).replace(/'/g, "''")
}

function blocked(reason: string, extra: Record<string, unknown> = {}) {
  return { ok: false as const, code: 'PUBLISHING_PAYMENT_EVENT_BLOCKED', reason, ...extra }
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function centsFromDataverseMoney(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) : 0
}

function formatUsd(cents: number) {
  return `$${(Math.round(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function isoFromStripeSeconds(value: unknown) {
  const seconds = Number(value)
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : null
}

function authorName(opportunity: DataverseRow) {
  return normalizeString(opportunity['_parentcontactid_value@OData.Community.Display.V1.FormattedValue'])
    || normalizeString(opportunity['_customerid_value@OData.Community.Display.V1.FormattedValue'])
    || opportunityNameAuthorFallback(opportunity)
    || 'Author'
}

function opportunityNameAuthorFallback(opportunity: DataverseRow) {
  const name = normalizeString(opportunity.name)
  if (!name) return null
  const parts = name.split('—').map((part) => part.trim()).filter(Boolean)
  return parts.length >= 3 ? parts[parts.length - 1] : null
}

function titleName(opportunity: DataverseRow) {
  return normalizeString(opportunity.jm1pub_projecttitle) || normalizeString(opportunity.name) || 'Untitled'
}

function removeNullish(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== null && value !== undefined && value !== ''))
}

function safeDetail(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email-redacted]')
    .replace(/https:\/\/[^\s"']+/g, '[url-redacted]')
    .replace(/\b(acct|ch|cs|cus|evt|in|plink|price|prod|pi|py|sub|sub_sched)_[A-Za-z0-9_]+\b/g, '[stripe-id]')
    .slice(0, 1000)
}
