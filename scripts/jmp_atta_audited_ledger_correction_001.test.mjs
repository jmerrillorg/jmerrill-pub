import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calculateAgreementPaymentState } from '../lib/server/stripe/publishing-agreement-payment.ts'
import { buildBatch, planCorrection } from './jmp_atta_audited_ledger_correction_001.mjs'

const agreementId = '131da28b-919c-f111-b8dc-6045bdd69435'
const authorId = '60937251-d589-f111-ab10-6045bdd69678'
const titleId = 'ca68c994-fd89-f111-ab10-00224820105b'
const septemberId = '3226b152-3203-5eb3-bfc5-2992a9397e45'
const octoberId = '479cb4f2-a610-5217-970a-c023ba64111f'
const septemberPaymentId = '415caaac-c6b9-f111-aaac-000d3a9eacee'
const extraPaymentId = '3540f4cc-d0b9-f111-aaac-000d3a14673b'
const invoiceId = 'in_1UHjinJCiOVFpgYutHBdj0l4'
const invoicePaymentId = 'pi_3UHkfeJCiOVFpgYu12GS4bwY'
const extraPaymentIntentId = 'pi_3UJyOeJCiOVFpgYu1UppQVP8'
const scheduleId = 'sub_sched_1U6UvvJCiOVFpgYuik8ptyYp'

function fixture() {
  const requirements = Array.from({ length: 8 }, (_, index) => ({
    '@odata.etag': `W/"${100 + index}"`,
    jmpv2_paymentrequirementid: index === 1 ? septemberId : index === 2 ? octoberId :
      `00000000-0000-0000-0000-00000000000${index}`,
    jmpv2_installmentsequence: index + 1,
    jmpv2_amountcents: index === 7 ? 25983 : 25988,
    jmpv2_duedate: new Date(Date.UTC(index < 5 ? 2026 : 2027, (7 + index) % 12, 27, 12, 18, 59)).toISOString(),
    jmpv2_obligationstatus: index === 0 ? 'SATISFIED' : 'SCHEDULED',
    jmpv2_stripeinvoiceid: index === 1 ? invoiceId : null,
  }))
  requirements[0].jmpv2_duedate = '2026-08-27T12:18:59Z'
  requirements[1].jmpv2_duedate = '2026-09-27T12:18:59Z'
  requirements[2].jmpv2_duedate = '2026-10-27T12:18:59Z'
  const payments = [
    { jmpv2_paymentevidenceid: '81996aa3-6eb6-f111-aaac-000d3a9eacee',
      jmpv2_eventkind: 'PAYMENT', jmpv2_eventstatus: 'CONFIRMED',
      jmpv2_paymenttype: 'SCHEDULED_INSTALLMENT', jmpv2_stripepaymentid: 'pi_august',
      jmpv2_stripeeventid: 'evt_august', jmpv2_grossamountcents: 25988,
      jmpv2_allocationsjson: JSON.stringify([{ kind: 'CURRENT_SCHEDULED_INSTALLMENT', amountCents: 25988,
        scheduledObligationId: requirements[0].jmpv2_paymentrequirementid }]), jmpv2_occurredat: '2026-08-21T16:35:16Z' },
    { '@odata.etag': 'W/"203"', jmpv2_paymentevidenceid: septemberPaymentId,
      jmpv2_eventkind: 'PAYMENT', jmpv2_eventstatus: 'CONFIRMED',
      jmpv2_paymenttype: 'ADDITIONAL_PAYMENT', jmpv2_stripepaymentid: invoicePaymentId,
      jmpv2_stripeeventid: 'evt_september', jmpv2_stripeinvoiceid: invoiceId,
      jmpv2_grossamountcents: 25988, jmpv2_balancebeforecents: 181911,
      jmpv2_balanceaftercents: 155923, jmpv2_scheduledallocationcents: 0,
      jmpv2_additionalallocationcents: 25988,
      jmpv2_allocationsjson: JSON.stringify([{ kind: 'ADDITIONAL_PAYMENT', amountCents: 25988 }]),
      jmpv2_occurredat: '2026-09-24T12:13:26Z' },
    { jmpv2_paymentevidenceid: extraPaymentId, jmpv2_eventkind: 'PAYMENT',
      jmpv2_eventstatus: 'CONFIRMED', jmpv2_paymenttype: 'ADDITIONAL_PAYMENT',
      jmpv2_stripepaymentid: extraPaymentIntentId, jmpv2_stripeinvoiceid: null,
      jmpv2_stripeeventid: 'evt_extra', jmpv2_grossamountcents: 25988,
      jmpv2_additionalallocationcents: 25988,
      jmpv2_allocationsjson: JSON.stringify([{ kind: 'ADDITIONAL_PAYMENT', amountCents: 25988 }]),
      jmpv2_occurredat: '2026-09-26T17:36:29Z' },
  ]
  const agreement = { '@odata.etag': 'W/"300"', jmpv2_agreementrecordid: agreementId,
    jmpv2_agreementkey: agreementId, jmpv2_authoridentity: authorId, jmpv2_titleid: titleId,
    jmpv2_paymentscheduleid: scheduleId, jmpv2_stripecustomerid: 'cus_fixture',
    jmpv2_paymentledgerstatus: 'ACTIVE', jmpv2_totalagreementamountcents: 207899,
    jmpv2_currentbalancecents: 129935, jmpv2_scheduledinstallmentamountcents: 25988,
    jmpv2_nextduedate: requirements[1].jmpv2_duedate,
    jmpv2_nextpaymentat: requirements[1].jmpv2_duedate }
  const snapshot = { agreementId, authorId, titleId, paymentScheduleId: scheduleId,
    currency: 'usd', contractualBalanceCents: 207899, normalInstallmentCents: 25988,
    nextScheduledDueDate: agreement.jmpv2_nextduedate,
    scheduledObligations: requirements.map((r) => ({ obligationId: r.jmpv2_paymentrequirementid,
      dueDate: r.jmpv2_duedate, amountCents: r.jmpv2_amountcents, status: r.jmpv2_obligationstatus })),
    payments: payments.map((p) => ({ paymentId: p.jmpv2_stripepaymentid, eventId: p.jmpv2_stripeeventid,
      paymentType: p.jmpv2_paymenttype, amountCents: p.jmpv2_grossamountcents,
      status: 'SUCCEEDED', allocations: JSON.parse(p.jmpv2_allocationsjson), paidAt: p.jmpv2_occurredat })), refunds: [] }
  agreement.jmpv2_balanceversion = calculateAgreementPaymentState(snapshot).balanceVersion
  return { agreement, requirements, payments, audit: null,
    invoice: { id: invoiceId, livemode: true, status: 'paid', amount_paid: 25988,
      amount_remaining: 0, payment_intent: invoicePaymentId,
      customer: 'cus_fixture', subscription: 'sub_1U6UvvJCiOVFpgYuwpqG6sFe' },
    invoicePayment: { id: invoicePaymentId, status: 'succeeded', amount_received: 25988, invoice: invoiceId },
    extraPayment: { id: extraPaymentIntentId, livemode: true, status: 'succeeded',
      amount_received: 25988, invoice: null, customer: 'cus_fixture',
      metadata: { jm1_author_id: authorId, jm1_title_id: titleId,
        jm1_agreement_id: agreementId, jm1_payment_schedule_id: scheduleId,
        jm1_payment_type: 'ADDITIONAL_PAYMENT' } } }
}

test('plans only the September ledger correction while October remains due', () => {
  const plan = planCorrection(fixture())
  assert.equal(plan.status, 'READY')
  assert.equal(plan.state.remainingBalanceCents, 129935)
  assert.equal(plan.state.nextScheduledDueDate, '2026-10-27T12:18:59Z')
  assert.deepEqual(plan.patches.map((p) => p.entity), [
    'jmpv2_paymentevidences', 'jmpv2_paymentrequirements', 'jmpv2_agreementrecords'])
  const batch = buildBatch(plan, '2026-10-02T12:00:00Z')
  assert.equal((batch.body.match(/Content-ID: /g) || []).length, 4)
  assert.equal((batch.body.match(/If-Match: W\//g) || []).length, 3)
  assert.match(batch.body, /LEDGER_CORRECTION/)
  assert.doesNotMatch(batch.body, /STRIPE_SECRET_KEY|author communication|subscription_schedules/)
})

test('paid provider invoice is mandatory and additional principal remains distinct', () => {
  const input = fixture()
  input.invoice.status = 'open'
  assert.throws(() => planCorrection(input), /STRIPE_INVOICE_PROOF_FAILED/)
  const second = fixture()
  second.extraPayment.invoice = invoiceId
  assert.throws(() => planCorrection(second), /STRIPE_EXTRA_PAYMENT_PROOF_FAILED/)
})

test('stale balance version and ambiguous partial correction fail closed', () => {
  const input = fixture()
  input.agreement.jmpv2_balanceversion = 'stale'
  assert.throws(() => planCorrection(input), /PRE_CORRECTION_MODEL_DRIFT/)
  const second = fixture()
  second.requirements[1].jmpv2_obligationstatus = 'SATISFIED'
  assert.throws(() => planCorrection(second), /PRE_CORRECTION_STATE_DRIFT/)
})

test('journaled replay returns existing state and does not prepare another write', () => {
  const input = fixture()
  const plan = planCorrection(input)
  Object.assign(input.payments[1], plan.patches[0].body)
  Object.assign(input.requirements[1], plan.patches[1].body)
  Object.assign(input.agreement, plan.patches[2].body)
  input.audit = { jmpv2_paymentevidencekey: 'JMP-ATTA-AUDITED-LEDGER-CORRECTION-001',
    jmpv2_agreementkey: agreementId, jmpv2_eventkind: 'LEDGER_CORRECTION',
    jmpv2_eventstatus: 'CONFIRMED', jmpv2_allocationsjson: JSON.stringify({
      correctedPaymentRowId: septemberPaymentId, requirementId: septemberId,
      correctedBalanceVersion: plan.state.balanceVersion,
      correctedNextDue: plan.state.nextScheduledDueDate }) }
  assert.deepEqual(planCorrection(input), { status: 'ALREADY_APPLIED' })
  input.requirements[1].jmpv2_obligationstatus = 'SCHEDULED'
  assert.throws(() => planCorrection(input), /AUDITED_REPLAY_STATE_MISMATCH/)
})
