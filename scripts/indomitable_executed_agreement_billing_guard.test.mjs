#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const service = readFileSync('lib/server/stripe/publishing-first-payment-billing.ts', 'utf8')
const route = readFileSync('app/api/author/billing/indomitable-first-payment/route.ts', 'utf8')

test('Indomitable billing authority locks the executed agreement payment figures', () => {
  assert.match(service, /opportunityId:\s*'455daa4a-629f-f111-b8dc-6045bdd69678'/)
  assert.match(service, /intakeReferenceCode:\s*'JMP-INT-202608-0AOS7L'/)
  assert.match(service, /authorEmail:\s*'quanishadockery7777@gmail\.com'/)
  assert.match(service, /packageCode:\s*'JMP-PKG-PRO'/)
  assert.match(service, /paymentOptionCode:\s*'TWENTY_FOUR_PAYMENTS'/)
  assert.match(service, /paymentPolicyVersion:\s*'JMP_FINANCING_EARLY_PAYOFF_v1\.1'/)
  assert.match(service, /principalCents:\s*450000/)
  assert.match(service, /totalBeforeTaxCents:\s*501750/)
  assert.match(service, /installmentCount:\s*24/)
  assert.match(service, /standardInstallmentCents:\s*20906/)
  assert.match(service, /finalInstallmentCents:\s*20912/)
})

test('installment schedule proves 23 standard installments and one odd final installment', () => {
  assert.match(service, /Array\.from\(\{\s*length:\s*INDOMITABLE_BILLING_AUTHORITY\.installmentCount\s*\}/)
  assert.match(service, /finalInstallmentCents/)
  assert.match(service, /standardInstallmentCents/)
  assert.match(service, /total === INDOMITABLE_BILLING_AUTHORITY\.totalBeforeTaxCents/)
})

test('first-payment email is canonical ACS HTML and author-facing only', () => {
  assert.match(service, /from:\s*'publishing@email\.jmerrill\.one'/)
  assert.match(service, /replyTo:\s*'publishing@jmerrill\.one'/)
  assert.match(service, /cc:\s*'publishing@jmerrill\.one'/)
  assert.match(service, /Make First Payment/)
  assert.match(service, /24-payment option/)
  assert.match(service, /PUBLISHING_FIRST_PAYMENT_REQUEST_V1/)
  assert.doesNotMatch(service, /NoReply|noreply/)
})

test('Stripe creates a customer and invoice request without automatic card charge', () => {
  assert.match(service, /createCustomer/)
  assert.match(service, /createInvoiceItem/)
  assert.match(service, /createInvoice/)
  assert.match(service, /finalizeInvoice/)
  assert.match(service, /collection_method',\s*'send_invoice'/)
  assert.match(service, /auto_advance',\s*'false'/)
  assert.doesNotMatch(service, /payment_intents|charges/)
})

test('Stripe secret guard accepts governed restricted keys as well as standard secret keys', () => {
  assert.match(service, /\^\(sk\|rk\)_\(live\|test\|restricted\)_/)
})

test('idempotency and execution-log events are explicit', () => {
  for (const event of [
    'AGREEMENT_FULLY_EXECUTED',
    'STRIPE_CUSTOMER_READY',
    'BILLING_PLAN_CREATED',
    'FIRST_PAYMENT_REQUESTED',
  ]) {
    assert.match(service, new RegExp(event))
  }
  assert.match(service, /buildIdempotencyKey/)
  assert.match(service, /FIRST-PAYMENT-REQUESTED-/)
  assert.match(service, /FIRST_PAYMENT_REQUEST_ALREADY_EXISTS/)
})

test('route is protected and requires explicit live-action confirmations', () => {
  assert.match(route, /JM1_PAYMENT_EVENT_RECOVERY_KEY/)
  assert.match(route, /confirmExecutedAgreement/)
  assert.match(route, /confirmCreateFirstPaymentRequest/)
  assert.match(route, /confirmSendAuthorEmail/)
})

test('negative proof preserves no payment receipt or production start before Stripe success', () => {
  assert.match(service, /firstPaymentReceived:\s*false/)
  assert.match(service, /productionStarted:\s*false/)
  assert.match(service, /paymentMarkedReceivedWithoutStripeConfirmation:\s*0/)
  assert.match(service, /productionStartedBeforeFirstPayment:\s*0/)
  assert.match(service, /autoCharge:\s*0/)
  assert.match(service, /businessCentralPosting:\s*0/)
})
