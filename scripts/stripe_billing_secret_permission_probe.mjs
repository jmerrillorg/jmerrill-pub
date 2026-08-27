#!/usr/bin/env node

const STRIPE_API_BASE = 'https://api.stripe.com'

const DEFAULTS = {
  invoiceId: 'in_1U7xLRJCiOVFpgYu1SKo9kgC',
  customerId: 'cus_V8DlN4Jeu1jDBi',
  paymentIntentId: 'pi_3U7xLSJCiOVFpgYu1ABnQR6G',
  chargeId: 'ch_3U7xLSJCiOVFpgYu1VuBLXtf',
}

const secret = process.env.STRIPE_CHECKOUT_SECRET_KEY || process.env.STRIPE_SECRET_KEY || ''
if (!/^(sk|rk)_(live|test|restricted)_/.test(secret)) {
  console.error(JSON.stringify({ ok: false, code: 'STRIPE_SECRET_MISSING_OR_INVALID_PREFIX' }))
  process.exit(1)
}

const fixture = {
  invoiceId: process.env.STRIPE_PERMISSION_PROBE_INVOICE_ID || DEFAULTS.invoiceId,
  customerId: process.env.STRIPE_PERMISSION_PROBE_CUSTOMER_ID || DEFAULTS.customerId,
  paymentIntentId: process.env.STRIPE_PERMISSION_PROBE_PAYMENT_INTENT_ID || DEFAULTS.paymentIntentId,
  chargeId: process.env.STRIPE_PERMISSION_PROBE_CHARGE_ID || DEFAULTS.chargeId,
}

const probes = [
  readProbe('STRIPE_APP_SECRET_AUTH', `/v1/invoices/${fixture.invoiceId}`),
  readProbe('CUSTOMER_READ', `/v1/customers/${fixture.customerId}`),
  readProbe('INVOICE_READ', `/v1/invoices/${fixture.invoiceId}`),
  readProbe('PAYMENT_INTENT_READ', `/v1/payment_intents/${fixture.paymentIntentId}`),
  readProbe('CHARGE_READ', `/v1/charges/${fixture.chargeId}`),
  authorityProbe('CUSTOMER_CREATE_AUTHORITY', '/v1/customers'),
  authorityProbe('INVOICE_ITEM_CREATE_AUTHORITY', '/v1/invoiceitems'),
  authorityProbe('INVOICE_CREATE_AUTHORITY', '/v1/invoices'),
  finalizeAuthorityProbe(),
]

const results = []
for (const probe of probes) {
  results.push(await runProbe(probe))
}

const summary = {
  ok: results.every((result) => result.pass),
  generatedAt: new Date().toISOString(),
  fixture: {
    invoiceId: fixture.invoiceId,
    customerId: fixture.customerId,
    paymentIntentId: fixture.paymentIntentId,
    chargeId: fixture.chargeId,
  },
  results,
  mutationCreated: false,
}

console.log(JSON.stringify(summary, null, 2))
process.exit(summary.ok ? 0 : 2)

function readProbe(key, path) {
  return { key, method: 'GET', path, expectedStatuses: [200] }
}

function authorityProbe(key, path) {
  const body = new URLSearchParams()
  body.set('__jm1_permission_probe_invalid_param', '1')
  return {
    key,
    method: 'POST',
    path,
    body,
    expectedStatuses: [400],
    idempotencyKey: `jm1-permission-probe-${key.toLowerCase()}-20260824`,
  }
}

function finalizeAuthorityProbe() {
  const body = new URLSearchParams()
  body.set('auto_advance', 'false')
  return {
    key: 'INVOICE_FINALIZE_AUTHORITY',
    method: 'POST',
    path: '/v1/invoices/in_jm1_permission_probe_nonexistent/finalize',
    body,
    expectedStatuses: [404],
    idempotencyKey: 'jm1-permission-probe-invoice_finalize_authority-20260824',
  }
}

async function runProbe(probe) {
  const headers = {
    Authorization: `Bearer ${secret}`,
  }
  if (probe.method === 'POST') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    headers['Idempotency-Key'] = probe.idempotencyKey
  }

  const response = await fetch(`${STRIPE_API_BASE}${probe.path}`, {
    method: probe.method,
    headers,
    body: probe.body,
  })
  const body = await response.json().catch(() => ({}))
  const stripeErrorCode = body?.error?.code || null
  const stripeErrorType = body?.error?.type || null
  const permissionPassed =
    response.ok ||
    (probe.expectedStatuses.includes(response.status) &&
      stripeErrorCode !== 'more_permissions_required' &&
      stripeErrorType !== 'invalid_request_error_more_permissions_required')

  return {
    key: probe.key,
    status: response.status,
    pass: permissionPassed,
    stripeErrorCode,
    object: body?.object || null,
    mutationCreated: false,
  }
}
