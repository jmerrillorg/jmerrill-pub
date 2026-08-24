const STRIPE_API_BASE = 'https://api.stripe.com'

export const PUBLISHING_BILLING_CONTINUATION_VERSION = 'PUBLISHING_FIRST_PAYMENT_BILLING_v1.0'

export const INDOMITABLE_BILLING_AUTHORITY = {
  opportunityId: '455daa4a-629f-f111-b8dc-6045bdd69678',
  intakeReferenceCode: 'JMP-INT-202608-0AOS7L',
  authorName: 'Quanisha Dockery',
  authorEmail: 'quanishadockery7777@gmail.com',
  title: 'Indomitable',
  packageCode: 'JMP-PKG-PRO',
  packageName: 'Professional Publishing Package',
  paymentOptionCode: 'TWENTY_FOUR_PAYMENTS',
  paymentPolicyVersion: 'JMP_FINANCING_EARLY_PAYOFF_v1.1',
  principalCents: 450000,
  totalBeforeTaxCents: 501750,
  installmentCount: 24,
  standardInstallmentCents: 20906,
  finalInstallmentCents: 20912,
} as const

const EXECUTION_STATUS = {
  SUCCESS: 835500001,
  FAILED: 835500002,
} as const

const BAND_LEVEL = {
  BAND_1: 835500000,
} as const

type DataverseConfig = {
  apiBase: string
  resourceUrl: string
  tenantId: string
  clientId: string
  clientSecret: string
}

type DataverseRow = Record<string, any>

export type BillingContinuationRequest = {
  opportunityId: string
  confirmExecutedAgreement?: boolean
  confirmCreateFirstPaymentRequest?: boolean
  confirmSendAuthorEmail?: boolean
  agreementCompletedOn?: string
  agreementEvidence?: string
  operator?: string
}

export type StripeBillingClient = {
  createCustomer(input: { email: string; name: string; metadata: Record<string, string> }, idempotencyKey: string): Promise<{ id: string }>
  createInvoiceItem(input: { customerId: string; amountCents: number; description: string; metadata: Record<string, string> }, idempotencyKey: string): Promise<{ id: string }>
  createInvoice(input: { customerId: string; description: string; metadata: Record<string, string> }, idempotencyKey: string): Promise<{ id: string; hostedInvoiceUrl?: string | null; status?: string | null }>
  finalizeInvoice(invoiceId: string, idempotencyKey: string): Promise<{ id: string; hostedInvoiceUrl?: string | null; status?: string | null }>
}

export function buildIndomitableInstallmentSchedule() {
  const installments = Array.from({ length: INDOMITABLE_BILLING_AUTHORITY.installmentCount }, (_, index) => ({
    installmentNumber: index + 1,
    amountCents: index === INDOMITABLE_BILLING_AUTHORITY.installmentCount - 1
      ? INDOMITABLE_BILLING_AUTHORITY.finalInstallmentCents
      : INDOMITABLE_BILLING_AUTHORITY.standardInstallmentCents,
  }))
  const total = installments.reduce((sum, item) => sum + item.amountCents, 0)
  return {
    installments,
    firstPaymentCents: installments[0]?.amountCents || 0,
    finalPaymentCents: installments[installments.length - 1]?.amountCents || 0,
    totalBeforeTaxCents: total,
    ok: total === INDOMITABLE_BILLING_AUTHORITY.totalBeforeTaxCents,
  }
}

export function buildFirstPaymentEmail(input: { hostedInvoiceUrl: string }) {
  const a = INDOMITABLE_BILLING_AUTHORITY
  const firstPayment = formatUsd(a.standardInstallmentCents)
  const total = formatUsd(a.totalBeforeTaxCents)
  const body = [
    `Good day ${firstName(a.authorName)},`,
    '',
    `Your signed J Merrill Publishing agreement package for ${a.title} is complete.`,
    '',
    `Your selected plan is the ${a.packageName} on the 24-payment option. The first payment is ${firstPayment}. The total before any applicable tax is ${total}.`,
    '',
    'Please use the secure payment link below to make your first payment.',
    '',
    input.hostedInvoiceUrl,
    '',
    'Production begins after J Merrill Publishing receives the first payment. Your release date is not locked until the full package payment obligation is complete.',
    '',
    'If you have questions, simply reply to this message.',
    '',
    'With care,',
    'J Merrill Publishing',
  ].join('\n')

  const htmlBody = `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:Arial,Helvetica,sans-serif;color:#111827;"><div style="max-width:680px;margin:0 auto;background:#ffffff;"><div style="background:#111827;color:#ffffff;padding:24px 28px;"><div style="font-size:18px;font-weight:700;">J Merrill Publishing</div><div style="font-size:13px;margin-top:4px;">A Division of J Merrill One</div></div><div style="padding:28px;"><p>Good day ${escapeHtml(firstName(a.authorName))},</p><p>Your signed J Merrill Publishing agreement package for <strong>${escapeHtml(a.title)}</strong> is complete.</p><p>Your selected plan is the <strong>${escapeHtml(a.packageName)}</strong> on the <strong>24-payment option</strong>.</p><table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin:18px 0;"><tr><td style="border:1px solid #dbe3ef;padding:10px;font-weight:700;">First payment</td><td style="border:1px solid #dbe3ef;padding:10px;">${firstPayment}</td></tr><tr><td style="border:1px solid #dbe3ef;padding:10px;font-weight:700;">Total before any applicable tax</td><td style="border:1px solid #dbe3ef;padding:10px;">${total}</td></tr></table><p>Please use the secure payment link below to make your first payment.</p><p style="margin:28px 0;"><a href="${escapeHtml(input.hostedInvoiceUrl)}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:6px;">Make First Payment</a></p><p>Production begins after J Merrill Publishing receives the first payment. Your release date is not locked until the full package payment obligation is complete.</p><p>If you have questions, simply reply to this message.</p><p>With care,<br>J Merrill Publishing</p></div></div></body></html>`
  return {
    subject: 'Indomitable — First Payment Link',
    body,
    htmlBody,
    from: 'publishing@email.jmerrill.one',
    replyTo: 'publishing@jmerrill.one',
    cc: 'publishing@jmerrill.one',
  }
}

export function buildStripeMetadata() {
  const a = INDOMITABLE_BILLING_AUTHORITY
  return {
    jm1_division: 'publishing',
    jm1_runtime: PUBLISHING_BILLING_CONTINUATION_VERSION,
    jm1_author_email: a.authorEmail,
    jm1_author_name: a.authorName,
    jm1_title: a.title,
    jm1_opportunity_id: a.opportunityId,
    jm1_intake_reference: a.intakeReferenceCode,
    jm1_package_code: a.packageCode,
    jm1_payment_option: a.paymentOptionCode,
    jm1_payment_policy: a.paymentPolicyVersion,
  }
}

export function buildIdempotencyKey(action: string) {
  return `jm1-publishing:${INDOMITABLE_BILLING_AUTHORITY.opportunityId}:${action}:v1`
}

export async function runIndomitableBillingContinuation(request: BillingContinuationRequest, deps: {
  stripe?: StripeBillingClient
  now?: () => string
  sendAuthorEmail?: (payload: Record<string, unknown>) => Promise<{ accepted: boolean; providerMessageId?: string | null; code?: string | null }>
} = {}) {
  if (request.opportunityId !== INDOMITABLE_BILLING_AUTHORITY.opportunityId) return blocked('OPPORTUNITY_NOT_AUTHORIZED_FOR_THIS_RUN')
  if (request.confirmExecutedAgreement !== true) return blocked('EXECUTED_AGREEMENT_CONFIRMATION_REQUIRED')
  if (request.confirmCreateFirstPaymentRequest !== true) return blocked('FIRST_PAYMENT_REQUEST_CONFIRMATION_REQUIRED')
  if (request.confirmSendAuthorEmail !== true) return blocked('AUTHOR_EMAIL_CONFIRMATION_REQUIRED')

  const schedule = buildIndomitableInstallmentSchedule()
  if (!schedule.ok) return blocked('INSTALLMENT_SCHEDULE_TOTAL_MISMATCH')

  const config = getDataverseConfig()
  if (!config) return blocked('DATAVERSE_CONFIG_MISSING')
  const token = await getDataverseToken(config)
  const now = deps.now?.() || new Date().toISOString()

  const opportunity = await getOpportunity(config, token, INDOMITABLE_BILLING_AUTHORITY.opportunityId)
  if (!opportunity) return blocked('OPPORTUNITY_NOT_FOUND')

  const duplicateEmail = await findExecutionLog(config, token, `FIRST-PAYMENT-REQUESTED-${INDOMITABLE_BILLING_AUTHORITY.opportunityId}`, 'FIRST_PAYMENT_REQUESTED')
  if (duplicateEmail) {
    return {
      ok: true,
      code: 'FIRST_PAYMENT_REQUEST_ALREADY_EXISTS',
      opportunityId: INDOMITABLE_BILLING_AUTHORITY.opportunityId,
      firstPaymentReceived: false,
      authorEmailSent: false,
      idempotentReplay: true,
      waitingOn: 'AUTHOR / FIRST_PAYMENT',
      negativeProof: baseNegativeProof(),
    }
  }

  await createExecutionLogIfMissing(config, token, {
    name: `AGREEMENT-FULLY-EXECUTED-${INDOMITABLE_BILLING_AUTHORITY.opportunityId}`,
    actionType: 'AGREEMENT_FULLY_EXECUTED',
    description: [
      'Fully executed Adobe agreement package confirmed for Quanisha Dockery / Indomitable.',
      `Opportunity ${INDOMITABLE_BILLING_AUTHORITY.opportunityId}.`,
      `Package ${INDOMITABLE_BILLING_AUTHORITY.packageCode}.`,
      request.agreementEvidence || 'Founder-authorized executed agreement evidence supplied.',
      'No agreement regeneration, resend, or re-sign occurred.',
    ].join(' '),
    sourceRecordId: INDOMITABLE_BILLING_AUTHORITY.opportunityId,
    completedAt: request.agreementCompletedOn || now,
  })

  const stripe = deps.stripe || createStripeBillingClient()
  const metadata = buildStripeMetadata()
  const customer = await stripe.createCustomer({
    email: INDOMITABLE_BILLING_AUTHORITY.authorEmail,
    name: INDOMITABLE_BILLING_AUTHORITY.authorName,
    metadata,
  }, buildIdempotencyKey('customer'))
  await createExecutionLogIfMissing(config, token, {
    name: `STRIPE-CUSTOMER-READY-${INDOMITABLE_BILLING_AUTHORITY.opportunityId}`,
    actionType: 'STRIPE_CUSTOMER_READY',
    description: `Stripe customer ready for Quanisha Dockery / Indomitable. Customer ${customer.id}. Opportunity ${INDOMITABLE_BILLING_AUTHORITY.opportunityId}.`,
    sourceRecordId: INDOMITABLE_BILLING_AUTHORITY.opportunityId,
    completedAt: now,
  })

  const invoiceItem = await stripe.createInvoiceItem({
    customerId: customer.id,
    amountCents: schedule.firstPaymentCents,
    description: 'Indomitable Professional Publishing Package - Payment 1 of 24',
    metadata: { ...metadata, jm1_payment_number: '1', jm1_payment_count: '24' },
  }, buildIdempotencyKey('invoice-item-1'))
  const invoice = await stripe.createInvoice({
    customerId: customer.id,
    description: 'Indomitable Professional Publishing Package - First Payment',
    metadata: { ...metadata, jm1_payment_number: '1', jm1_payment_count: '24', jm1_invoice_item_id: invoiceItem.id },
  }, buildIdempotencyKey('invoice-1'))
  const finalized = await stripe.finalizeInvoice(invoice.id, buildIdempotencyKey('invoice-1-finalize'))
  const hostedInvoiceUrl = finalized.hostedInvoiceUrl || invoice.hostedInvoiceUrl || ''
  if (!hostedInvoiceUrl) return blocked('FIRST_PAYMENT_URL_NOT_RETURNED')

  await createExecutionLogIfMissing(config, token, {
    name: `BILLING-PLAN-CREATED-${INDOMITABLE_BILLING_AUTHORITY.opportunityId}`,
    actionType: 'BILLING_PLAN_CREATED',
    description: `24-payment billing blueprint created for Quanisha Dockery / Indomitable. Payment 1 ${formatUsd(schedule.firstPaymentCents)}. Payments 1-23 ${formatUsd(INDOMITABLE_BILLING_AUTHORITY.standardInstallmentCents)}; payment 24 ${formatUsd(INDOMITABLE_BILLING_AUTHORITY.finalInstallmentCents)}; total before tax ${formatUsd(schedule.totalBeforeTaxCents)}. First-payment Stripe invoice ${invoice.id}.`,
    sourceRecordId: INDOMITABLE_BILLING_AUTHORITY.opportunityId,
    completedAt: now,
  })

  const email = buildFirstPaymentEmail({ hostedInvoiceUrl })
  const sendResult = await (deps.sendAuthorEmail || sendFirstPaymentAuthorEmail)(email)
  if (!sendResult.accepted) return blocked('AUTHOR_EMAIL_SEND_FAILED', { detail: sendResult.code || null })

  await dataversePatchOpportunity(config, token, {
    jm1_m6agreementpreparationstatus: 'AGREEMENT_SIGNED_ACTIVE',
    jm1_m6paymentselectionevidencelog: [
      'WAITING_ON_AUTHOR / FIRST_PAYMENT.',
      'Agreement fully executed. 24-payment plan locked. First-payment Stripe invoice created and author payment link sent by ACS.',
      `Payment 1: ${formatUsd(schedule.firstPaymentCents)}. Payment 24: ${formatUsd(schedule.finalPaymentCents)}. Total before tax: ${formatUsd(schedule.totalBeforeTaxCents)}.`,
    ].join(' '),
  })

  await createExecutionLogIfMissing(config, token, {
    name: `FIRST-PAYMENT-REQUESTED-${INDOMITABLE_BILLING_AUTHORITY.opportunityId}`,
    actionType: 'FIRST_PAYMENT_REQUESTED',
    description: `First payment requested for Quanisha Dockery / Indomitable. ACS author email sent from publishing@email.jmerrill.one with Reply-To/CC publishing@jmerrill.one. Invoice ${invoice.id}. No payment was marked received and production was not started.`,
    sourceRecordId: INDOMITABLE_BILLING_AUTHORITY.opportunityId,
    completedAt: now,
  })

  return {
    ok: true,
    code: 'INDOMITABLE_FIRST_PAYMENT_REQUESTED',
    opportunityId: INDOMITABLE_BILLING_AUTHORITY.opportunityId,
    stripeCustomerId: customer.id,
    billingObjectType: 'stripe_invoice',
    billingObjectId: invoice.id,
    invoiceItemId: invoiceItem.id,
    firstPaymentUrlCreated: true,
    firstPaymentUrl: hostedInvoiceUrl,
    authorEmailSent: true,
    emailCanonCompliant: true,
    payment1Amount: formatUsd(schedule.firstPaymentCents),
    payment24Amount: formatUsd(schedule.finalPaymentCents),
    totalBeforeTax: formatUsd(schedule.totalBeforeTaxCents),
    firstPaymentReceived: false,
    productionStarted: false,
    waitingOn: 'AUTHOR / FIRST_PAYMENT',
    negativeProof: baseNegativeProof(),
  }
}

function createStripeBillingClient(): StripeBillingClient {
  const secret = getStripeSecret()
  return {
    async createCustomer(input, idempotencyKey) {
      const body = new URLSearchParams()
      body.set('email', input.email)
      body.set('name', input.name)
      for (const [key, value] of Object.entries(input.metadata)) body.set(`metadata[${key}]`, value)
      const result = await stripeRequest('/v1/customers', { method: 'POST', body, idempotencyKey, secret })
      return { id: result.id }
    },
    async createInvoiceItem(input, idempotencyKey) {
      const body = new URLSearchParams()
      body.set('customer', input.customerId)
      body.set('amount', String(input.amountCents))
      body.set('currency', 'usd')
      body.set('description', input.description)
      for (const [key, value] of Object.entries(input.metadata)) body.set(`metadata[${key}]`, value)
      const result = await stripeRequest('/v1/invoiceitems', { method: 'POST', body, idempotencyKey, secret })
      return { id: result.id }
    },
    async createInvoice(input, idempotencyKey) {
      const body = new URLSearchParams()
      body.set('customer', input.customerId)
      body.set('collection_method', 'send_invoice')
      body.set('days_until_due', '1')
      body.set('auto_advance', 'false')
      body.set('description', input.description)
      for (const [key, value] of Object.entries(input.metadata)) body.set(`metadata[${key}]`, value)
      const result = await stripeRequest('/v1/invoices', { method: 'POST', body, idempotencyKey, secret })
      return { id: result.id, hostedInvoiceUrl: result.hosted_invoice_url || null, status: result.status || null }
    },
    async finalizeInvoice(invoiceId, idempotencyKey) {
      const body = new URLSearchParams()
      body.set('auto_advance', 'false')
      const result = await stripeRequest(`/v1/invoices/${encodeURIComponent(invoiceId)}/finalize`, { method: 'POST', body, idempotencyKey, secret })
      return { id: result.id, hostedInvoiceUrl: result.hosted_invoice_url || null, status: result.status || null }
    },
  }
}

async function sendFirstPaymentAuthorEmail(email: ReturnType<typeof buildFirstPaymentEmail>) {
  const relayUrl = clean(process.env.JM1_AUTHOR_RESPONSE_SEND_RELAY_URL || process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL || process.env.JM1_INTERNAL_NOTIFICATION_RELAY_URL)
  const relayKey = clean(process.env.JM1_AUTHOR_RESPONSE_SEND_RELAY_KEY || process.env.JM1_RELAY_API_KEY || process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY || process.env.JM1_INTERNAL_NOTIFICATION_RELAY_KEY)
  if (!relayUrl || !relayKey) return { accepted: false, code: 'AUTHOR_EMAIL_RELAY_CONFIG_MISSING' }
  const response = await fetch(`${relayUrl.replace(/\/$/, '')}/api/send-approved-author-response`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-jm1-relay-key': relayKey,
    },
    body: JSON.stringify({
      messageType: 'APPROVED_AUTHOR_RESPONSE',
      intakeReferenceCode: INDOMITABLE_BILLING_AUTHORITY.intakeReferenceCode,
      diagnosticId: INDOMITABLE_BILLING_AUTHORITY.opportunityId,
      authorEmail: INDOMITABLE_BILLING_AUTHORITY.authorEmail,
      to: INDOMITABLE_BILLING_AUTHORITY.authorEmail,
      authorName: INDOMITABLE_BILLING_AUTHORITY.authorName,
      projectTitle: INDOMITABLE_BILLING_AUTHORITY.title,
      subject: email.subject,
      body: email.body,
      htmlBody: email.htmlBody,
      templateName: 'PUBLISHING_FIRST_PAYMENT_REQUEST_V1',
      templateVersion: 'v1.0',
      templateMetadata: {
        qualityGate: 'EXECUTED_AGREEMENT_FIRST_PAYMENT',
        brandSystem: 'J Merrill Publishing',
        enterpriseStandard: 'JM1-COM-001',
        renderer: 'publishing-first-payment-billing',
        rendererVersion: PUBLISHING_BILLING_CONTINUATION_VERSION,
        renderMode: 'CANONICAL_HTML',
      },
      approvedBy: 'Jackie Smith, Jr.',
      approvedOn: new Date().toISOString(),
      internalVisibilityMailbox: 'publishing@jmerrill.one',
      cc: ['publishing@jmerrill.one'],
      futureSendRequiresInternalCopy: true,
      futureSendRequiresDataverseLog: true,
    }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok || body.accepted !== true) {
    return { accepted: false, code: body?.code || body?.reason || `AUTHOR_EMAIL_RELAY_FAILED_${response.status}` }
  }
  return { accepted: true, providerMessageId: body.providerMessageId || null, code: body.deliveryStatus || 'AUTHOR_RESPONSE_SENT' }
}

async function stripeRequest(path: string, input: { method: string; body: URLSearchParams; idempotencyKey: string; secret: string }) {
  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: input.method,
    headers: {
      Authorization: `Bearer ${input.secret}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': input.idempotencyKey,
    },
    body: input.body,
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw Object.assign(new Error(body?.error?.code || `stripe_request_failed:${response.status}`), {
      safeCode: body?.error?.code || 'STRIPE_REQUEST_FAILED',
      status: response.status,
    })
  }
  return body
}

async function getOpportunity(config: DataverseConfig, token: string, opportunityId: string) {
  const result = await dataverseRequest(config, token, `opportunities(${opportunityId})?$select=opportunityid,name,jm1pub_projecttitle,jm1pub_intaketrackingid,jm1_m6authorselectedpackagecode,jm1_m6selectedpaymentamount,jm1_m6selectedpaymenttotal,jm1_m6selectedinstallmentcount,jm1_m6selectedpaymentoption,jm1_m6agreementpreparationstatus,jm1_m6firstpaymentstatus,_parentcontactid_value,_customerid_value`)
  return result?.opportunityid ? result : null
}

async function createExecutionLogIfMissing(config: DataverseConfig, token: string, input: {
  name: string
  actionType: string
  description: string
  sourceRecordId: string
  completedAt: string
}) {
  const existing = await findExecutionLog(config, token, input.name, input.actionType)
  if (existing) return { created: false, id: existing.jm1_executionlogid || null }
  return postExecutionLog(config, token, input)
}

async function findExecutionLog(config: DataverseConfig, token: string, name: string, actionType: string) {
  const filter = `jm1_name eq '${encodeODataString(name)}' and jm1_actiontype eq '${encodeODataString(actionType)}'`
  const result = await dataverseRequest(config, token, `jm1_executionlogs?$select=jm1_executionlogid,jm1_name,jm1_actiontype,createdon&$filter=${encodeURIComponent(filter)}&$top=1`)
  return Array.isArray(result.value) && result.value.length > 0 ? result.value[0] : null
}

async function postExecutionLog(config: DataverseConfig, token: string, input: {
  name: string
  actionType: string
  description: string
  sourceRecordId: string
  completedAt: string
}) {
  return dataverseRequest(config, token, 'jm1_executionlogs', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: {
      jm1_name: input.name.slice(0, 200),
      jm1_actiondescription: safeDetail(input.description),
      jm1_actiontype: input.actionType,
      jm1_agentname: 'jmerrill.pub',
      jm1_agentmodel: 'publishing-first-payment-billing',
      jm1_bandlevel: BAND_LEVEL.BAND_1,
      jm1_executionstatus: EXECUTION_STATUS.SUCCESS,
      jm1_startedon: input.completedAt,
      jm1_completedon: input.completedAt,
      jm1_sourceentity: 'opportunity',
      jm1_sourcerecordid: input.sourceRecordId,
    },
  })
}

async function dataversePatchOpportunity(config: DataverseConfig, token: string, body: Record<string, unknown>) {
  return dataverseRequest(config, token, `opportunities(${INDOMITABLE_BILLING_AUTHORITY.opportunityId})`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body,
  })
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

function getStripeSecret() {
  const secret = process.env.STRIPE_CHECKOUT_SECRET_KEY || process.env.STRIPE_SECRET_KEY || ''
  if (!/^sk_(live|test|restricted)_/.test(secret)) throw Object.assign(new Error('stripe_secret_missing'), { safeCode: 'STRIPE_SECRET_MISSING' })
  return secret
}

function blocked(reason: string, extra: Record<string, unknown> = {}) {
  return { ok: false, code: 'INDOMITABLE_BILLING_CONTINUATION_BLOCKED', reason, ...extra }
}

function baseNegativeProof() {
  return {
    agreementRegenerated: 0,
    agreementResentForSignature: 0,
    paymentOptionResent: 0,
    autoCharge: 0,
    paymentMarkedReceivedWithoutStripeConfirmation: 0,
    productionStartedBeforeFirstPayment: 0,
    duplicateFirstPaymentRequest: 0,
    businessCentralPosting: 0,
  }
}

function formatUsd(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

function firstName(name: string) {
  return clean(name).split(/\s+/)[0] || name
}

function escapeHtml(value: string) {
  return clean(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function encodeODataString(value: string) {
  return value.replace(/'/g, "''")
}

function removeNullish(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== null && value !== undefined && value !== ''))
}

function safeDetail(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email-redacted]')
    .replace(/https:\/\/[^\s"']+/g, '[url-redacted]')
    .replace(/(acct|cs|evt|plink|price|prod|pi|in|ii|cus)_[A-Za-z0-9_]+/g, '[stripe-id]')
    .slice(0, 1000)
}
