const STRIPE_API_BASE = 'https://api.stripe.com'

export const COMMISSIONING_REFERENCE = 'JMP-INT-202607-0W5PTQ'
export const COMMISSIONING_TITLE = 'The Intentional Leader'
export const COMMISSIONING_PACKAGE_CODE = 'JMP-PKG-PREMIER'
export const COMMISSIONING_PACKAGE_NAME = 'Premier Publishing Package'
export const COMMISSIONING_STANDARD_AMOUNT_CENTS = 750000
export const COMMISSIONING_AMOUNT_CENTS = 100

type StripeResponse = {
  id?: string
  url?: string
  livemode?: boolean
  expires_at?: string
  object?: string
  configuration?: Record<string, any>
  payment_status?: string
}

const PROHIBITED_ENROLLMENT_CAPABILITY_KEYS = [
  'capabilities[card_payments][requested]',
  'capabilities[transfers][requested]',
] as const

const MONEY_MOVEMENT_STRIPE_PATHS = [
  '/v1/charges',
  '/v1/payment_intents',
  '/v1/payouts',
  '/v1/refunds',
  '/v1/transfers',
] as const

export function isStripeConnectGateOpen() {
  return String(process.env.JM1_STRIPE_CONNECT_ENABLED || '').toLowerCase() === 'true'
}

export function isStripeCommissioningPaymentGateOpen() {
  return String(process.env.JM1_STRIPE_COMMISSIONING_PAYMENT_ENABLED || '').toLowerCase() === 'true'
}

export function getStripeMode() {
  return String(process.env.JM1_STRIPE_MODE || 'live').toLowerCase() === 'test' ? 'test' : 'live'
}

export function assertCommissioningReference(reference: string) {
  if (reference !== COMMISSIONING_REFERENCE) {
    throw new Error('commissioning_reference_not_authorized')
  }
}

export function buildRecipientAccountParams() {
  const params = new URLSearchParams({
    type: 'standard',
    country: 'US',
    email: process.env.JM1_STRIPE_COMMISSIONING_AUTHOR_EMAIL || 'publishing@jmerrill.one',
    business_type: 'individual',
    'business_profile[name]': COMMISSIONING_TITLE,
    'metadata[jm1_division]': 'publishing',
    'metadata[jm1_reference]': COMMISSIONING_REFERENCE,
    'metadata[jm1_title]': COMMISSIONING_TITLE,
    'metadata[jm1_source]': 'Author Payout Enrollment',
    'metadata[jm1_payment_authorized]': 'false',
  })

  assertEnrollmentAccountParams(params)
  return params
}

export function assertEnrollmentAccountParams(params: URLSearchParams) {
  const prohibited = PROHIBITED_ENROLLMENT_CAPABILITY_KEYS.filter((key) => params.has(key))
  if (prohibited.length > 0) {
    throw new Error(`stripe_enrollment_prohibited_capability:${prohibited.join(',')}`)
  }
}

export async function resolveRecipientAccountId(existingStripeAccountId?: string) {
  const existing = existingStripeAccountId?.trim()
  if (existing) return { accountId: existing, reused: true }

  const account = await createRecipientAccount()
  if (!account.id) throw new Error('stripe_account_missing_id')
  return { accountId: account.id, reused: false }
}

export async function createRecipientAccount() {
  return stripeForm('/v1/accounts', buildRecipientAccountParams(), {
    idempotencyKey: `jm1-author-payout-enrollment-account-${COMMISSIONING_REFERENCE}-v1`,
    keyType: 'connect',
  })
}

export async function createRecipientAccountLink(accountId: string) {
  return stripeForm('/v1/account_links', new URLSearchParams({
    account: accountId,
    type: 'account_onboarding',
    refresh_url: 'https://jmerrill.pub/author/financial-setup',
    return_url: 'https://jmerrill.pub/author/portal?stripe=returned',
    'collection_options[fields]': 'eventually_due',
  }), {
    idempotencyKey: `jm1-connect-account-link-${COMMISSIONING_REFERENCE}-${Date.now()}`,
    keyType: 'connect',
  })
}

export async function createCommissioningCheckoutSession() {
  assertCommissioningPaymentGateOpen()

  return stripeForm('/v1/checkout/sessions', new URLSearchParams({
    mode: 'payment',
    client_reference_id: COMMISSIONING_REFERENCE,
    success_url: 'https://jmerrill.pub/author/portal?payment=success',
    cancel_url: 'https://jmerrill.pub/author/portal?payment=cancelled',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(COMMISSIONING_AMOUNT_CENTS),
    'line_items[0][price_data][product_data][name]': `${COMMISSIONING_PACKAGE_NAME} - commissioning payment`,
    'line_items[0][price_data][product_data][metadata][jm1_standard_amount_cents]': String(COMMISSIONING_STANDARD_AMOUNT_CENTS),
    'payment_intent_data[metadata][jm1_reference]': COMMISSIONING_REFERENCE,
    'payment_intent_data[metadata][jm1_title]': COMMISSIONING_TITLE,
    'payment_intent_data[metadata][jm1_package_code]': COMMISSIONING_PACKAGE_CODE,
    'payment_intent_data[metadata][jm1_commissioning_override]': 'true',
    'metadata[jm1_reference]': COMMISSIONING_REFERENCE,
    'metadata[jm1_title]': COMMISSIONING_TITLE,
    'metadata[jm1_package_code]': COMMISSIONING_PACKAGE_CODE,
    'metadata[jm1_standard_amount_cents]': String(COMMISSIONING_STANDARD_AMOUNT_CENTS),
    'metadata[jm1_commissioning_amount_cents]': String(COMMISSIONING_AMOUNT_CENTS),
    'metadata[jm1_commissioning_override]': 'true',
  }), {
    idempotencyKey: `jm1-commissioning-checkout-${COMMISSIONING_REFERENCE}`,
    keyType: 'checkout',
  })
}

export function assertCommissioningPaymentGateOpen() {
  if (!isStripeCommissioningPaymentGateOpen()) {
    throw new Error('commissioning_payment_gate_closed')
  }
}

async function stripeForm(path: string, body: URLSearchParams, options: { idempotencyKey?: string; keyType: StripeKeyType }) {
  if (options.keyType === 'connect') assertEnrollmentStripePath(path)

  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: 'POST',
    headers: stripeHeaders({ contentType: 'application/x-www-form-urlencoded', ...options }),
    body,
  })

  return handleStripeResponse(response)
}

function assertEnrollmentStripePath(path: string) {
  if (MONEY_MOVEMENT_STRIPE_PATHS.some((blockedPath) => path === blockedPath || path.startsWith(`${blockedPath}/`))) {
    throw new Error(`stripe_enrollment_money_movement_path_blocked:${path}`)
  }
}

type StripeKeyType = 'connect' | 'checkout'

function getStripeSecret(keyType: StripeKeyType) {
  const primary = keyType === 'connect'
    ? process.env.STRIPE_CONNECT_SECRET_KEY
    : process.env.STRIPE_CHECKOUT_SECRET_KEY
  const fallback = process.env.STRIPE_SECRET_KEY || process.env.JM1_STRIPE_SECRET_KEY
  const secret = primary || fallback || ''
  if (!secret) throw new Error(`stripe_${keyType}_secret_missing`)
  return secret
}

function stripeHeaders(options: { contentType: string; apiVersion?: string; idempotencyKey?: string; keyType: StripeKeyType }) {
  const secret = getStripeSecret(options.keyType)

  return {
    Authorization: `Bearer ${secret}`,
    'Content-Type': options.contentType,
    ...(options.apiVersion ? { 'Stripe-Version': options.apiVersion } : {}),
    ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
  }
}

async function handleStripeResponse(response: Response): Promise<StripeResponse> {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw Object.assign(new Error(body?.error?.code || `stripe_request_failed:${response.status}`), {
      status: response.status,
      code: body?.error?.code || null,
      type: body?.error?.type || null,
    })
  }
  return body
}
