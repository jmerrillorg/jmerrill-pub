#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const billingService = readFileSync('lib/server/stripe/publishing-first-payment-billing.ts', 'utf8')
const paymentEventService = readFileSync('lib/server/stripe/publishing-payment-event.ts', 'utf8')
const probe = readFileSync('scripts/stripe_billing_secret_permission_probe.mjs', 'utf8')

test('Publishing billing route declares the Stripe billing mutation surface explicitly', () => {
  for (const operation of [
    'createCustomer',
    'createInvoiceItem',
    'createInvoice',
    'finalizeInvoice',
  ]) {
    assert.match(billingService, new RegExp(operation))
  }

  for (const endpoint of [
    '/v1/customers',
    '/v1/invoiceitems',
    '/v1/invoices',
  ]) {
    assert.match(billingService, new RegExp(endpoint))
  }
  assert.match(billingService, /encodeURIComponent\(invoiceId\)/)
  assert.match(billingService, /\/finalize/)
})

test('Publishing payment recovery remains readback-only and does not create billing objects', () => {
  assert.match(paymentEventService, /retrieveStripePaymentIntent/)
  assert.match(paymentEventService, /\/v1\/payment_intents\//)
  assert.match(paymentEventService, /expand\[\]=latest_charge/)
  assert.doesNotMatch(paymentEventService, /\/v1\/customers[^/]/)
  assert.doesNotMatch(paymentEventService, /\/v1\/invoiceitems/)
  assert.doesNotMatch(paymentEventService, /\/v1\/invoices[^/]/)
})

test('Permission probe is secret-safe and uses non-mutating validation probes for write authority', () => {
  assert.match(probe, /STRIPE_CHECKOUT_SECRET_KEY/)
  assert.match(probe, /CUSTOMER_CREATE_AUTHORITY/)
  assert.match(probe, /INVOICE_ITEM_CREATE_AUTHORITY/)
  assert.match(probe, /INVOICE_CREATE_AUTHORITY/)
  assert.match(probe, /INVOICE_FINALIZE_AUTHORITY/)
  assert.match(probe, /__jm1_permission_probe_invalid_param/)
  assert.match(probe, /in_jm1_permission_probe_nonexistent/)
  assert.match(probe, /mutationCreated:\s*false/)
  assert.doesNotMatch(probe, /console\.log\(secret|console\.error\(secret/)
})

test('Required app-native billing permissions are tracked as a complete readiness set', () => {
  for (const permission of [
    'STRIPE_APP_SECRET_AUTH',
    'CUSTOMER_READ',
    'INVOICE_READ',
    'PAYMENT_INTENT_READ',
    'CHARGE_READ',
    'CUSTOMER_CREATE_AUTHORITY',
    'INVOICE_ITEM_CREATE_AUTHORITY',
    'INVOICE_CREATE_AUTHORITY',
    'INVOICE_FINALIZE_AUTHORITY',
  ]) {
    assert.match(probe, new RegExp(permission))
  }
})
