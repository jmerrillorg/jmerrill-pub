import { createHash } from 'node:crypto'
import { BlobServiceClient } from '@azure/storage-blob'
import type { ManuscriptUploadCandidate, StoredManuscriptArtifact } from './manuscriptUpload'

type State = {
  schema: 'CONTINUATION_CUSTODY_V1'
  intakeId: string
  reference: string
  sha256: string
  source: { fileName: string; contentType: string; size: number; base64: string }
  artifact?: StoredManuscriptArtifact
  completed?: boolean
  attempts: number
  nextAttemptAt?: string
  failure?: string
}
const PREFIX = 'continuations/v1/'
function container() {
  const connection = process.env.AZURE_STORAGE_CONNECTION_STRING
  if (!connection) throw new Error('CONTINUATION_CUSTODY_UNAVAILABLE')
  return BlobServiceClient.fromConnectionString(connection).getContainerClient('jm1-pub-intake-recovery')
}
export function validateContinuationState(state: State) {
  const bytes = Buffer.from(state.source.base64, 'base64')
  if (state.schema !== 'CONTINUATION_CUSTODY_V1' || bytes.length !== state.source.size ||
      createHash('sha256').update(bytes).digest('hex') !== state.sha256 ||
      (state.artifact && state.artifact.sha256 !== state.sha256)) throw new Error('CONTINUATION_CUSTODY_CONFLICT')
  return state
}
export async function recoverContinuation<T>(input: { intakeId: string; reference: string; candidate: ManuscriptUploadCandidate },
  operation: (state: State, checkpoint: (artifact: StoredManuscriptArtifact) => Promise<void>) => Promise<T>,
  storage = container()) {
  if (!/^[a-f0-9-]{36}$/i.test(input.intakeId)) throw new Error('CONTINUATION_ID_INVALID')
  const client = storage
  if ((await client.getProperties()).blobPublicAccess) throw new Error('CONTINUATION_PRIVATE_CUSTODY_REQUIRED')
  const blob = client.getBlockBlobClient(`${PREFIX}${input.intakeId}.json`)
  const bytes = Buffer.from(input.candidate.bytes)
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  const initial: State = { schema: 'CONTINUATION_CUSTODY_V1', intakeId: input.intakeId, reference: input.reference, sha256,
    source: { fileName: input.candidate.fileName, contentType: input.candidate.contentType, size: bytes.length, base64: bytes.toString('base64') }, attempts: 0 }
  try { await blob.uploadData(Buffer.from(JSON.stringify(initial)), { conditions: { ifNoneMatch: '*' } }) }
  catch (error) { if (![409, 412].includes((error as { statusCode: number }).statusCode)) throw error }
  const lease = blob.getBlobLeaseClient()
  try { await lease.acquireLease(60) } catch { throw new Error('CONTINUATION_RECOVERY_BUSY') }
  let lost = false
  const timer = setInterval(() => { void lease.renewLease().catch(() => { lost = true }) }, 20_000)
  timer.unref()
  try {
    const state = validateContinuationState(JSON.parse((await blob.downloadToBuffer()).toString('utf8')))
    if (state.intakeId !== input.intakeId || state.reference !== input.reference || state.sha256 !== sha256 ||
        state.source.fileName !== input.candidate.fileName) throw new Error('CONTINUATION_SOURCE_CHANGED')
    const save = async () => {
      if (lost) throw new Error('CONTINUATION_CLAIM_LOST')
      await blob.uploadData(Buffer.from(JSON.stringify(state)), { conditions: { leaseId: lease.leaseId } })
    }
    if (!state.completed && (state.attempts >= 5 || Date.parse(state.nextAttemptAt || '') > Date.now())) {
      throw new Error('CONTINUATION_RECOVERY_PENDING')
    }
    if (!state.completed) { state.attempts++; await save() }
    try {
      const result = await operation(state, async artifact => { state.artifact = artifact; await save() })
      state.completed = true; delete state.failure; delete state.nextAttemptAt; await save()
      return result
    } catch (error) {
      state.failure = 'CONTINUATION_DEPENDENCY_REQUIRES_RECOVERY'
      state.nextAttemptAt = new Date(Date.now() + Math.min(60, 2 ** state.attempts) * 60_000).toISOString()
      await save()
      throw error
    }
  } finally { clearInterval(timer); await lease.releaseLease().catch(() => {}) }
}

export async function sweepContinuationRecovery(storage = container(), resume = async (state: State) => {
  const bytes = Buffer.from(state.source.base64, 'base64')
  return (await import('../../server/publishing-intake-manuscript-binding')).bindContinuationManuscriptToIntake({
    intakeId: state.intakeId, reference: state.reference,
    candidate: { ...state.source, bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length) as ArrayBuffer },
  })
}) {
  const results: { intakeId: string; status: string }[] = []
  const client = storage
  if ((await client.getProperties()).blobPublicAccess) throw new Error('CONTINUATION_PRIVATE_CUSTODY_REQUIRED')
  const cursor = client.getBlockBlobClient('continuation-monitor/v1/cursor.json')
  try { await cursor.uploadData(Buffer.from('{}'), { conditions: { ifNoneMatch: '*' } }) }
  catch (error) { if (![409, 412].includes((error as { statusCode: number }).statusCode)) throw error }
  const lease = cursor.getBlobLeaseClient()
  try { await lease.acquireLease(60) } catch { return { results, inspected: 0, bounded: true, busy: true } }
  const renewal = setInterval(() => { void lease.renewLease().catch(() => {}) }, 20_000)
  renewal.unref()
  let inspected = 0
  try {
    const saved = JSON.parse((await cursor.downloadToBuffer()).toString('utf8'))
    // One five-item page per tick bounds work without starving records behind completed or held receipts.
    const pages = client.listBlobsFlat({ prefix: PREFIX }).byPage({ continuationToken: saved.continuationToken, maxPageSize: 5 })
    const page = (await pages.next()).value
    for (const item of page?.segment.blobItems || []) {
      inspected++
      try {
        const state = validateContinuationState(JSON.parse((await client.getBlockBlobClient(item.name).downloadToBuffer()).toString('utf8')))
        if (state.completed || Date.parse(state.nextAttemptAt || '') > Date.now()) continue
        if (state.attempts >= 5) { results.push({ intakeId: state.intakeId, status: 'MANUAL_RECOVERY_REQUIRED' }); continue }
        try { await resume(state); results.push({ intakeId: state.intakeId, status: 'COMPLETED' }) }
        catch { results.push({ intakeId: state.intakeId, status: 'RECOVERY_PENDING' }) }
      } catch {
        results.push({ intakeId: item.name.slice(PREFIX.length).replace(/\.json$/, ''), status: 'CUSTODY_VALIDATION_FAILED' })
      }
    }
    await cursor.uploadData(Buffer.from(JSON.stringify({ continuationToken: page?.continuationToken || undefined,
      checkedAt: new Date().toISOString(), inspected, results })), { conditions: { leaseId: lease.leaseId } })
    return { results, inspected, bounded: Boolean(page?.continuationToken) }
  } finally {
    clearInterval(renewal)
    await lease.releaseLease().catch(() => {})
  }
}
