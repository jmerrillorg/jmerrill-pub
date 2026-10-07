// Engine: Stage Transition Engine
// Reusable? Y
// Stage-specific exception? N

import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { strToU8, zipSync } from 'fflate'
import { intakeFingerprint, intakeRecordId } from '@/lib/publishing/intake/receipt'
import { createNormalizedPublishingIntake, validatePublishingIntakeBody } from '@/lib/publishing/intake/schema'
import { findPublishingIntakeByIdempotencyKey, writePublishingIntakeWithRetry } from '@/lib/publishing/intake/dataverse'
import { uploadManuscriptToInquiryWorkspace } from '@/lib/publishing/intake/manuscriptUpload'
import { enqueuePublishingIntakeRecovery } from '@/lib/publishing/intake/deadLetter'
import { receiptRecoveryEnabled, reserveReceiptRecovery, recordReceiptCustody, recordReceiptFailure,
  readReceiptRecovery, readReceiptMonitor, releaseAcceptanceHold, sweepReceiptRecovery } from '@/lib/publishing/intake/receiptRecovery'
import { generateIntakeReference } from '@/lib/publishing/intake/reference'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const expected = Buffer.from(process.env.JM1_ORCHESTRATION_WORKER_KEY || '')
  const supplied = Buffer.from(request.headers.get('x-jm1-orchestration-worker-key') || '')
  if (!expected.length || expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 })
  }
  if (!receiptRecoveryEnabled()) return NextResponse.json({ code: 'RECEIPT_MONITOR_DISABLED' }, { status: 503 })
  try {
    const body = await request.json()
    if (!body || Object.keys(body).some(key => !['operation', 'recordId'].includes(key))) {
      return NextResponse.json({ code: 'UNEXPECTED_RECOVERY_FIELD' }, { status: 400 })
    }
    if (body.operation === 'sweep') return NextResponse.json(await sweepReceiptRecovery())
    if (body.operation === 'monitor') return NextResponse.json(await readReceiptMonitor())
    if (body.operation === 'read' && typeof body.recordId === 'string') return NextResponse.json(await readReceiptRecovery(body.recordId))
    const key = process.env.JM1_INTAKE_RECEIPT_ACCEPTANCE_KEY || ''
    const id = intakeRecordId(key)
    const expiry = Date.parse(process.env.JM1_INTAKE_RECEIPT_ACCEPTANCE_EXPIRES_AT || '')
    if (!/^[a-f0-9-]{36}$/i.test(key) || id !== process.env.JM1_INTAKE_RECEIPT_ACCEPTANCE_ID ||
        !Number.isFinite(expiry) || expiry <= Date.now() || expiry > Date.now() + 4 * 60 * 60_000 ||
        (body.recordId && body.recordId !== id)) {
      return NextResponse.json({ code: 'ACCEPTANCE_SCOPE_DENIED' }, { status: 403 })
    }
    if (body.operation === 'restore') return NextResponse.json(await releaseAcceptanceHold(id))
    if (body.operation !== 'seed') return NextResponse.json({ code: 'OPERATION_INVALID' }, { status: 400 })
    return await seedAcceptance(key, id)
  } catch (error) {
    const code = error instanceof Error && /^[A-Z_]{3,80}$/.test(error.message) ? error.message : 'RECEIPT_RECOVERY_DEPENDENCY_FAILED'
    console.error('Publishing receipt recovery failed.', { code })
    return NextResponse.json({ code }, { status: 503 })
  }
}

async function seedAcceptance(key: string, recordId: string) {
  const existing = await findPublishingIntakeByIdempotencyKey(key)
  if (existing.status === 'found') {
    if (existing.recordId !== recordId) throw new Error('ACCEPTANCE_RECEIPT_IDENTITY_MISMATCH')
    const receipt = await readReceiptRecovery(recordId)
    if (receipt.reference !== existing.reference) throw new Error('ACCEPTANCE_RECEIPT_IDENTITY_MISMATCH')
    return NextResponse.json(receipt, { status: 202 })
  }
  if (existing.status !== 'not_found') throw new Error('ACCEPTANCE_RECEIPT_READBACK_FAILED')
  // Fixed internal fixture only; caller cannot supply author content, recipient, or manuscript.
  const input = {
    firstName: 'Synthetic', lastName: 'RecoveryAcceptance', email: 'jm1-admin@jmerrill.one',
    streetAddress: '1 Internal Test Street', city: 'Test', stateProvince: 'VA', postalCode: '20000', country: 'United States',
    bookTitle: `SYNTHETIC INTERNAL RECEIPT RECOVERY ${key.slice(0, 8)}`, genre: 'Test', wordCount: 1000,
    workType: 'Full-length Book', manuscriptStatus: 'Complete', manuscriptSubmissionChoice: 'now',
    publishedBefore: 'First book', bookDescription: 'Harmless internal fixture for verifying durable intake failure monitoring and manual recovery only.',
    consent: true, rightsAttestation: true, serviceCommunicationConsent: true, marketingConsent: false,
    turnstileToken: '', idempotencyKey: key,
  }
  const validation = validatePublishingIntakeBody({ ...input, turnstileToken: 'internal-fixture-not-a-public-challenge' })
  if (!validation.ok) throw new Error('ACCEPTANCE_FIXTURE_VALIDATION_FAILED')
  const bytes = zipSync({
    '[Content_Types].xml': strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),
    '_rels/.rels': strToU8('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'),
    'word/document.xml': strToU8(`<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Internal synthetic recovery fixture only. ${'Test '.repeat(39000)}</w:t></w:r></w:p></w:body></w:document>`),
  }, { level: 0 })
  const candidate = { fileName: 'InternalReceiptRecovery.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: bytes.length, bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length) as ArrayBuffer }
  const fingerprint = intakeFingerprint(validation.data, candidate.bytes)
  const intake = createNormalizedPublishingIntake(validation.data, generateIntakeReference())
  const reserved = await writePublishingIntakeWithRetry({ ...intake, manuscriptUrl: undefined, manuscriptReceived: false }, fingerprint)
  if (reserved.status !== 'success' || reserved.recordId !== recordId) throw new Error('ACCEPTANCE_RESERVATION_FAILED')
  if (reserved.existing) return NextResponse.json(await readReceiptRecovery(recordId), { status: 202 })
  await reserveReceiptRecovery(recordId, intake, fingerprint, candidate, true)
  const upload = await uploadManuscriptToInquiryWorkspace(intake, candidate)
  if (upload.status !== 'uploaded') {
    await recordReceiptFailure(recordId, 'ACCEPTANCE_CUSTODY_DEPENDENCY_FAILED')
    throw new Error('ACCEPTANCE_CUSTODY_DEPENDENCY_FAILED')
  }
  await recordReceiptCustody(recordId, { ...intake, manuscriptUrl: upload.manuscriptUrl, manuscriptReceived: true,
    workspaceFolderId: upload.workspaceFolderId, workspaceUrl: upload.workspaceUrl,
    manuscriptLifecycleState: 'UPLOADED', prospectState: 'MANUSCRIPT_RECEIVED', waitingOn: 'JMP' })
  await recordReceiptFailure(recordId, 'CONTROLLED_FINALIZATION_DEPENDENCY_FAILURE')
  const queue = await enqueuePublishingIntakeRecovery({ intakeReference: intake.reference, dataverseRecordId: recordId,
    workspaceFolderId: upload.workspaceFolderId, correlationId: key, failedOperationType: 'MANUSCRIPT_WRITEBACK',
    failureClassification: 'TRANSIENT_MICROSOFT_DEPENDENCY_FAILURE', safeErrorCode: 'CONTROLLED_FINALIZATION_DEPENDENCY_FAILURE' })
  if (queue.status !== 'enqueued') throw new Error('ACCEPTANCE_QUEUE_CUSTODY_UNPROVEN')
  return NextResponse.json({ ...(await readReceiptRecovery(recordId)), status: 'pending', recoveryQueue: queue.status }, { status: 202 })
}
