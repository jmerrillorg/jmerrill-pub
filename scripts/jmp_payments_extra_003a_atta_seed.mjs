import { createHash } from 'node:crypto'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const { buildBalanceVersion } = jiti('../lib/server/stripe/publishing-agreement-payment.ts')

const AUTHOR_ID = '60937251-d589-f111-ab10-6045bdd69678'
const TITLE_ID = 'c8db4256-d589-f111-ab10-6045bdd69435'
const AGREEMENT_ID = '131da28b-919c-f111-b8dc-6045bdd69435'
const STRIPE_CUSTOMER_ID = 'cus_V6iLQUvk68RyJB'
const STRIPE_SCHEDULE_ID = 'sub_sched_1U6UvvJCiOVFpgYuik8ptyYp'
const STRIPE_PAYMENT_ID = 'pi_3U6UygJCiOVFpgYu1V9iO8xW'
const STRIPE_CHARGE_ID = 'py_3U6UygJCiOVFpgYu16C8l9aL'
const PAID_INVOICE_ID = 'in_1U6UvvJCiOVFpgYubDg2z1e9'
const OPEN_INVOICE_ID = 'in_1UHjinJCiOVFpgYutHBdj0l4'

const obligationFacts = [
  ['2026-08-27T12:18:59.000Z', 25988, 'SATISFIED', PAID_INVOICE_ID],
  ['2026-09-27T12:18:59.000Z', 25988, 'SCHEDULED', OPEN_INVOICE_ID],
  ['2026-10-27T12:18:59.000Z', 25988, 'SCHEDULED', null],
  ['2026-11-27T12:18:59.000Z', 25988, 'SCHEDULED', null],
  ['2026-12-27T12:18:59.000Z', 25988, 'SCHEDULED', null],
  ['2027-01-27T12:18:59.000Z', 25988, 'SCHEDULED', null],
  ['2027-02-27T12:18:59.000Z', 25988, 'SCHEDULED', null],
  ['2027-03-27T12:18:59.000Z', 25983, 'SCHEDULED', null],
].map(([dueDate, amountCents, status, stripeInvoiceId], index) => ({
  obligationId: deterministicGuid(`${AGREEMENT_ID}:installment:${index + 1}`),
  dueDate,
  amountCents,
  status,
  stripeInvoiceId,
  installmentSequence: index + 1,
}))

const firstPayment = {
  paymentId: STRIPE_PAYMENT_ID,
  eventId: `stripe-import:${PAID_INVOICE_ID}`,
  paymentType: 'SCHEDULED_INSTALLMENT',
  amountCents: 25988,
  status: 'SUCCEEDED',
  allocations: [{
    kind: 'CURRENT_SCHEDULED_INSTALLMENT',
    amountCents: 25988,
    scheduledObligationId: obligationFacts[0].obligationId,
  }],
  paidAt: '2026-08-21T16:35:16.000Z',
}

const snapshot = {
  agreementId: AGREEMENT_ID,
  authorId: AUTHOR_ID,
  titleId: TITLE_ID,
  paymentScheduleId: STRIPE_SCHEDULE_ID,
  currency: 'usd',
  contractualBalanceCents: 207899,
  normalInstallmentCents: 25988,
  nextScheduledDueDate: obligationFacts[1].dueDate,
  scheduledObligations: obligationFacts.map(({ obligationId, dueDate, amountCents, status }) => ({ obligationId, dueDate, amountCents, status })),
  payments: [firstPayment],
  refunds: [],
}

const balanceVersion = buildBalanceVersion(snapshot)
const dryRun = !process.argv.includes('--apply')
const config = requiredConfig()
const token = await accessToken(config)

const existingAgreement = await first(config, token, 'jmpv2_agreementrecords', {
  $select: 'jmpv2_agreementrecordid,jmpv2_stripecustomerid,jmpv2_currentbalancecents,jmpv2_balanceversion',
  $filter: `jmpv2_agreementrecordid eq ${AGREEMENT_ID}`,
})

if (dryRun) {
  console.log(JSON.stringify({
    mode: 'DRY_RUN',
    agreementExists: Boolean(existingAgreement),
    agreementId: AGREEMENT_ID,
    authorId: AUTHOR_ID,
    titleId: TITLE_ID,
    stripeCustomerId: STRIPE_CUSTOMER_ID,
    stripeScheduleId: STRIPE_SCHEDULE_ID,
    contractualBalanceCents: 207899,
    paymentsToDateCents: 25988,
    currentBalanceCents: 181911,
    currentInstallmentCents: 25988,
    pastDueCents: 0,
    obligationCount: obligationFacts.length,
    balanceVersion,
    qboSyncState: 'PENDING_RECONCILIATION',
    financialEffects: 0,
  }, null, 2))
  process.exit(0)
}

if (existingAgreement) {
  assertSame(existingAgreement.jmpv2_stripecustomerid, STRIPE_CUSTOMER_ID, 'EXISTING_STRIPE_CUSTOMER_MISMATCH')
  assertSame(Number(existingAgreement.jmpv2_currentbalancecents), 181911, 'EXISTING_BALANCE_MISMATCH')
}

await upsert(config, token, 'jmpv2_agreementrecords', AGREEMENT_ID, {
  jmpv2_agreementkey: AGREEMENT_ID,
  jmpv2_authoridentity: AUTHOR_ID,
  jmpv2_titleid: TITLE_ID,
  jmpv2_paymentscheduleid: STRIPE_SCHEDULE_ID,
  jmpv2_currency: 'usd',
  jmpv2_totalagreementamountcents: 207899,
  jmpv2_scheduledinstallmentamountcents: 25988,
  jmpv2_schedulecadence: 'MONTHLY',
  jmpv2_currentbalancecents: 181911,
  jmpv2_pastduebalancecents: 0,
  jmpv2_nextduedate: obligationFacts[1].dueDate,
  jmpv2_nextpaymentat: obligationFacts[1].dueDate,
  jmpv2_lastpaymentat: firstPayment.paidAt,
  jmpv2_paymentledgerstatus: 'ACTIVE',
  jmpv2_payoffstatus: 'OPEN',
  jmpv2_autopaystatus: 'SEND_INVOICE',
  jmpv2_stripecustomerid: STRIPE_CUSTOMER_ID,
  jmpv2_stripesubscriptionscheduleid: STRIPE_SCHEDULE_ID,
  jmpv2_qbocustomerreference: null,
  jmpv2_qboreceivablereference: null,
  jmpv2_balanceversion: balanceVersion,
})

for (const obligation of obligationFacts) {
  await upsert(config, token, 'jmpv2_paymentrequirements', obligation.obligationId, {
    jmpv2_agreementkey: AGREEMENT_ID,
    jmpv2_amountcents: obligation.amountCents,
    jmpv2_duedate: obligation.dueDate,
    jmpv2_idempotencykey: `${AGREEMENT_ID}:installment:${obligation.installmentSequence}`,
    jmpv2_installmentsequence: obligation.installmentSequence,
    jmpv2_obligationstatus: obligation.status,
    jmpv2_stripeinvoiceid: obligation.stripeInvoiceId,
  })
}

const evidenceKey = `atta-stripe-import:${PAID_INVOICE_ID}`
const existingEvidence = await first(config, token, 'jmpv2_paymentevidences', {
  $select: 'jmpv2_paymentevidenceid',
  $filter: `jmpv2_paymentevidencekey eq '${escapeOData(evidenceKey)}'`,
})
if (!existingEvidence) {
  await create(config, token, 'jmpv2_paymentevidences', {
    jmpv2_paymentevidencekey: evidenceKey,
    jmpv2_agreementkey: AGREEMENT_ID,
    jmpv2_eventkind: 'PAYMENT',
    jmpv2_paymenttype: 'SCHEDULED_INSTALLMENT',
    jmpv2_stripeeventid: firstPayment.eventId,
    jmpv2_stripepaymentid: STRIPE_PAYMENT_ID,
    jmpv2_stripeinvoiceid: PAID_INVOICE_ID,
    jmpv2_settlementreference: STRIPE_CHARGE_ID,
    jmpv2_obligationid: obligationFacts[0].obligationId,
    jmpv2_grossamountcents: 25988,
    jmpv2_scheduledallocationcents: 25988,
    jmpv2_pastdueallocationcents: 0,
    jmpv2_additionalallocationcents: 0,
    jmpv2_allocationsjson: JSON.stringify(firstPayment.allocations),
    jmpv2_balancebeforecents: 207899,
    jmpv2_balanceaftercents: 181911,
    jmpv2_eventstatus: 'CONFIRMED',
    jmpv2_qboreconciliationstatus: 'PENDING',
    jmpv2_idempotencykey: STRIPE_PAYMENT_ID,
    jmpv2_occurredat: firstPayment.paidAt,
  })
}

const readback = await first(config, token, 'jmpv2_agreementrecords', {
  $select: 'jmpv2_agreementrecordid,jmpv2_authoridentity,jmpv2_titleid,jmpv2_stripecustomerid,jmpv2_stripesubscriptionscheduleid,jmpv2_currentbalancecents,jmpv2_pastduebalancecents,jmpv2_balanceversion,jmpv2_qbocustomerreference,jmpv2_qboreceivablereference',
  $filter: `jmpv2_agreementrecordid eq ${AGREEMENT_ID}`,
})
const obligations = await list(config, token, 'jmpv2_paymentrequirements', {
  $select: 'jmpv2_paymentrequirementid',
  $filter: `jmpv2_agreementkey eq '${AGREEMENT_ID}'`,
})
const evidence = await first(config, token, 'jmpv2_paymentevidences', {
  $select: 'jmpv2_paymentevidenceid,jmpv2_qboreconciliationstatus',
  $filter: `jmpv2_paymentevidencekey eq '${escapeOData(evidenceKey)}'`,
})

assertSame(readback?.jmpv2_authoridentity, AUTHOR_ID, 'AUTHOR_READBACK_FAILED')
assertSame(readback?.jmpv2_titleid, TITLE_ID, 'TITLE_READBACK_FAILED')
assertSame(readback?.jmpv2_stripecustomerid, STRIPE_CUSTOMER_ID, 'STRIPE_CUSTOMER_READBACK_FAILED')
assertSame(readback?.jmpv2_stripesubscriptionscheduleid, STRIPE_SCHEDULE_ID, 'STRIPE_SCHEDULE_READBACK_FAILED')
assertSame(Number(readback?.jmpv2_currentbalancecents), 181911, 'BALANCE_READBACK_FAILED')
assertSame(readback?.jmpv2_balanceversion, balanceVersion, 'BALANCE_VERSION_READBACK_FAILED')
assertSame(obligations.length, 8, 'OBLIGATION_COUNT_READBACK_FAILED')
if (!evidence) throw new Error('PAYMENT_EVIDENCE_READBACK_FAILED')

console.log(JSON.stringify({
  mode: 'APPLY',
  status: 'PASS',
  agreementId: AGREEMENT_ID,
  authorId: AUTHOR_ID,
  titleId: TITLE_ID,
  stripeCustomerId: STRIPE_CUSTOMER_ID,
  stripeScheduleId: STRIPE_SCHEDULE_ID,
  currentBalanceCents: 181911,
  maximumAdditionalPaymentCents: 181911,
  obligationCount: obligations.length,
  paymentEvidencePresent: true,
  qboCustomerReference: readback.jmpv2_qbocustomerreference || null,
  qboReceivableReference: readback.jmpv2_qboreceivablereference || null,
  qboSyncState: 'PENDING_RECONCILIATION',
  balanceVersion,
  financialEffects: 0,
}, null, 2))

function requiredConfig() {
  const resourceUrl = requiredEnv('DATAVERSE_RESOURCE_URL').replace(/\/+$/, '')
  return {
    resourceUrl,
    apiBase: (process.env.DATAVERSE_WEB_API_BASE_URL || `${resourceUrl}/api/data/v9.2`).replace(/\/+$/, ''),
    tenantId: requiredEnv('DATAVERSE_TENANT_ID'),
    clientId: requiredEnv('DATAVERSE_CLIENT_ID'),
    clientSecret: requiredEnv('DATAVERSE_CLIENT_SECRET'),
  }
}

async function accessToken(config) {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'client_credentials',
    scope: `${config.resourceUrl}/.default`,
  })
  const response = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const result = await response.json()
  if (!response.ok || !result.access_token) throw new Error(`DATAVERSE_AUTH_FAILED_${response.status}`)
  return result.access_token
}

async function list(config, token, entitySet, params) {
  const query = new URLSearchParams(params)
  const response = await fetch(`${config.apiBase}/${entitySet}?${query}`, { headers: headers(token) })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`DATAVERSE_READ_FAILED_${entitySet}_${response.status}:${safeMessage(result)}`)
  return Array.isArray(result.value) ? result.value : []
}

async function first(config, token, entitySet, params) {
  return (await list(config, token, entitySet, { ...params, $top: '1' }))[0] || null
}

async function upsert(config, token, entitySet, id, payload) {
  const response = await fetch(`${config.apiBase}/${entitySet}(${id})`, {
    method: 'PATCH',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const result = await response.json().catch(() => ({}))
    throw new Error(`DATAVERSE_UPSERT_FAILED_${entitySet}_${response.status}:${safeMessage(result)}`)
  }
}

async function create(config, token, entitySet, payload) {
  const response = await fetch(`${config.apiBase}/${entitySet}`, {
    method: 'POST',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const result = await response.json().catch(() => ({}))
    throw new Error(`DATAVERSE_CREATE_FAILED_${entitySet}_${response.status}:${safeMessage(result)}`)
  }
}

function headers(token) {
  return { Authorization: `Bearer ${token}`, Accept: 'application/json', 'OData-MaxVersion': '4.0', 'OData-Version': '4.0' }
}

function deterministicGuid(value) {
  const hex = createHash('sha256').update(value).digest('hex').slice(0, 32).split('')
  hex[12] = '5'
  hex[16] = ['8', '9', 'a', 'b'][Number.parseInt(hex[16], 16) % 4]
  return `${hex.slice(0, 8).join('')}-${hex.slice(8, 12).join('')}-${hex.slice(12, 16).join('')}-${hex.slice(16, 20).join('')}-${hex.slice(20).join('')}`
}

function requiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name}_REQUIRED`)
  return value
}

function assertSame(actual, expected, code) {
  if (actual !== expected) throw new Error(code)
}

function escapeOData(value) {
  return value.replace(/'/g, "''")
}

function safeMessage(result) {
  return `${String(result?.error?.code || 'unknown')}:${String(result?.error?.message || 'unknown')}`.slice(0, 500)
}
