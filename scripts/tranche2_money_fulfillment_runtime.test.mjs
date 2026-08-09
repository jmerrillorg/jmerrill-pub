import test from 'node:test'
import assert from 'node:assert/strict'

import {
  authorityMap,
  buildBusinessCentralItemMap,
  buildCloseout,
  buildInvoiceModel,
  businessCentralReadback,
  evaluateFinancialReadiness,
  microsoftDispositions,
  reconcileStripeToBusinessCentral,
  revalidateFulfillment,
  runInternalValidation,
} from './tranche2_money_fulfillment_runtime.mjs'

test('Tranche 2 validates 30 internal synthetic scenarios', () => {
  const validation = runInternalValidation()
  assert.equal(validation.result, 'PASS')
  assert.equal(validation.passed, 30)
  assert.equal(validation.total, 30)
})

test('Tranche 2 preserves system-of-record authority boundaries', () => {
  assert.equal(authorityMap.stripe, 'payment transaction truth')
  assert.equal(authorityMap.dynamics365Sales, 'commercial customer/opportunity/quote/order')
  assert.equal(authorityMap.businessCentral, 'accounting, invoice, receivable, revenue, posting, and books')
  assert.equal(authorityMap.dataverse, 'Publishing operational state and fulfillment projection')
})

test('Tranche 2 maps all 20 catalog products to Business Central without duplicate financial SKUs', () => {
  const map = buildBusinessCentralItemMap()
  assert.equal(map.length, 20)
  assert.deepEqual(
    map.filter((item, index) => map.findIndex((candidate) => candidate.sku === item.sku) !== index),
    [],
  )
  assert.equal(map.every((item) => item.businessCentralAuthority === 'Business Central'), true)
})

test('Tranche 2 invoice model fails closed for SOW items without approved amount', () => {
  const invoice = buildInvoiceModel({
    correlationId: 'TEST-SOW',
    orderId: 'ORDER-TEST-SOW',
    packageSku: 'JMP-PKG-PRO',
    addOns: ['JMP-CUS-SOW'],
  })
  assert.equal(invoice.state, 'INVOICE_NOT_READY')
  assert.deepEqual(invoice.unresolvedSowSkus, ['JMP-CUS-SOW'])
})

test('Tranche 2 financial readiness must pass before fulfillment authorization', () => {
  const blocked = revalidateFulfillment({
    commercialState: 'AGREEMENT_EXECUTED',
    paymentState: 'PAID',
    orderReady: true,
    financialReadiness: 'FINANCIAL_NOT_READY',
  })
  assert.equal(blocked.result, 'NOT_AUTHORIZED')
  assert.equal(blocked.titlePfRuntimeStarted, false)

  const ready = evaluateFinancialReadiness({
    customerState: 'BC_CUSTOMER_READY',
    invoiceState: 'INVOICE_READY',
    reconciliationState: 'AR_PAID',
  })
  assert.equal(ready.result, 'FINANCIAL_READY_FOR_FULFILLMENT')
})

test('Tranche 2 Stripe to Business Central reconciliation is idempotent and exception-routed', () => {
  const first = reconcileStripeToBusinessCentral({
    correlationId: 'TEST-RECON',
    amountDue: 1999,
    amountPaid: 1999,
    bcOpenAmount: 0,
  })
  const second = reconcileStripeToBusinessCentral({
    correlationId: 'TEST-RECON',
    amountDue: 1999,
    amountPaid: 1999,
    bcOpenAmount: 0,
  })
  assert.equal(first.idempotencyKey, second.idempotencyKey)
  assert.equal(second.duplicatePostings, 0)

  const mismatch = reconcileStripeToBusinessCentral({
    correlationId: 'TEST-RECON-MISMATCH',
    amountDue: 1999,
    amountPaid: 1999,
    bcOpenAmount: 100,
  })
  assert.equal(mismatch.state, 'FINANCIAL_EXCEPTION_REVIEW')
})

test('Tranche 2 Business Central readback identifies active sandbox and production publishing company', () => {
  assert.equal(businessCentralReadback.environments.find((item) => item.name === 'JM1-BC-SANDBOX')?.status, 'Active')
  assert.equal(businessCentralReadback.environments.find((item) => item.name === 'JM1-BC-CORE')?.type, 'Production')
  assert.equal(businessCentralReadback.productionCompany.name, 'J Merrill Publishing Inc')
})

test('Tranche 2 closeout preserves hard boundaries', () => {
  const closeout = buildCloseout()
  assert.equal(closeout.liveAuthorsUsed, 0)
  assert.equal(closeout.liveTitlesUsed, 0)
  assert.equal(closeout.pr431TitlesUsed, 0)
  assert.equal(closeout.businessCentralPostingDocumentsCreated, 0)
  assert.equal(closeout.businessCentralPostedInvoicesCreated, 0)
  assert.equal(closeout.stripeMutations, 0)
  assert.equal(closeout.dataverseSchemaChanges, 0)
  assert.equal(closeout.titlePfRuntime, 'NOT STARTED')
  assert.equal(closeout.tranche3, 'NOT STARTED')
  assert.equal(closeout.royaltyWork, 0)
  assert.equal(closeout.authorCommunications, 0)
  assert.equal(closeout.clientTitleAutomation, 'FROZEN')
})

test('Tranche 2 Microsoft reuse dispositions have no UNKNOWN decisions', () => {
  assert.equal(microsoftDispositions.some(([, disposition]) => disposition === 'UNKNOWN'), false)
  assert.equal(microsoftDispositions.length, 18)
})
