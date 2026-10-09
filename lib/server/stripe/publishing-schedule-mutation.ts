import { paymentMutationHash } from './publishing-payment-guard'
import type { PublishingPaymentLedger } from './publishing-payment-runtime'

// The financial owner supplies its reviewed provider/projection plan. This is not a second billing engine.
export async function executeGovernedScheduleMutation<T>(input: {
  agreementId: string
  operationId: string
  approvedPayloadHash: string
  approvalReference: string
  payload: unknown
  ledger: PublishingPaymentLedger
  verifyAuthority: () => Promise<boolean>
  readVerifiedCompletion: () => Promise<{ verified: true; result: T } | null>
  freshPreflight: () => Promise<boolean>
  executeAndVerify: () => Promise<{ verified: true; result: T }>
}) {
  if (!input.approvalReference?.trim() || !/^[a-f0-9]{64}$/.test(input.approvedPayloadHash) ||
      paymentMutationHash(input.payload) !== input.approvedPayloadHash || !await input.verifyAuthority()) {
    throw new Error('SCHEDULE_MUTATION_AUTHORITY_REQUIRED')
  }
  return input.ledger.withAgreementMutation(input.agreementId, {
    kind: 'SCHEDULE_ADJUSTMENT', operationId: input.operationId,
    payload: { approvalReference: input.approvalReference, approvedPayloadHash: input.approvedPayloadHash, request: input.payload },
  }, async () => {
    const completed = await input.readVerifiedCompletion()
    if (completed) {
      if (completed.verified !== true) throw new Error('SCHEDULE_MUTATION_READBACK_REQUIRED')
      return completed.result
    }
    if (!await input.freshPreflight()) return { ok: false as const, reason: 'SCHEDULE_MUTATION_PREFLIGHT_CHANGED' }
    // Keep the claim through Stripe readback AND the audited Dataverse forward projection.
    // The owner must throw on timeout/ambiguous results; no release or alternative billing path is implied.
    const outcome = await input.executeAndVerify()
    if (outcome.verified !== true) throw new Error('SCHEDULE_MUTATION_READBACK_REQUIRED')
    return outcome.result
  })
}
