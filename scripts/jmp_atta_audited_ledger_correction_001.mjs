import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { calculateAgreementPaymentState } from '../lib/server/stripe/publishing-agreement-payment.ts'

const API = 'https://jm1hq.crm.dynamics.com/api/data/v9.2'
const STRIPE = 'https://api.stripe.com/v1'
const AGREEMENT = '131da28b-919c-f111-b8dc-6045bdd69435'
const AUTHOR = '60937251-d589-f111-ab10-6045bdd69678'
const TITLE = 'ca68c994-fd89-f111-ab10-00224820105b'
const SEPTEMBER = '3226b152-3203-5eb3-bfc5-2992a9397e45'
const OCTOBER = '479cb4f2-a610-5217-970a-c023ba64111f'
const SEPTEMBER_PAYMENT = '415caaac-c6b9-f111-aaac-000d3a9eacee'
const EXTRA_PAYMENT = '3540f4cc-d0b9-f111-aaac-000d3a14673b'
const INVOICE = 'in_1UHjinJCiOVFpgYutHBdj0l4'
const INVOICE_PI = 'pi_3UHkfeJCiOVFpgYu12GS4bwY'
const EXTRA_PI = 'pi_3UJyOeJCiOVFpgYu1UppQVP8'
const AUDIT_KEY = 'JMP-ATTA-AUDITED-LEDGER-CORRECTION-001'
const EVIDENCE = '/Volumes/UsersExternal/Developer/evidence/JMP-ATTA-AUDITED-LEDGER-CORRECTION-001'

function assert(condition, code) {
  if (!condition) throw new Error(code)
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function hasEtag(row) {
  return /^W\/"\d+"$/.test(row?.['@odata.etag'] || '')
}

export function planCorrection({ agreement, requirements, payments, audit, invoice, invoicePayment, extraPayment }) {
  assert(agreement?.jmpv2_agreementrecordid === AGREEMENT && agreement.jmpv2_agreementkey === AGREEMENT, 'AGREEMENT_IDENTITY_MISMATCH')
  assert(agreement.jmpv2_authoridentity === AUTHOR && agreement.jmpv2_titleid === TITLE, 'AUTHOR_TITLE_BINDING_MISMATCH')
  assert(agreement.jmpv2_paymentscheduleid === 'sub_sched_1U6UvvJCiOVFpgYuik8ptyYp', 'SCHEDULE_BINDING_MISMATCH')
  assert(agreement.jmpv2_paymentledgerstatus === 'ACTIVE' && agreement.jmpv2_currentbalancecents === 129935 &&
    agreement.jmpv2_totalagreementamountcents === 207899 && agreement.jmpv2_scheduledinstallmentamountcents === 25988,
  'AGREEMENT_BALANCE_DRIFT')
  assert(requirements.length === 8 && payments.filter((row) => row.jmpv2_eventkind === 'PAYMENT').length === 3,
    'LEDGER_ROW_COUNT_DRIFT')
  const september = requirements.find((row) => row.jmpv2_paymentrequirementid === SEPTEMBER)
  const october = requirements.find((row) => row.jmpv2_paymentrequirementid === OCTOBER)
  const scheduled = payments.find((row) => row.jmpv2_paymentevidenceid === SEPTEMBER_PAYMENT)
  const extra = payments.find((row) => row.jmpv2_paymentevidenceid === EXTRA_PAYMENT)
  assert(september?.jmpv2_installmentsequence === 2 && september.jmpv2_amountcents === 25988 &&
    september.jmpv2_stripeinvoiceid === INVOICE && october?.jmpv2_installmentsequence === 3 &&
    october.jmpv2_obligationstatus === 'SCHEDULED' && october.jmpv2_amountcents === 25988,
  'INSTALLMENT_BINDING_DRIFT')
  assert(scheduled?.jmpv2_eventkind === 'PAYMENT' && scheduled.jmpv2_eventstatus === 'CONFIRMED' &&
    scheduled.jmpv2_stripeinvoiceid === INVOICE && scheduled.jmpv2_stripepaymentid === INVOICE_PI &&
    scheduled.jmpv2_grossamountcents === 25988 && scheduled.jmpv2_balancebeforecents === 181911 &&
    scheduled.jmpv2_balanceaftercents === 155923, 'SEPTEMBER_PAYMENT_BINDING_DRIFT')
  assert(extra?.jmpv2_eventkind === 'PAYMENT' && extra.jmpv2_eventstatus === 'CONFIRMED' &&
    extra.jmpv2_paymenttype === 'ADDITIONAL_PAYMENT' && extra.jmpv2_stripeinvoiceid == null &&
    extra.jmpv2_stripepaymentid === EXTRA_PI && extra.jmpv2_additionalallocationcents === 25988 &&
    extra.jmpv2_grossamountcents === 25988 &&
    sameJson(JSON.parse(extra.jmpv2_allocationsjson), [{ kind: 'ADDITIONAL_PAYMENT', amountCents: 25988 }]),
  'EXTRA_PRINCIPAL_PAYMENT_DRIFT')
  assert(invoice?.id === INVOICE && invoice.livemode === true && invoice.status === 'paid' &&
    invoice.amount_paid === 25988 && invoice.amount_remaining === 0 && invoice.payment_intent === INVOICE_PI &&
    invoice.customer === agreement.jmpv2_stripecustomerid && invoice.subscription === 'sub_1U6UvvJCiOVFpgYuwpqG6sFe',
  'STRIPE_INVOICE_PROOF_FAILED')
  assert(invoicePayment?.id === INVOICE_PI && invoicePayment.status === 'succeeded' &&
    invoicePayment.amount_received === 25988 && invoicePayment.invoice === INVOICE,
  'STRIPE_INVOICE_PAYMENT_PROOF_FAILED')
  assert(extraPayment?.id === EXTRA_PI && extraPayment.livemode === true && extraPayment.status === 'succeeded' &&
    extraPayment.amount_received === 25988 && extraPayment.invoice == null &&
    extraPayment.customer === agreement.jmpv2_stripecustomerid &&
    extraPayment.metadata?.jm1_author_id === AUTHOR && extraPayment.metadata?.jm1_title_id === TITLE &&
    extraPayment.metadata?.jm1_agreement_id === AGREEMENT &&
    extraPayment.metadata?.jm1_payment_schedule_id === agreement.jmpv2_paymentscheduleid &&
    extraPayment.metadata?.jm1_payment_type === 'ADDITIONAL_PAYMENT', 'STRIPE_EXTRA_PAYMENT_PROOF_FAILED')

  const allocation = [{ kind: 'CURRENT_DUE_SCHEDULED_INSTALLMENT', amountCents: 25988, scheduledObligationId: SEPTEMBER }]
  const alreadyCorrected = scheduled.jmpv2_paymenttype === 'SCHEDULED_INSTALLMENT' &&
    scheduled.jmpv2_obligationid === SEPTEMBER && scheduled.jmpv2_scheduledallocationcents === 25988 &&
    scheduled.jmpv2_additionalallocationcents === 0 && sameJson(JSON.parse(scheduled.jmpv2_allocationsjson), allocation) &&
    september.jmpv2_obligationstatus === 'SATISFIED' &&
    agreement.jmpv2_nextduedate === october.jmpv2_duedate && agreement.jmpv2_nextpaymentat === october.jmpv2_duedate
  if (audit) {
    const auditFacts = JSON.parse(audit.jmpv2_allocationsjson || '{}')
    assert(audit.jmpv2_paymentevidencekey === AUDIT_KEY && audit.jmpv2_eventkind === 'LEDGER_CORRECTION' &&
      audit.jmpv2_eventstatus === 'CONFIRMED' && audit.jmpv2_agreementkey === AGREEMENT &&
      auditFacts.correctedPaymentRowId === SEPTEMBER_PAYMENT && auditFacts.requirementId === SEPTEMBER &&
      auditFacts.correctedBalanceVersion === agreement.jmpv2_balanceversion &&
      auditFacts.correctedNextDue === agreement.jmpv2_nextduedate && alreadyCorrected,
    'AUDITED_REPLAY_STATE_MISMATCH')
    return { status: 'ALREADY_APPLIED' }
  }
  assert(!alreadyCorrected, 'UNJOURNALED_CORRECTION_PRESENT')
  assert(scheduled.jmpv2_paymenttype === 'ADDITIONAL_PAYMENT' && scheduled.jmpv2_obligationid == null &&
    scheduled.jmpv2_scheduledallocationcents === 0 && scheduled.jmpv2_additionalallocationcents === 25988 &&
    sameJson(JSON.parse(scheduled.jmpv2_allocationsjson), [{ kind: 'ADDITIONAL_PAYMENT', amountCents: 25988 }]) &&
    september.jmpv2_obligationstatus === 'SCHEDULED' &&
    agreement.jmpv2_nextduedate === september.jmpv2_duedate && agreement.jmpv2_nextpaymentat === september.jmpv2_duedate,
  'PRE_CORRECTION_STATE_DRIFT')
  assert([agreement, september, scheduled].every(hasEtag), 'ETAG_MISSING')

  const snapshot = {
    agreementId: AGREEMENT, authorId: AUTHOR, titleId: TITLE,
    paymentScheduleId: agreement.jmpv2_paymentscheduleid, currency: 'usd',
    contractualBalanceCents: 207899, normalInstallmentCents: 25988,
    nextScheduledDueDate: october.jmpv2_duedate,
    scheduledObligations: requirements.map((row) => ({ obligationId: row.jmpv2_paymentrequirementid,
      dueDate: row.jmpv2_duedate, amountCents: row.jmpv2_amountcents,
      status: row.jmpv2_paymentrequirementid === SEPTEMBER ? 'SATISFIED' : row.jmpv2_obligationstatus })),
    payments: payments.filter((row) => row.jmpv2_eventkind === 'PAYMENT').map((row) => ({
      paymentId: row.jmpv2_stripepaymentid, eventId: row.jmpv2_stripeeventid,
      paymentType: row.jmpv2_paymentevidenceid === SEPTEMBER_PAYMENT ? 'SCHEDULED_INSTALLMENT' : row.jmpv2_paymenttype,
      amountCents: row.jmpv2_grossamountcents, status: row.jmpv2_eventstatus === 'CONFIRMED' ? 'SUCCEEDED' : 'FAILED',
      allocations: row.jmpv2_paymentevidenceid === SEPTEMBER_PAYMENT ? allocation : JSON.parse(row.jmpv2_allocationsjson),
      paidAt: row.jmpv2_occurredat,
    })), refunds: [],
  }
  const originalSnapshot = {
    ...snapshot,
    nextScheduledDueDate: agreement.jmpv2_nextduedate,
    scheduledObligations: requirements.map((row) => ({ obligationId: row.jmpv2_paymentrequirementid,
      dueDate: row.jmpv2_duedate, amountCents: row.jmpv2_amountcents, status: row.jmpv2_obligationstatus })),
    payments: payments.filter((row) => row.jmpv2_eventkind === 'PAYMENT').map((row) => ({
      paymentId: row.jmpv2_stripepaymentid, eventId: row.jmpv2_stripeeventid,
      paymentType: row.jmpv2_paymenttype, amountCents: row.jmpv2_grossamountcents,
      status: row.jmpv2_eventstatus === 'CONFIRMED' ? 'SUCCEEDED' : 'FAILED',
      allocations: JSON.parse(row.jmpv2_allocationsjson), paidAt: row.jmpv2_occurredat,
    })),
  }
  const originalState = calculateAgreementPaymentState(originalSnapshot)
  assert(originalState.remainingBalanceCents === agreement.jmpv2_currentbalancecents &&
    originalState.balanceVersion === agreement.jmpv2_balanceversion, 'PRE_CORRECTION_MODEL_DRIFT')
  const state = calculateAgreementPaymentState(snapshot)
  assert(state.remainingBalanceCents === 129935 && state.nextScheduledDueDate === october.jmpv2_duedate &&
    state.paidInFull === false, 'CORRECTED_MODEL_STATE_MISMATCH')
  return {
    status: 'READY', state,
    before: { agreement, september, scheduled, extra, october, provider: {
      invoice: { id: invoice.id, status: invoice.status, amount_paid: invoice.amount_paid,
        payment_intent: invoice.payment_intent, subscription: invoice.subscription },
      extraPayment: { id: extraPayment.id, status: extraPayment.status,
        amount_received: extraPayment.amount_received, invoice: extraPayment.invoice },
    } },
    patches: [
      { entity: 'jmpv2_paymentevidences', id: SEPTEMBER_PAYMENT, etag: scheduled['@odata.etag'], body: {
        jmpv2_paymenttype: 'SCHEDULED_INSTALLMENT', jmpv2_obligationid: SEPTEMBER,
        jmpv2_scheduledallocationcents: 25988, jmpv2_additionalallocationcents: 0,
        jmpv2_allocationsjson: JSON.stringify(allocation) } },
      { entity: 'jmpv2_paymentrequirements', id: SEPTEMBER, etag: september['@odata.etag'],
        body: { jmpv2_obligationstatus: 'SATISFIED' } },
      { entity: 'jmpv2_agreementrecords', id: AGREEMENT, etag: agreement['@odata.etag'], body: {
        jmpv2_nextduedate: october.jmpv2_duedate, jmpv2_nextpaymentat: october.jmpv2_duedate,
        jmpv2_balanceversion: state.balanceVersion } },
    ],
  }
}

export function buildBatch(plan, occurredAt) {
  assert(plan.status === 'READY', 'CORRECTION_PLAN_NOT_READY')
  const suffix = randomUUID()
  const boundary = `batch_${suffix}`
  const changeset = `changeset_${suffix}`
  const before = plan.before
  const audit = {
    jmpv2_paymentevidencekey: AUDIT_KEY, jmpv2_idempotencykey: AUDIT_KEY,
    jmpv2_agreementkey: AGREEMENT, jmpv2_eventkind: 'LEDGER_CORRECTION',
    jmpv2_eventstatus: 'CONFIRMED', jmpv2_occurredat: occurredAt,
    jmpv2_allocationsjson: JSON.stringify({ sourceInvoiceId: INVOICE, sourcePaymentId: INVOICE_PI,
      extraPaymentId: EXTRA_PI, correctedPaymentRowId: SEPTEMBER_PAYMENT, requirementId: SEPTEMBER,
      previousPaymentType: before.scheduled.jmpv2_paymenttype,
      previousRequirementStatus: before.september.jmpv2_obligationstatus,
      previousNextDue: before.agreement.jmpv2_nextduedate,
      correctedNextDue: plan.state.nextScheduledDueDate,
      preservedBalanceCents: plan.state.remainingBalanceCents,
      correctedBalanceVersion: plan.state.balanceVersion }),
  }
  const requests = [
    { method: 'POST', path: 'jmpv2_paymentevidences', body: audit },
    ...plan.patches.map((patch) => ({ method: 'PATCH', path: `${patch.entity}(${patch.id})`,
      etag: patch.etag, body: patch.body })),
  ]
  const lines = [`--${boundary}`, `Content-Type: multipart/mixed; boundary=${changeset}`, '']
  requests.forEach((request, index) => lines.push(`--${changeset}`, 'Content-Type: application/http',
    'Content-Transfer-Encoding: binary', `Content-ID: ${index + 1}`, '',
    `${request.method} /api/data/v9.2/${request.path} HTTP/1.1`, 'Content-Type: application/json;type=entry',
    ...(request.etag ? [`If-Match: ${request.etag}`] : []), '', JSON.stringify(request.body)))
  lines.push(`--${changeset}--`, `--${boundary}--`, '')
  return { boundary, body: lines.join('\r\n') }
}

async function dataverseGet(token, path) {
  const response = await fetch(`${API}/${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
  if (!response.ok) throw new Error(`DATAVERSE_READ_FAILED_${response.status}`)
  return response.json()
}

async function stripeGet(key, path) {
  const response = await fetch(`${STRIPE}/${path}`, { headers: { Authorization: `Bearer ${key}` } })
  if (!response.ok) throw new Error(`STRIPE_READ_FAILED_${response.status}`)
  return response.json()
}

async function readState(token, stripeKey) {
  const [agreement, september, scheduled, extra, requirements, payments, auditRows,
    invoice, invoicePayment, extraPayment] = await Promise.all([
    dataverseGet(token, `jmpv2_agreementrecords(${AGREEMENT})`),
    dataverseGet(token, `jmpv2_paymentrequirements(${SEPTEMBER})`),
    dataverseGet(token, `jmpv2_paymentevidences(${SEPTEMBER_PAYMENT})`),
    dataverseGet(token, `jmpv2_paymentevidences(${EXTRA_PAYMENT})`),
    dataverseGet(token, `jmpv2_paymentrequirements?$filter=jmpv2_agreementkey eq '${AGREEMENT}'`),
    dataverseGet(token, `jmpv2_paymentevidences?$filter=jmpv2_agreementkey eq '${AGREEMENT}'`),
    dataverseGet(token, `jmpv2_paymentevidences?$filter=jmpv2_paymentevidencekey eq '${AUDIT_KEY}'`),
    stripeGet(stripeKey, `invoices/${INVOICE}`), stripeGet(stripeKey, `payment_intents/${INVOICE_PI}`),
    stripeGet(stripeKey, `payment_intents/${EXTRA_PI}`),
  ])
  assert(!requirements['@odata.nextLink'] && !payments['@odata.nextLink'] && !auditRows['@odata.nextLink'],
    'LEDGER_READ_INCOMPLETE')
  assert(auditRows.value.length <= 1, 'DUPLICATE_CORRECTION_AUDIT')
  const rows = payments.value.map((row) => row.jmpv2_paymentevidenceid === SEPTEMBER_PAYMENT ? scheduled :
    row.jmpv2_paymentevidenceid === EXTRA_PAYMENT ? extra : row)
  return { agreement, requirements: requirements.value.map((row) => row.jmpv2_paymentrequirementid === SEPTEMBER ? september : row),
    payments: rows, audit: auditRows.value[0] || null, invoice, invoicePayment, extraPayment }
}

async function main() {
  const mode = process.argv[2]
  assert(['--dry-run', '--execute'].includes(mode), 'USAGE_DRY_RUN_OR_EXECUTE')
  const token = process.env.DATAVERSE_ACCESS_TOKEN
  const stripeKey = process.env.STRIPE_SECRET_KEY
  assert(token && stripeKey && /^(sk|rk)_live_/.test(stripeKey), 'PRODUCTION_CREDENTIALS_REQUIRED')
  const current = await readState(token, stripeKey)
  const plan = planCorrection(current)
  await mkdir(EVIDENCE, { recursive: true })
  const stamp = new Date().toISOString().replaceAll(':', '-')
  const evidencePath = `${EVIDENCE}/${stamp}`
  await writeFile(`${evidencePath}-before.json`, JSON.stringify({ readAt: new Date().toISOString(),
    agreement: current.agreement, requirements: current.requirements, payments: current.payments,
    audit: current.audit, provider: plan.before?.provider || null }, null, 2))
  if (plan.status === 'ALREADY_APPLIED') {
    console.log(JSON.stringify({ status: plan.status, beforeEvidence: `${evidencePath}-before.json` }))
    return
  }
  await writeFile(`${evidencePath}-plan.json`, JSON.stringify({ status: plan.status,
    modelState: plan.state, patches: plan.patches }, null, 2))
  if (mode === '--dry-run') {
    console.log(JSON.stringify({ status: 'DRY_RUN_READY', beforeEvidence: `${evidencePath}-before.json`,
      planEvidence: `${evidencePath}-plan.json` }))
    return
  }
  const batch = buildBatch(plan, new Date().toISOString())
  const response = await fetch(`${API}/$batch`, { method: 'POST', headers: { Authorization: `Bearer ${token}`,
    Accept: 'application/json', 'Content-Type': `multipart/mixed; boundary=${batch.boundary}` }, body: batch.body })
  const responseText = await response.text()
  if (!response.ok || /HTTP\/1\.1 [45]\d\d/.test(responseText)) throw new Error(`ATOMIC_CORRECTION_FAILED_${response.status}`)
  const after = await readState(token, stripeKey)
  const replay = planCorrection(after)
  assert(replay.status === 'ALREADY_APPLIED' && after.agreement.jmpv2_balanceversion === plan.state.balanceVersion &&
    after.agreement.jmpv2_currentbalancecents === 129935, 'CORRECTION_READBACK_FAILED')
  await writeFile(`${evidencePath}-after.json`, JSON.stringify({ readAt: new Date().toISOString(),
    agreement: after.agreement, requirements: after.requirements, payments: after.payments,
    audit: after.audit, replayStatus: replay.status }, null, 2))
  console.log(JSON.stringify({ status: 'CORRECTED', beforeEvidence: `${evidencePath}-before.json`,
    planEvidence: `${evidencePath}-plan.json`, afterEvidence: `${evidencePath}-after.json`,
    replayStatus: replay.status }))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1 })
}
