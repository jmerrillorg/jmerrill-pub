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
}

type DataverseRow = Record<string, any>

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

  const idempotencyName = buildPaymentIdempotencyName(opportunityId, payment)
  const existingPaymentLog = await findExecutionLog(config, token, idempotencyName, 'PUBLISHING_INITIAL_PAYMENT_CONFIRMED')
  let paymentLogId = existingPaymentLog?.jm1_executionlogid || null
  let paymentUpdated = false
  if (!existingPaymentLog) {
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
    ok: true,
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
  if (!apiBase || !resourceUrl || !tenantId || !clientId || !clientSecret) return null
  return {
    apiBase: apiBase.replace(/\/$/, ''),
    resourceUrl: resourceUrl.replace(/\/$/, ''),
    tenantId,
    clientId,
    clientSecret,
  }
}

async function getDataverseToken(config: DataverseConfig) {
  const response = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: `${config.resourceUrl}/.default`,
      grant_type: 'client_credentials',
    }),
  })
  if (!response.ok) throw new Error(`dataverse_token_failed:${response.status}`)
  const body = await response.json()
  if (!body.access_token) throw new Error('dataverse_token_missing')
  return body.access_token as string
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
  const directOpportunityId = normalizeString((payment as any).opportunityId)
  if (isGuid(directOpportunityId)) {
    const opportunity = await getOpportunity(config, token, directOpportunityId)
    if (!opportunity) return blocked('OPPORTUNITY_NOT_FOUND')
    return { ok: true as const, opportunity }
  }

  const fragments = [
    payment.invoiceId,
    payment.invoiceNumber,
    payment.customerId,
    payment.subscriptionId,
    payment.subscriptionScheduleId,
    payment.paymentIntentId,
  ].map(normalizeString).filter(Boolean)

  if (fragments.length === 0) return blocked('PAYMENT_CORRELATION_EVIDENCE_MISSING')
  const filter = fragments
    .map((fragment) => `contains(jm1_actiondescription,'${encodeODataString(fragment)}')`)
    .join(' or ')
  const result = await dataverseRequest(
    config,
    token,
    `jm1_executionlogs?$select=jm1_executionlogid,jm1_name,jm1_actiontype,jm1_actiondescription,jm1_sourcerecordid,createdon&$filter=${encodeURIComponent(filter)}&$orderby=createdon desc&$top=10`,
  )
  const rows = Array.isArray(result.value) ? result.value : []
  const candidate = rows.find((row: DataverseRow) => isGuid(normalizeString(row.jm1_sourcerecordid)))
  const opportunityId = normalizeString(candidate?.jm1_sourcerecordid)
  if (!opportunityId) return blocked('PAYMENT_OPPORTUNITY_CORRELATION_NOT_FOUND')
  const opportunity = await getOpportunity(config, token, opportunityId)
  if (!opportunity) return blocked('OPPORTUNITY_NOT_FOUND')
  return { ok: true as const, opportunity }
}

async function getOpportunity(config: DataverseConfig, token: string, opportunityId: string) {
  return dataverseRequest(
    config,
    token,
    `opportunities(${opportunityId})?$select=opportunityid,name,jm1pub_projecttitle,jm1pub_intaketrackingid,jm1pub_packagerecommended,jm1_m6authorselectedpackagecode,jm1_m6selectedpaymentamount,jm1_m6selectedpaymenttotal,jm1_m6selectedinstallmentcount,jm1_m6selectedpaymentoption,jm1_m6paymentselectionevidencelog,jm1pub_contractstatus,jm1_m6agreementpreparationstatus,jm1_m6firstpaymentstatus,jm1_m6firstpaymentconfirmedon,_parentcontactid_value,_customerid_value`,
  )
}

async function findSignedContractForOpportunity(config: DataverseConfig, token: string, opportunityId: string) {
  const filter = `_jm1pub_opportunity_value eq ${opportunityId} and (jm1pub_status eq ${CONTRACT_STATUS.ACTIVE} or jm1pub_providerstatus eq 'SIGNNOW_SIGNED')`
  const result = await dataverseRequest(
    config,
    token,
    `jm1pub_contracts?$select=jm1pub_contractid,jm1pub_contractname,jm1pub_status,jm1pub_providerstatus,jm1pub_signeddate,_jm1pub_opportunity_value&$filter=${encodeURIComponent(filter)}&$orderby=modifiedon desc&$top=1`,
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

function buildPaymentIdempotencyName(opportunityId: string, payment: Required<PublishingPaymentSuccess>) {
  const paymentKey = payment.paymentIntentId || payment.invoiceId || payment.chargeId || payment.eventId || payment.paidAt
  return `INITIAL-PAYMENT-CONFIRMED-${opportunityId}-${paymentKey}`.slice(0, 200)
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

function isGuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
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
    || 'Atta Darko'
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
