import { createHash } from 'node:crypto'
import { AsyncLocalStorage } from 'node:async_hooks'
import { BlobServiceClient, type BlockBlobClient } from '@azure/storage-blob'
import { validatePublishingIntakeBody, type NormalizedPublishingIntake } from './schema'
import { intakeFingerprint, intakeRecordId } from './receipt'
import type { ManuscriptUploadCandidate } from './manuscriptUpload'
import { ensureInquiryWorkspace, uploadManuscriptToInquiryWorkspace } from './manuscriptUpload'
import { findPublishingIntakeByIdempotencyKey, finalizePublishingIntakeReceipt, listIncompletePublishingReceipts } from './dataverse'
import { sendJoinInternalNotification } from './internalNotification'
import { enqueuePublishingIntakeRecovery } from './deadLetter'

const CONTAINER = 'jm1-pub-intake-recovery'
const PREFIX = 'receipts/v1/'
const OVERDUE_MS = 5 * 60_000
const MAX_ATTEMPTS = 5
const now = () => new Date().toISOString()
const activeReceiptClaim = new AsyncLocalStorage<{ recordId: string; state: ReceiptRecoveryState; persist: () => Promise<void> }>()

export type ReceiptRecoveryState = {
  schema: 'JMP_INTAKE_RECOVERY_V1'
  recordId: string
  reference: string
  fingerprint: string
  createdAt: string
  updatedAt: string
  phase: 'RESERVED' | 'CUSTODY' | 'COMPLETED'
  intake: NormalizedPublishingIntake
  file?: { fileName: string; contentType: string; size: number; sha256: string; base64: string }
  acceptedIntake?: NormalizedPublishingIntake
  failedAt?: string
  failureCode?: string
  retryCount: number
  nextAttemptAt?: string
  manualHold?: string
  notification?: 'SENDING' | 'SENT'
  alert?: { openedAt: string; providerMessageId: string; resolvedAt?: string; resolutionMessageId?: string }
  completion?: { completedAt: string; recordId: string; outcome: 'MANUAL_REVIEW_READY' }
  acceptanceHold?: boolean
}

export function receiptRecoveryEnabled() {
  return process.env.JM1_INTAKE_RECEIPT_RECOVERY_ENABLED === 'true'
}

function container() {
  const connection = process.env.AZURE_STORAGE_CONNECTION_STRING
  if (!connection) throw new Error('RECEIPT_JOURNAL_CONFIGURATION_MISSING')
  return BlobServiceClient.fromConnectionString(connection, {
    retryOptions: { maxTries: 3, tryTimeoutInMs: 15_000 },
  }).getContainerClient(CONTAINER)
}

function blob(recordId: string) {
  if (!/^[a-f0-9-]{36}$/i.test(recordId)) throw new Error('RECEIPT_ID_INVALID')
  return container().getBlockBlobClient(`${PREFIX}${recordId}.json`)
}

async function read(client: BlockBlobClient): Promise<ReceiptRecoveryState> {
  const journalBytes = await client.downloadToBuffer()
  const value = JSON.parse(journalBytes.toString('utf8')) as ReceiptRecoveryState
  return validateReceiptRecoveryState(value)
}

export function validateReceiptRecoveryState(value: ReceiptRecoveryState) {
  if (value.schema !== 'JMP_INTAKE_RECOVERY_V1' || value.reference !== value.intake.reference) {
    throw new Error('RECEIPT_JOURNAL_IDENTITY_INVALID')
  }
  const validated = validatePublishingIntakeBody({ ...value.intake, turnstileToken: 'private-recovery-not-a-public-challenge' })
  const bytes = value.file ? Buffer.from(value.file.base64, 'base64') : undefined
  if (!validated.ok || intakeRecordId(value.intake.idempotencyKey) !== value.recordId ||
      (bytes && (bytes.length !== value.file!.size || createHash('sha256').update(bytes).digest('hex') !== value.file!.sha256)) ||
      (validated.ok && intakeFingerprint(validated.data, bytes ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer : undefined) !== value.fingerprint)) {
    throw new Error('RECEIPT_SOURCE_AUTHORITY_MISMATCH')
  }
  const custodyFields = new Set(['manuscriptUrl', 'manuscriptReceived', 'workspaceFolderId', 'workspaceUrl',
    'manuscriptLifecycleState', 'prospectState', 'waitingOn'])
  if (value.acceptedIntake && Object.keys(value.intake).some(key => !custodyFields.has(key) &&
      JSON.stringify(value.intake[key as keyof NormalizedPublishingIntake]) !== JSON.stringify(value.acceptedIntake![key as keyof NormalizedPublishingIntake]))) {
    throw new Error('RECEIPT_CUSTODY_IDENTITY_MISMATCH')
  }
  return value
}

async function save(client: BlockBlobClient, state: ReceiptRecoveryState, leaseId?: string) {
  state.updatedAt = now()
  const text = JSON.stringify(state)
  await client.upload(text, Buffer.byteLength(text), {
    conditions: leaseId ? { leaseId } : { ifNoneMatch: '*' },
    blobHTTPHeaders: { blobContentType: 'application/json' },
  })
}

async function exclusive<T>(recordId: string, operation: (state: ReceiptRecoveryState, persist: () => Promise<void>) => Promise<T>) {
  const current = activeReceiptClaim.getStore()
  if (current?.recordId === recordId) return operation(current.state, current.persist)
  const client = blob(recordId)
  const lease = client.getBlobLeaseClient()
  try { await lease.acquireLease(60) } catch (error) {
    if ((error as { code?: string }).code === 'LeaseAlreadyPresent') throw new Error('RECEIPT_CLAIM_BUSY')
    throw error
  }
  let renewalFailed = false
  const renewal = setInterval(() => { void lease.renewLease().catch(() => { renewalFailed = true }) }, 20_000)
  try {
    const state = await read(client)
    return await operation(state, async () => {
      if (renewalFailed) throw new Error('RECEIPT_CLAIM_LOST')
      await save(client, state, lease.leaseId)
    })
  } finally {
    clearInterval(renewal)
    await lease.releaseLease().catch(() => undefined)
  }
}

export async function withInitialReceiptClaim<T>(recordId: string | undefined, operation: () => Promise<T>): Promise<T> {
  if (!receiptRecoveryEnabled() || !recordId) return operation()
  return exclusive(recordId, (state, persist) => activeReceiptClaim.run({ recordId, state, persist }, operation))
}

export function classifyReceiptWork(state: ReceiptRecoveryState, at = Date.now()) {
  if (state.phase === 'COMPLETED') return state.alert && !state.alert.resolvedAt ? 'RESOLUTION_PENDING' : 'COMPLETE'
  if (state.failedAt) return state.manualHold ? 'MANUAL_HOLD' : 'FAILED'
  return at - Date.parse(state.createdAt) >= OVERDUE_MS ? 'OVERDUE' : 'LEGITIMATE_PENDING'
}

export function retryDelay(attempt: number) {
  return Math.min(30 * 60_000, 60_000 * 2 ** Math.max(0, attempt - 1))
}

export async function reserveReceiptRecovery(recordId: string, intake: NormalizedPublishingIntake, fingerprint: string, candidate?: ManuscriptUploadCandidate | null, acceptanceHold = false) {
  if (!receiptRecoveryEnabled()) return
  // No public container ACL, challenge token, or inquiry content in queue/alert output.
  await container().createIfNotExists()
  if ((await container().getProperties()).blobPublicAccess) throw new Error('RECEIPT_JOURNAL_PUBLIC_ACCESS_DENIED')
  const state: ReceiptRecoveryState = {
    schema: 'JMP_INTAKE_RECOVERY_V1', recordId, reference: intake.reference, fingerprint,
    createdAt: now(), updatedAt: now(), phase: 'RESERVED', retryCount: 0,
    intake: { ...intake, turnstileToken: '' },
    ...(candidate ? { file: { fileName: candidate.fileName, contentType: candidate.contentType,
      size: candidate.size, sha256: createHash('sha256').update(Buffer.from(candidate.bytes)).digest('hex'),
      base64: Buffer.from(candidate.bytes).toString('base64') } } : {}),
    ...(acceptanceHold ? { acceptanceHold: true } : {}),
  }
  await save(blob(recordId), state)
}

export async function recordReceiptCustody(recordId: string, accepted: NormalizedPublishingIntake) {
  if (!receiptRecoveryEnabled()) return
  await exclusive(recordId, async (state, persist) => {
    state.acceptedIntake = { ...accepted, turnstileToken: '' }
    state.phase = 'CUSTODY'
    await persist()
  })
}

export async function recordReceiptFailure(recordId: string, code: string) {
  if (!receiptRecoveryEnabled()) return
  await exclusive(recordId, async (state, persist) => {
    state.failedAt ||= now()
    // Never serialize provider errors, manuscript text, names, or addresses in alerts.
    state.failureCode = /^[A-Z_]{3,80}$/.test(code) ? code : 'INTAKE_DEPENDENCY_FAILURE'
    state.nextAttemptAt = now()
    await persist()
  })
}

export async function recordReceiptComplete(recordId: string) {
  if (!receiptRecoveryEnabled()) return
  await exclusive(recordId, async (state, persist) => {
    state.phase = 'COMPLETED'
    state.completion = { completedAt: now(), recordId, outcome: 'MANUAL_REVIEW_READY' }
    await persist()
  })
}

async function sendOperationalAlert(state: Pick<ReceiptRecoveryState, 'reference' | 'recordId' | 'failureCode' | 'failedAt' | 'createdAt'>, status: 'FAILED' | 'RESOLVED') {
  const url = process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL || process.env.JM1_INTERNAL_NOTIFICATION_RELAY_URL
  const key = process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY || process.env.JM1_INTERNAL_NOTIFICATION_RELAY_KEY
  if (!url || !key) throw new Error('RECEIPT_ALERT_CONFIGURATION_MISSING')
  const response = await fetch(`${url.replace(/\/+$/, '')}/api/send-intake-operational-alert`, {
    method: 'POST', signal: AbortSignal.timeout(30_000),
    headers: { 'content-type': 'application/json', 'x-jm1-relay-key': key },
    body: JSON.stringify({ reference: state.reference, recordId: state.recordId, status,
      failureCode: state.failureCode || 'OVERDUE_INCOMPLETE_RECEIPT',
      firstObservedAt: state.failedAt || state.createdAt }),
  })
  const value = await response.json().catch(() => ({}))
  if (response.status !== 202 || !value.providerMessageId) throw new Error('RECEIPT_ALERT_DELIVERY_UNPROVEN')
  return String(value.providerMessageId)
}

type RecoveryDependencies = {
  alert?: typeof sendOperationalAlert
  canonical?: typeof findPublishingIntakeByIdempotencyKey
  finalize?: typeof finalizePublishingIntakeReceipt
  upload?: typeof uploadManuscriptToInquiryWorkspace
  workspace?: typeof ensureInquiryWorkspace
  notify?: typeof sendJoinInternalNotification
  exclusive?: typeof exclusive
}

export async function recoverReceipt(recordId: string, deps: RecoveryDependencies = {}) {
  return (deps.exclusive || exclusive)(recordId, async (state, persist) => {
    const classification = classifyReceiptWork(state)
    if (classification === 'COMPLETE' || classification === 'LEGITIMATE_PENDING') return receiptRecoveryReadback(state)
    if (!state.alert && state.phase !== 'COMPLETED') {
      const providerMessageId = await (deps.alert || sendOperationalAlert)(state, 'FAILED')
      state.alert = { openedAt: now(), providerMessageId }
      await persist()
    }
    if (state.phase === 'COMPLETED') {
      if (state.alert && !state.alert.resolvedAt) {
        state.alert.resolutionMessageId = await (deps.alert || sendOperationalAlert)(state, 'RESOLVED')
        state.alert.resolvedAt = now()
        await persist()
      }
      return receiptRecoveryReadback(state)
    }
    if (state.manualHold || (state.nextAttemptAt && Date.parse(state.nextAttemptAt) > Date.now())) return receiptRecoveryReadback(state)
    if (state.acceptanceHold) return receiptRecoveryReadback(state)
    state.retryCount++
    state.nextAttemptAt = new Date(Date.now() + retryDelay(state.retryCount)).toISOString()
    await persist()
    try {
      const prior = await (deps.canonical || findPublishingIntakeByIdempotencyKey)(state.intake.idempotencyKey)
      if (prior.status !== 'found' || prior.recordId !== state.recordId || prior.reference !== state.reference || prior.fingerprint !== state.fingerprint) {
        state.manualHold = 'CANONICAL_RECEIPT_IDENTITY_UNPROVEN'
        await persist()
        return receiptRecoveryReadback(state)
      }
      if (!prior.accepted) {
        if (!state.acceptedIntake) {
          if (state.file) {
            const bytes = Buffer.from(state.file.base64, 'base64')
            if (bytes.length !== state.file.size || createHash('sha256').update(bytes).digest('hex') !== state.file.sha256) throw new Error('SOURCE_CUSTODY_MISMATCH')
            const upload = await (deps.upload || uploadManuscriptToInquiryWorkspace)(state.intake, {
              fileName: state.file.fileName, contentType: state.file.contentType, size: bytes.length,
              bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
            })
            if (upload.status !== 'uploaded') throw new Error('MANUSCRIPT_CUSTODY_RETRY_FAILED')
            state.acceptedIntake = { ...state.intake, manuscriptUrl: upload.manuscriptUrl, manuscriptReceived: true,
              workspaceFolderId: upload.workspaceFolderId, workspaceUrl: upload.workspaceUrl,
              manuscriptLifecycleState: upload.reviewFlag === 'normalization_required' ? 'NORMALIZATION_PENDING' : 'UPLOADED',
              prospectState: upload.reviewFlag === 'normalization_required' ? 'NORMALIZATION_PENDING' : 'MANUSCRIPT_RECEIVED',
              waitingOn: upload.reviewFlag === 'normalization_required' ? 'JMP/System' : 'JMP' }
          } else {
            const workspace = await (deps.workspace || ensureInquiryWorkspace)(state.intake)
            if (workspace.status !== 'created') throw new Error('WORKSPACE_CUSTODY_RETRY_FAILED')
            state.acceptedIntake = { ...state.intake, workspaceFolderId: workspace.workspaceFolderId, workspaceUrl: workspace.workspaceUrl,
              ...(state.intake.manuscriptUrl ? { manuscriptReceived: true, manuscriptLifecycleState: 'UPLOADED', prospectState: 'MANUSCRIPT_RECEIVED', waitingOn: 'JMP' } : {}) }
          }
          state.phase = 'CUSTODY'
          await persist()
        }
        const result = await (deps.finalize || finalizePublishingIntakeReceipt)(state.recordId, state.acceptedIntake, state.fingerprint)
        if (result.status !== 'success') throw new Error('RECEIPT_FINALIZATION_RETRY_FAILED')
      }
      // A prior accepted result may have sent notifications before restart. Never resend it.
      if (!prior.accepted && !state.notification) {
        state.notification = 'SENDING'
        await persist()
        const result = await (deps.notify || sendJoinInternalNotification)(state.acceptedIntake!, { recordId: state.recordId })
        if (result.status !== 'sent') throw new Error('MANUAL_NOTIFICATION_OUTCOME_AMBIGUOUS')
        state.notification = 'SENT'
        await persist()
      }
      if (state.notification === 'SENDING') throw new Error('MANUAL_NOTIFICATION_OUTCOME_AMBIGUOUS')
      const verified = await (deps.canonical || findPublishingIntakeByIdempotencyKey)(state.intake.idempotencyKey)
      if (verified.status !== 'found' || !verified.accepted || verified.recordId !== state.recordId || verified.reference !== state.reference || verified.fingerprint !== state.fingerprint) throw new Error('RECEIPT_COMPLETION_READBACK_FAILED')
      state.phase = 'COMPLETED'
      state.completion = { completedAt: now(), recordId, outcome: 'MANUAL_REVIEW_READY' }
      await persist()
      if (state.alert && !state.alert.resolvedAt) {
        state.alert.resolutionMessageId = await (deps.alert || sendOperationalAlert)(state, 'RESOLVED')
        state.alert.resolvedAt = now()
        await persist()
      }
    } catch (error) {
      state.failedAt ||= now()
      state.failureCode = error instanceof Error && /^[A-Z_]{3,80}$/.test(error.message) ? error.message : 'INTAKE_DEPENDENCY_FAILURE'
      if (state.retryCount >= MAX_ATTEMPTS || state.failureCode === 'MANUAL_NOTIFICATION_OUTCOME_AMBIGUOUS' || state.failureCode === 'SOURCE_CUSTODY_MISMATCH') state.manualHold = state.failureCode
      await persist()
    }
    return receiptRecoveryReadback(state)
  })
}

export function receiptRecoveryReadback(state: ReceiptRecoveryState) {
  return { recordId: state.recordId, reference: state.reference, phase: state.phase,
    classification: classifyReceiptWork(state), retryCount: state.retryCount, nextAttemptAt: state.nextAttemptAt,
    failureCode: state.failureCode, manualHold: state.manualHold, alert: state.alert,
    completion: state.completion, notification: state.notification, acceptanceHold: state.acceptanceHold === true,
    sourceSha256: state.file?.sha256, sourceSize: state.file?.size, updatedAt: state.updatedAt }
}

export async function readReceiptRecovery(recordId: string) {
  return receiptRecoveryReadback(await read(blob(recordId)))
}

export async function releaseAcceptanceHold(recordId: string) {
  if (process.env.JM1_INTAKE_RECEIPT_ACCEPTANCE_ID !== recordId) throw new Error('ACCEPTANCE_SCOPE_DENIED')
  return exclusive(recordId, async (state, persist) => {
    if (!state.acceptanceHold) return receiptRecoveryReadback(state)
    state.acceptanceHold = false
    state.nextAttemptAt = now()
    await persist()
    return receiptRecoveryReadback(state)
  })
}

export async function sweepReceiptRecovery() {
  if ((await container().getProperties()).blobPublicAccess) throw new Error('RECEIPT_JOURNAL_PUBLIC_ACCESS_DENIED')
  const results = []
  let examined = 0
  // A journal outage must not hide a canonical reserved receipt. Missing bytes
  // require manual custody review, never author resubmission or fabricated recovery.
  for (const receipt of await listIncompletePublishingReceipts()) {
    if (Date.now() - Date.parse(receipt.createdAt) < OVERDUE_MS) continue
    if (await blob(receipt.recordId).exists()) continue
    const state = { reference: receipt.reference, recordId: receipt.recordId, createdAt: receipt.createdAt,
      failureCode: 'RECOVERY_SOURCE_UNAVAILABLE_MANUAL_REVIEW' }
    const providerMessageId = await sendOperationalAlert(state, 'FAILED')
    const client = container().getBlockBlobClient(`exceptions/v1/${receipt.recordId}.json`)
    if (!(await client.exists())) {
      const text = JSON.stringify({ ...state, providerMessageId, observedAt: now(), status: 'MANUAL_CUSTODY_REVIEW_REQUIRED' })
      await client.upload(text, Buffer.byteLength(text), { conditions: { ifNoneMatch: '*' }, blobHTTPHeaders: { blobContentType: 'application/json' } })
    }
    results.push({ ...state, providerMessageId, manualHold: 'RECOVERY_SOURCE_UNAVAILABLE_MANUAL_REVIEW' })
  }
  for await (const item of container().listBlobsFlat({ prefix: PREFIX })) {
    if (++examined > 500) throw new Error('RECEIPT_SCAN_CAPACITY_REQUIRES_REVIEW')
    const id = item.name.slice(PREFIX.length, -5)
    const state = await read(blob(id))
    if (classifyReceiptWork(state) === 'COMPLETE' || classifyReceiptWork(state) === 'LEGITIMATE_PENDING') continue
    try { results.push(await recoverReceipt(id)) } catch (error) {
      results.push(error instanceof Error && error.message === 'RECEIPT_CLAIM_BUSY'
        ? { recordId: id, reference: state.reference, classification: 'IN_PROGRESS' }
        : { recordId: id, reference: state.reference, error: error instanceof Error && /^[A-Z_]{3,80}$/.test(error.message) ? error.message : 'RECEIPT_MONITOR_DEPENDENCY_FAILED' })
    }
    if (results.length >= 5) break
  }
  const outcome = { examined, results, observedAt: now(), releaseSha: process.env.JM1_RELEASE_SHA || 'unknown' }
  const text = JSON.stringify(outcome)
  await container().getBlockBlobClient('monitor/last-run.json').upload(text, Buffer.byteLength(text), {
    blobHTTPHeaders: { blobContentType: 'application/json' },
  })
  return outcome
}

export async function readReceiptMonitor() {
  const client = container().getBlockBlobClient('monitor/last-run.json')
  return { enabled: receiptRecoveryEnabled(), releaseSha: process.env.JM1_RELEASE_SHA || 'unknown',
    publicAccess: (await container().getProperties()).blobPublicAccess || 'NONE',
    lastRun: JSON.parse((await client.downloadToBuffer()).toString('utf8')) }
}
