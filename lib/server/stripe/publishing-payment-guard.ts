import { createHash, randomUUID } from 'node:crypto'
import { AsyncLocalStorage } from 'node:async_hooks'

const activePaymentClaim = new AsyncLocalStorage<{ agreementId: string; active: boolean }>()

export function assertAgreementPaymentGuard(agreementId: string) {
  const current = activePaymentClaim.getStore()
  if (!current?.active || current.agreementId !== normalizePaymentAgreementId(agreementId)) {
    throw new Error('PAYMENT_GUARD_CONTEXT_REQUIRED')
  }
}

export const PAYMENT_GUARD_VERSION = 'JMP_AGREEMENT_PAYMENT_GUARD_V1'
export type PaymentMutationKind = 'PAYMENT' | 'REFUND' | 'COLLECTION' | 'CHECKOUT' | 'SCHEDULE_ADJUSTMENT'
export type PaymentMutation = { kind: PaymentMutationKind; operationId: string; payload: unknown }
export type PaymentClaim = {
  version: typeof PAYMENT_GUARD_VERSION
  agreementId: string
  claimId: string
  operationId: string
  kind: PaymentMutationKind
  payloadHash: string
  status: 'HELD' | 'RECOVERY_REQUIRED' | 'RELEASED'
  acquiredAt: string
  updatedAt: string
  recovery?: PaymentRecoveryEvidence
}
export type StoredPaymentClaim = { claim: PaymentClaim; versionToken: string }
export type PaymentRecoveryEvidence = {
  authorityReference: string
  producerQuiescenceReference: string
  providerReadbackReference: string
  ledgerReadbackReference: string
  disposition: 'NO_EFFECT_PROVEN' | 'EFFECTS_RECONCILED'
}
export interface PaymentGuardStore {
  bindOperation(agreementId: string, operation: PaymentMutation, payloadHash: string): Promise<void>
  read(agreementId: string): Promise<StoredPaymentClaim | null>
  // Append exactly one immutable successor, which is also the transition receipt.
  compareExchange(expected: StoredPaymentClaim | null, next: PaymentClaim): Promise<boolean>
}

export function paymentMutationHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')
}

export function normalizePaymentAgreementId(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error('PAYMENT_GUARD_AGREEMENT_ID_INVALID')
  }
  return value.toLowerCase()
}

export class AgreementPaymentGuard {
  constructor(private readonly store: PaymentGuardStore, private readonly now = () => new Date().toISOString()) {}

  async run<T>(agreementId: string, operation: PaymentMutation, work: () => Promise<T>): Promise<T> {
    agreementId = normalizePaymentAgreementId(agreementId)
    if (!operation.operationId?.trim() || operation.operationId.length > 200 ||
        !['PAYMENT', 'REFUND', 'COLLECTION', 'CHECKOUT', 'SCHEDULE_ADJUSTMENT'].includes(operation.kind)) {
      throw new Error('PAYMENT_GUARD_OPERATION_INVALID')
    }
    const payloadHash = paymentMutationHash(operation.payload)
    await this.store.bindOperation(agreementId, operation, payloadHash)
    const previous = await this.store.read(agreementId)
    if (previous && previous.claim.status !== 'RELEASED') {
      throw new Error(previous.claim.status === 'RECOVERY_REQUIRED' ? 'PAYMENT_GUARD_RECOVERY_REQUIRED' : 'PAYMENT_GUARD_BUSY')
    }
    const now = this.now()
    const claim: PaymentClaim = {
      version: PAYMENT_GUARD_VERSION, agreementId, claimId: randomUUID(),
      operationId: operation.operationId, kind: operation.kind,
      payloadHash, status: 'HELD', acquiredAt: now, updatedAt: now,
    }
    if (!await this.store.compareExchange(previous, claim)) throw new Error('PAYMENT_GUARD_BUSY')
    // An uncertain acquire response never permits work. Read back this exact owner before effects.
    const acquired = await this.owned(claim)
    const scope = { agreementId, active: true }
    try {
      const result = await activePaymentClaim.run(scope, work)
      scope.active = false
      const outcome = result as { requiresExclusiveRecovery?: boolean } | null
      const uncertain = outcome?.requiresExclusiveRecovery === true
      await this.transition(acquired, uncertain ? 'RECOVERY_REQUIRED' : 'RELEASED')
      return result
    } catch (error) {
      // No expiry/lease stealing: an in-flight Stripe request cannot be fenced by Dataverse.
      const current = await this.owned(claim)
      if (current.claim.status === 'HELD') await this.transition(current, 'RECOVERY_REQUIRED')
      throw error
    } finally {
      scope.active = false
    }
  }

  async readback(agreementId: string) {
    return this.store.read(normalizePaymentAgreementId(agreementId))
  }

  async recover(input: {
    agreementId: string
    claimId: string
    payloadHash: string
    evidence: PaymentRecoveryEvidence
    verify: (claim: PaymentClaim, evidence: PaymentRecoveryEvidence) => Promise<boolean>
  }) {
    const current = await this.store.read(normalizePaymentAgreementId(input.agreementId))
    if (!current || current.claim.claimId !== input.claimId || current.claim.payloadHash !== input.payloadHash) {
      throw new Error('PAYMENT_GUARD_RECOVERY_BINDING_MISMATCH')
    }
    if (current.claim.status === 'RELEASED') return { recovered: true, idempotent: true }
    const e = input.evidence
    if (![e.authorityReference, e.producerQuiescenceReference, e.providerReadbackReference, e.ledgerReadbackReference]
      .every((value) => typeof value === 'string' && value.trim().length > 0) ||
      !['NO_EFFECT_PROVEN', 'EFFECTS_RECONCILED'].includes(e.disposition) ||
      !await input.verify(structuredClone(current.claim), structuredClone(e))) {
      throw new Error('PAYMENT_GUARD_RECOVERY_EVIDENCE_REQUIRED')
    }
    await this.transition(current, 'RELEASED', e)
    return { recovered: true, idempotent: false }
  }

  private async owned(claim: PaymentClaim): Promise<StoredPaymentClaim> {
    const row = await this.store.read(claim.agreementId)
    if (!row || !row.versionToken || row.claim.claimId !== claim.claimId || row.claim.payloadHash !== claim.payloadHash ||
        row.claim.operationId !== claim.operationId) throw new Error('PAYMENT_GUARD_OWNERSHIP_LOST')
    return row
  }

  private async transition(row: StoredPaymentClaim, status: PaymentClaim['status'], recovery?: PaymentRecoveryEvidence) {
    const next = { ...row.claim, status, updatedAt: this.now(), ...(recovery ? { recovery } : {}) }
    if (!await this.store.compareExchange(row, next)) throw new Error('PAYMENT_GUARD_OWNERSHIP_LOST')
    // A new owner may legitimately claim immediately after the atomic release+receipt commit.
    if (status === 'RELEASED') return
    const verified = await this.owned(next)
    if (verified.claim.status !== status) throw new Error('PAYMENT_GUARD_READBACK_MISMATCH')
  }
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]))
}

export function paymentGuardHttpStatus(reason: unknown): number {
  return typeof reason === 'string' && /^(PAYMENT_GUARD_(BUSY|RECOVERY_REQUIRED|OWNERSHIP_LOST|READBACK_MISMATCH)$|DATAVERSE_PAYMENT_GUARD_)/.test(reason) ? 503 : 422
}
