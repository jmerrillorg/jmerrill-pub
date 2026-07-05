const STRIPE_API_BASE = 'https://api.stripe.com'
const STRIPE_V2_VERSION = '2026-06-24.dahlia'

export const COMMISSIONING_REFERENCE = 'JMP-INT-202607-0W5PTQ'
export const COMMISSIONING_TITLE = 'The Intentional Leader'
export const COMMISSIONING_PACKAGE_CODE = 'JMP-PKG-PRO'
export const COMMISSIONING_PACKAGE_NAME = 'Professional Publishing Package'
export const COMMISSIONING_STANDARD_AMOUNT_CENTS = 450000
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

export async function createRecipientAccount() {
  const body = {
    contact_email: process.env.JM1_STRIPE_COMMISSIONING_AUTHOR_EMAIL || 'publishing@jmerrill.one',
    display_name: COMMISSIONING_TITLE,
    dashboard: 'full',
    identity: {
      country: 'us',
      entity_type: 'individual',
    },
    configuration: {
      recipient: {
        capabilities: {
          stripe_balance: {
            stripe_transfers: {
              requested: true,
            },
          },
        },
      },
    },
    defaults: {
      currency: 'usd',
      responsibilities: {
        fees_collector: 'stripe',
        losses_collector: 'stripe',
      },
      locales: ['en-US'],
    },
    metadata: {
      jm1_division: 'publishing',
      jm1_reference: COMMISSIONING_REFERENCE,
      jm1_title: COMMISSIONING_TITLE,
      jm1_source: 'PROGRAM-002 commissioning',
    },
    include: ['configuration.recipient', 'identity', 'requirements'],
  }

  return stripeJson('/v2/core/accounts', body, {
    apiVersion: STRIPE_V2_VERSION,
    idempotencyKey: `jm1-connect-account-${COMMISSIONING_REFERENCE}`,
  })
}

export async function createRecipientAccountLink(accountId: string) {
  return stripeJson('/v2/core/account_links', {
    account: accountId,
    use_case: {
      type: 'account_onboarding',
      account_onboarding: {
        configurations: ['recipient'],
        collection_options: {
          fields: 'eventually_due',
          future_requirements: 'include',
        },
        refresh_url: 'https://jmerrill.pub/author/financial-setup',
        return_url: 'https://jmerrill.pub/author/portal?stripe=returned',
      },
    },
  }, {
    apiVersion: STRIPE_V2_VERSION,
    idempotencyKey: `jm1-connect-account-link-${COMMISSIONING_REFERENCE}-${Date.now()}`,
  })
}

export async function createCommissioningCheckoutSession() {
  return stripeForm('/v1/checkout/sessions', new URLSearchParams({
    mode: 'payment',
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
  })
}

async function stripeJson(path: string, body: Record<string, any>, options: { apiVersion?: string; idempotencyKey?: string } = {}) {
  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: 'POST',
    headers: stripeHeaders({ contentType: 'application/json', ...options }),
    body: JSON.stringify(body),
  })

  return handleStripeResponse(response)
}

async function stripeForm(path: string, body: URLSearchParams, options: { idempotencyKey?: string } = {}) {
  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: 'POST',
    headers: stripeHeaders({ contentType: 'application/x-www-form-urlencoded', ...options }),
    body,
  })

  return handleStripeResponse(response)
}

function stripeHeaders(options: { contentType: string; apiVersion?: string; idempotencyKey?: string }) {
  const secret = process.env.STRIPE_SECRET_KEY || process.env.JM1_STRIPE_SECRET_KEY || ''
  if (!secret) throw new Error('stripe_secret_missing')

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
