import { randomUUID, timingSafeEqual } from 'node:crypto'
import { AgreementPaymentGuard, PAYMENT_GUARD_VERSION, paymentMutationHash, type PaymentClaim, type PaymentGuardStore } from './publishing-payment-guard'

// No agreement record is created. This namespace is exclusively for guard metadata acceptance.
export const PAYMENT_GUARD_ACCEPTANCE_ID = '00000000-0000-4000-8000-000000000922'
const actions = ['RUN', 'FAIL', 'ABANDON', 'RECOVER'] as const
export type GuardAcceptanceRequest = { action: typeof actions[number]; runId: string; claimId?: string }

export function guardAcceptanceAuthorized(provided: string | null, env: NodeJS.ProcessEnv = process.env) {
  const expected = env.JM1_PAYMENT_EVENT_RECOVERY_KEY || ''
  if (env.JMP_PAYMENT_GUARD_ACCEPTANCE_ENABLED !== 'true' || !provided || !expected) return false
  const a = Buffer.from(provided), b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function parseGuardAcceptanceRequest(value: unknown): GuardAcceptanceRequest {
  const row = value as GuardAcceptanceRequest
  if (!row || typeof row !== 'object' || Array.isArray(row) ||
      Object.keys(row).some((key) => !['action', 'runId', 'claimId'].includes(key)) ||
      !actions.includes(row.action) || typeof row.runId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(row.runId) ||
      (row.action === 'RECOVER' && (typeof row.claimId !== 'string' || !row.claimId)) ||
      (row.action !== 'RECOVER' && row.claimId !== undefined)) throw new Error('PAYMENT_GUARD_ACCEPTANCE_INPUT_INVALID')
  return row
}

const fixturePayload = (action: string) => ({ fixture: PAYMENT_GUARD_ACCEPTANCE_ID, action, businessEffects: 'NONE' })

export async function executeGuardAcceptance(input: GuardAcceptanceRequest, dependencies: {
  store: PaymentGuardStore
  assertNonBusinessNamespace: () => Promise<void>
  delay?: () => Promise<void>
}) {
  await dependencies.assertNonBusinessNamespace()
  const guard = new AgreementPaymentGuard(dependencies.store)
  const operationId = `guard-acceptance:${input.runId}`
  if (input.action === 'RECOVER') {
    const current = await guard.readback(PAYMENT_GUARD_ACCEPTANCE_ID)
    if (!current || current.claim.claimId !== input.claimId || current.claim.operationId !== operationId) {
      throw new Error('PAYMENT_GUARD_ACCEPTANCE_RECOVERY_BINDING_MISMATCH')
    }
    const claim = current.claim
    // Only the deliberate metadata-only orphan or a completed fixture failure is recoverable here.
    const isAbandoned = claim.payloadHash === paymentMutationHash(fixturePayload('ABANDON'))
    const isFailed = claim.status === 'RECOVERY_REQUIRED' && claim.payloadHash === paymentMutationHash(fixturePayload('FAIL'))
    if (claim.kind !== 'SCHEDULE_ADJUSTMENT' || (!isAbandoned && !isFailed)) {
      throw new Error('PAYMENT_GUARD_ACCEPTANCE_RECOVERY_DENIED')
    }
    await guard.recover({ agreementId: PAYMENT_GUARD_ACCEPTANCE_ID, claimId: claim.claimId, payloadHash: claim.payloadHash,
      evidence: {
        authorityReference: 'JM1-VERTICAL-OPERATING-COMMISSIONING-001:GUARD_ONLY_ACCEPTANCE',
        producerQuiescenceReference: `${operationId}:${isAbandoned ? 'NO_WORK_CALLBACK_CREATED' : 'FIXTURE_CALLBACK_FAILED'}`,
        providerReadbackReference: 'FIXTURE_HAS_NO_PROVIDER_ADAPTER', ledgerReadbackReference: 'FIXTURE_HAS_NO_BUSINESS_LEDGER_WRITE',
        disposition: 'NO_EFFECT_PROVEN',
      }, verify: async (row) => row.agreementId === PAYMENT_GUARD_ACCEPTANCE_ID && row.claimId === claim.claimId &&
        row.payloadHash === claim.payloadHash && row.operationId === operationId,
    })
  } else if (input.action === 'ABANDON') {
    const payload = fixturePayload('ABANDON')
    await dependencies.store.bindOperation(PAYMENT_GUARD_ACCEPTANCE_ID, { kind: 'SCHEDULE_ADJUSTMENT', operationId, payload }, paymentMutationHash(payload))
    const previous = await guard.readback(PAYMENT_GUARD_ACCEPTANCE_ID)
    if (previous?.claim.status !== undefined && previous.claim.status !== 'RELEASED') throw new Error('PAYMENT_GUARD_BUSY')
    const now = new Date().toISOString()
    const claim: PaymentClaim = { version: PAYMENT_GUARD_VERSION, agreementId: PAYMENT_GUARD_ACCEPTANCE_ID,
      claimId: randomUUID(), kind: 'SCHEDULE_ADJUSTMENT', operationId, payloadHash: paymentMutationHash(payload),
      status: 'HELD', acquiredAt: now, updatedAt: now }
    if (!await dependencies.store.compareExchange(previous, claim)) throw new Error('PAYMENT_GUARD_BUSY')
  } else {
    await guard.run(PAYMENT_GUARD_ACCEPTANCE_ID, { kind: 'SCHEDULE_ADJUSTMENT', operationId, payload: fixturePayload(input.action) }, async () => {
      if (input.action === 'FAIL') throw new Error('PAYMENT_GUARD_ACCEPTANCE_EXPECTED_FAILURE')
      await (dependencies.delay || (() => new Promise<void>((resolve) => setTimeout(resolve, 4000))))()
      return { ok: true }
    })
  }
  return { guardVersion: PAYMENT_GUARD_VERSION, businessEffects: 0, readback: await guard.readback(PAYMENT_GUARD_ACCEPTANCE_ID) }
}
