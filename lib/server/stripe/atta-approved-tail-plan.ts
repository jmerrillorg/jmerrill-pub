import { timingSafeEqual } from 'node:crypto'
import { paymentMutationHash } from './publishing-payment-guard'

export const ATTA_TAIL = {
  packet: 'JMP-ATTA-PROVIDER-SAFE-TAIL-ADJUSTMENT-001',
  approval: 'JM1-VERTICAL-OPERATING-COMMISSIONING-001',
  agreement: '131da28b-919c-f111-b8dc-6045bdd69435',
  author: '60937251-d589-f111-ab10-6045bdd69678', title: 'ca68c994-fd89-f111-ab10-00224820105b',
  customer: 'cus_V6iLQUvk68RyJB', subscription: 'sub_1U6UvvJCiOVFpgYuwpqG6sFe',
  schedule: 'sub_sched_1U6UvvJCiOVFpgYuik8ptyYp', apiVersion: '2019-10-17',
  key: 'jmp-atta-tail-001-5f21e19e2ec3556643f0a4830c469922',
  february: '3f772c61-bb04-5f7c-8aad-72c9125ccf04', march: '49badd1d-7ee7-570e-8dfd-9e5893401ac7',
  balance: 129935, originalVersion: 'c3ce8811a1fc8778a91c9a3c2326f98f',
  octoberDue: '2026-10-27T12:18:59Z',
} as const

export const ATTA_TAIL_PAYLOAD = {
  end_behavior: 'cancel', proration_behavior: 'none', phases: [
    { start_date: 1787228339, end_date: 1803125939,
      items: [{ price: 'price_1U6Uv7JCiOVFpgYuSMRNHTj5', quantity: 1 }], proration_behavior: 'none' },
    { start_date: 1803125939, end_date: 1805545139,
      items: [{ price: 'price_1U6Uv7JCiOVFpgYuWS8MTtNY', quantity: 1 }], proration_behavior: 'none' },
  ],
}

export function tailAssert(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(`ATTA_TAIL_${code}`)
}

export function tailAuthorized(key: string | null, env: NodeJS.ProcessEnv = process.env) {
  const expected = env.JM1_PAYMENT_EVENT_RECOVERY_KEY || ''
  if (env.JMP_ATTA_APPROVED_TAIL_ENABLED !== 'true' || !key || !expected) return false
  const a = Buffer.from(key), b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

// Retain all financial/configuration fields. Remove only transport metadata and expiring receipt URLs.
export function tailNormalize(value: any): any {
  if (Array.isArray(value)) {
    const items = value.map(tailNormalize)
    return items.every(x => x && typeof x === 'object' && typeof x.id === 'string')
      ? items.sort((a, b) => a.id.localeCompare(b.id)) : items
  }
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !key.startsWith('@odata.') && !['receipt_url', 'hosted_invoice_url', 'invoice_pdf'].includes(key))
    .map(([key, item]) => [key, tailNormalize(item)]))
}

export function tailBusinessRow(row: Record<string, any>) {
  return Object.fromEntries(Object.entries(row).filter(([key]) => key.startsWith('jmpv2_') || ['statecode', 'statuscode'].includes(key)))
}

export function tailSnapshotHashes(snapshot: Record<string, any>) {
  return Object.fromEntries(Object.entries(snapshot).map(([name, value]) => [name, paymentMutationHash(tailNormalize(value))]))
}

export function assertTailPreview(preview: any) {
  tailAssert(/^upcoming_/.test(preview.id) && preview.amount_due === 25988 && preview.total === 25988 &&
    preview.due_date === 1793103539 && preview.lines?.has_more === false && preview.lines.data.length === 1 &&
    preview.lines.data[0].proration === false && preview.lines.data[0].amount === 25988 &&
    preview.lines.data[0].period.start === 1792498739 && preview.lines.data[0].period.end === 1795177139,
  'OCTOBER_PREVIEW_MISMATCH')
}

export function assertTailIdentity(snapshot: Record<string, any>, after = false) {
  const a = snapshot.agreement, s = snapshot.subscription, p = snapshot.schedule
  tailAssert(a.jmpv2_agreementrecordid === ATTA_TAIL.agreement && a.jmpv2_authoridentity === ATTA_TAIL.author &&
    a.jmpv2_titleid === ATTA_TAIL.title && a.jmpv2_stripecustomerid === ATTA_TAIL.customer &&
    a.jmpv2_currentbalancecents === ATTA_TAIL.balance && a.jmpv2_totalagreementamountcents === 207899 &&
    a.jmpv2_nextduedate === ATTA_TAIL.octoberDue && a.jmpv2_nextpaymentat === ATTA_TAIL.octoberDue,
  'AGREEMENT_DRIFT')
  tailAssert(s.id === ATTA_TAIL.subscription && s.customer === ATTA_TAIL.customer && s.schedule === ATTA_TAIL.schedule &&
    s.status === 'active' && s.livemode === true && s.collection_method === 'send_invoice' && s.days_until_due === 7 &&
    !s.pending_update && !s.pause_collection && !s.cancel_at && !s.cancel_at_period_end &&
    p.id === ATTA_TAIL.schedule && p.subscription === s.id && p.status === 'active' && p.end_behavior === 'cancel',
  'PROVIDER_IDENTITY_OR_TERMS_DRIFT')
  tailAssert(snapshot['payment-intents'].length === 3 && snapshot['payment-intents'].every((x: any) => x.status === 'succeeded') &&
    snapshot['payment-intents'].reduce((sum: number, x: any) => sum + x.amount_received, 0) === 77964 &&
    snapshot.invoices.length === 2 && snapshot.invoices.every((x: any) => x.status === 'paid' && x.amount_remaining === 0),
  'PAYMENT_DRIFT')
  const feb = snapshot.requirements.find((x: any) => x.jmpv2_paymentrequirementid === ATTA_TAIL.february)
  const mar = snapshot.requirements.find((x: any) => x.jmpv2_paymentrequirementid === ATTA_TAIL.march)
  tailAssert(snapshot.requirements.length === 8 && feb?.jmpv2_obligationstatus === 'SCHEDULED' &&
    feb.jmpv2_amountcents === (after ? 25983 : 25988) && mar?.jmpv2_amountcents === 25983 &&
    mar.jmpv2_obligationstatus === (after ? 'CANCELLED' : 'SCHEDULED'), 'FUTURE_PROJECTION_DRIFT')
  if (!after) tailAssert(a.jmpv2_balanceversion === ATTA_TAIL.originalVersion, 'BALANCE_VERSION_DRIFT')
  if (after) {
    const future = snapshot.requirements.filter((x: any) => x.jmpv2_obligationstatus === 'SCHEDULED')
    tailAssert(future.length === 5 && future.reduce((sum: number, x: any) => sum + x.jmpv2_amountcents, 0) === ATTA_TAIL.balance,
      'CENTS_CONSERVATION_FAILED')
  }
}

export function expectedTailProviderSnapshot(before: Record<string, any>) {
  const result = structuredClone(before)
  for (const s of [result.schedule, ...result.schedules]) {
    tailAssert(s.id === ATTA_TAIL.schedule && s.phases.length === 2, 'SCHEDULE_COUNT_DRIFT')
    for (let i = 0; i < 2; i++) {
      s.phases[i].start_date = ATTA_TAIL_PAYLOAD.phases[i].start_date
      s.phases[i].end_date = ATTA_TAIL_PAYLOAD.phases[i].end_date
      s.phases[i].proration_behavior = 'none'
    }
    s.current_phase.end_date = ATTA_TAIL_PAYLOAD.phases[0].end_date
  }
  return result
}
