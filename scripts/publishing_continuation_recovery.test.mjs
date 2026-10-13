import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import createJiti from 'jiti'
const { recoverContinuation, validateContinuationState } = createJiti(import.meta.url)('../lib/publishing/intake/continuationRecovery.ts')
const input = { intakeId: '11111111-1111-4111-8111-111111111111', reference: 'JMP-TEST',
  candidate: { fileName: 'fixture.docx', contentType: 'application/octet-stream', size: 3, bytes: Uint8Array.from([1,2,3]).buffer } }
const sha = createHash('sha256').update(Buffer.from(input.candidate.bytes)).digest('hex')
function store() {
  let data, locked = false
  const blob = {
    async uploadData(bytes, options) {
      if (options.conditions.ifNoneMatch && data) throw { statusCode: 412 }
      if (data && (!locked || options.conditions.leaseId !== 'lease')) throw Error('lease required')
      data = Buffer.from(bytes)
    },
    async downloadToBuffer() { return Buffer.from(data) },
    getBlobLeaseClient() { return { leaseId: 'lease', async acquireLease() { if (locked) throw Error('busy'); locked = true },
      async renewLease() {}, async releaseLease() { locked = false } } },
  }
  return { async getProperties() { return {} }, getBlockBlobClient() { return blob },
    value() { return JSON.parse(data.toString()) },
    restore(value) { data = Buffer.from(JSON.stringify(value)) } }
}
test('custody checkpoint survives failed writeback; retry and exact replay reuse it', async () => {
  const storage = store(); let uploads = 0
  await assert.rejects(recoverContinuation(input, async (_, checkpoint) => {
    uploads++; await checkpoint({ sha256: sha, manuscriptUrl: 'https://example.invalid/source' }); throw Error('writeback unavailable')
  }, storage), /writeback unavailable/)
  assert.equal(storage.value().attempts, 1)
  storage.restore({ ...storage.value(), nextAttemptAt: '2000-01-01T00:00:00Z' })
  const apply = async state => { assert.equal(state.artifact.sha256, sha); return 'same-receipt' }
  assert.equal(await recoverContinuation(input, apply, storage), 'same-receipt')
  assert.equal(await recoverContinuation(input, apply, storage), 'same-receipt')
  assert.equal(uploads, 1); assert.equal(storage.value().completed, true)
  await assert.rejects(recoverContinuation({ ...input, candidate: { ...input.candidate, bytes: Uint8Array.from([3,2,1]).buffer } }, apply, storage), /SOURCE_CHANGED/)
})
test('concurrent claimant cannot execute and corrupt bytes fail validation', async () => {
  const storage = store(); let unblock, entered
  const ready = new Promise(resolve => { entered = resolve })
  const pending = recoverContinuation(input, async () => { entered(); await new Promise(resolve => { unblock = resolve }); return 'ok' }, storage)
  await ready
  await assert.rejects(recoverContinuation(input, async () => assert.fail('duplicate execution'), storage), /BUSY/)
  unblock(); await pending
  assert.throws(() => validateContinuationState({ ...storage.value(), sha256: 'b'.repeat(64) }), /CONFLICT/)
})
