import { createHash } from 'node:crypto'
import type { DataverseServerConfig } from '../dataverse-server'
import { getDataverseRuntimeAccessToken } from '../publisher-runtime-auth'
import { PAYMENT_GUARD_VERSION, normalizePaymentAgreementId, paymentMutationHash, type PaymentMutation, type PaymentClaim, type PaymentGuardStore, type StoredPaymentClaim } from './publishing-payment-guard'

const ENTITY = 'jmpv2_paymentevidences'
type Node = { revision: number; parentHash: string | null; claim: PaymentClaim }

export function paymentGuardRowId(agreementId: string, revision: number) {
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('PAYMENT_GUARD_REVISION_INVALID')
  return hashGuid(createHash('sha256').update(`${PAYMENT_GUARD_VERSION}:${normalizePaymentAgreementId(agreementId)}:${revision}`).digest('hex'))
}

function hashGuid(hex: string) {
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

export class DataversePaymentGuardStore implements PaymentGuardStore {
  constructor(private readonly config: DataverseServerConfig,
    private readonly token = () => getDataverseRuntimeAccessToken(config.resourceUrl)) {}

  async bindOperation(agreementId: string, operation: PaymentMutation, payloadHash: string) {
    const identity = { version: PAYMENT_GUARD_VERSION, agreementId: normalizePaymentAgreementId(agreementId),
      kind: operation.kind, operationId: operation.operationId, payloadHash }
    const id = hashGuid(paymentMutationHash({ ...identity, payloadHash: null }))
    const existing = await this.readRow(id)
    if (!existing) {
      await this.createOnly({
        jmpv2_paymentevidenceid: id, jmpv2_paymentevidencekey: `payment-operation:${id}`,
        jmpv2_idempotencykey: `payment-operation:${id}`, jmpv2_agreementkey: identity.agreementId,
        jmpv2_eventkind: 'PAYMENT_MUTATION_INTENT', jmpv2_eventstatus: 'BOUND',
        jmpv2_allocationsjson: JSON.stringify(identity), jmpv2_occurredat: new Date().toISOString(),
      })
    }
    const row = existing || await this.readRow(id)
    if (!row || row.jmpv2_eventkind !== 'PAYMENT_MUTATION_INTENT' ||
        paymentMutationHash(JSON.parse(row.jmpv2_allocationsjson)) !== paymentMutationHash(identity)) {
      throw new Error('PAYMENT_GUARD_OPERATION_REPLAY_MISMATCH')
    }
  }

  async read(agreementId: string): Promise<StoredPaymentClaim | null> {
    agreementId = normalizePaymentAgreementId(agreementId)
    const base = `${this.config.webApiBaseUrl}/${ENTITY}`
    const query = new URLSearchParams({
      $select: 'jmpv2_paymentevidenceid,jmpv2_agreementkey,jmpv2_eventkind,jmpv2_eventstatus,jmpv2_allocationsjson',
      $filter: `jmpv2_agreementkey eq '${agreementId}' and jmpv2_eventkind eq 'PAYMENT_MUTATION_GUARD'`,
    })
    let next: string | null = `${base}?${query}`
    const seen = new Set<string>(), nodes: Node[] = []
    while (next) {
      const url = new URL(next)
      if (url.origin !== new URL(base).origin || url.pathname !== new URL(base).pathname || seen.has(next) || seen.size >= 100) {
        throw new Error('DATAVERSE_PAYMENT_GUARD_PAGINATION_INVALID')
      }
      seen.add(next)
      const response = await this.get(next)
      if (!response.ok) throw new Error(`DATAVERSE_PAYMENT_GUARD_READ_FAILED_${response.status}`)
      const body = await response.json()
      if (!Array.isArray(body.value)) throw new Error('DATAVERSE_PAYMENT_GUARD_CORRUPT')
      for (const row of body.value) nodes.push(parseNode(row, agreementId))
      next = body['@odata.nextLink'] || null
    }
    nodes.sort((a, b) => a.revision - b.revision)
    let parentHash: string | null = null
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      if (node.revision !== i + 1 || node.parentHash !== parentHash) throw new Error('DATAVERSE_PAYMENT_GUARD_CHAIN_INVALID')
      validateTransition(i ? nodes[i - 1].claim : null, node.claim)
      parentHash = paymentMutationHash(node)
    }
    const last = nodes.at(-1)
    return last ? { claim: last.claim, versionToken: `${last.revision}:${parentHash}` } : null
  }

  async compareExchange(expected: StoredPaymentClaim | null, next: PaymentClaim) {
    const match = expected?.versionToken.match(/^([1-9]\d*):([a-f0-9]{64})$/)
    if (expected && (!match || expected.claim.agreementId !== next.agreementId)) {
      throw new Error('DATAVERSE_PAYMENT_GUARD_VERSION_REQUIRED')
    }
    validateTransition(expected?.claim || null, next)
    const revision = expected ? Number(match![1]) + 1 : 1
    const node: Node = { revision, parentHash: expected ? match![2] : null, claim: next }
    // Every contender for revision N creates the same primary ID. The winning row is its immutable receipt.
    // Never PATCH financial evidence or grant broader evidence-write access.
    return this.createOnly({
      jmpv2_paymentevidenceid: paymentGuardRowId(next.agreementId, revision),
      jmpv2_paymentevidencekey: `payment-guard:${next.agreementId}:${revision}`,
      jmpv2_idempotencykey: `payment-guard:${next.agreementId}:${revision}`,
      jmpv2_agreementkey: next.agreementId, jmpv2_eventkind: 'PAYMENT_MUTATION_GUARD',
      jmpv2_eventstatus: next.status, jmpv2_occurredat: next.updatedAt, jmpv2_allocationsjson: JSON.stringify(node),
    })
  }

  private async get(url: string) {
    return fetch(url, { headers: { Authorization: `Bearer ${await this.token()}`, Accept: 'application/json' }, cache: 'no-store' })
  }

  private async readRow(id: string) {
    const response = await this.get(`${this.config.webApiBaseUrl}/${ENTITY}(${id})?$select=jmpv2_eventkind,jmpv2_allocationsjson`)
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`DATAVERSE_PAYMENT_GUARD_READ_FAILED_${response.status}`)
    return response.json()
  }

  private async createOnly(payload: Record<string, unknown>) {
    const response = await fetch(`${this.config.webApiBaseUrl}/${ENTITY}`, {
      method: 'POST', headers: { Authorization: `Bearer ${await this.token()}`, Accept: 'application/json',
        'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(payload), cache: 'no-store',
    })
    if (response.ok) {
      const body = await response.json()
      if (body.jmpv2_paymentevidenceid !== payload.jmpv2_paymentevidenceid ||
          body.jmpv2_allocationsjson !== payload.jmpv2_allocationsjson) throw new Error('DATAVERSE_PAYMENT_GUARD_WRITE_UNCERTAIN')
      return true
    }
    // Dataverse can report duplicate primary keys as 400; exact readback distinguishes contention.
    if ([400, 409, 412].includes(response.status) && await this.readRow(String(payload.jmpv2_paymentevidenceid))) return false
    throw new Error(`DATAVERSE_PAYMENT_GUARD_WRITE_UNCERTAIN_${response.status}`)
  }
}

function parseNode(row: Record<string, any>, agreementId: string): Node {
  let node: Node
  try { node = JSON.parse(row.jmpv2_allocationsjson) } catch { throw new Error('DATAVERSE_PAYMENT_GUARD_CORRUPT') }
  const claim = node?.claim
  if (!claim || claim.version !== PAYMENT_GUARD_VERSION || claim.agreementId !== agreementId ||
      row.jmpv2_agreementkey !== agreementId || row.jmpv2_eventkind !== 'PAYMENT_MUTATION_GUARD' ||
      row.jmpv2_eventstatus !== claim.status || !['HELD', 'RECOVERY_REQUIRED', 'RELEASED'].includes(claim.status) ||
      !claim.claimId || !claim.operationId || !/^[a-f0-9]{64}$/.test(claim.payloadHash) ||
      !Number.isFinite(Date.parse(claim.acquiredAt)) || !Number.isFinite(Date.parse(claim.updatedAt)) ||
      row.jmpv2_paymentevidenceid !== paymentGuardRowId(agreementId, node.revision)) {
    throw new Error('DATAVERSE_PAYMENT_GUARD_CORRUPT')
  }
  return node
}

function validateTransition(previous: PaymentClaim | null, next: PaymentClaim) {
  if (!previous || previous.status === 'RELEASED') {
    if (next.status !== 'HELD' || next.claimId === previous?.claimId || next.recovery) throw new Error('PAYMENT_GUARD_TRANSITION_INVALID')
    return
  }
  if (next.status === 'HELD' || next.status === previous.status ||
      ['claimId', 'agreementId', 'operationId', 'kind', 'payloadHash', 'acquiredAt', 'version']
        .some((key) => previous[key as keyof PaymentClaim] !== next[key as keyof PaymentClaim]) ||
      (previous.status === 'RECOVERY_REQUIRED' && !next.recovery)) throw new Error('PAYMENT_GUARD_TRANSITION_INVALID')
}
