import { NextResponse } from 'next/server'

import { verifyIntakeContinuationToken } from '@/lib/publishing/intake/continuation'
import {
  bindContinuationManuscriptToIntake,
  getContinuationIntakeStatus,
} from '@/lib/server/publishing-intake-manuscript-binding'
import type { ManuscriptUploadCandidate } from '@/lib/publishing/intake/manuscriptUpload'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{
    token: string
  }>
}

export async function GET(_req: Request, context: RouteContext) {
  const params = await context.params
  const token = verifyIntakeContinuationToken(params.token)
  if (!token.ok) {
    return NextResponse.json({ error: 'Continuation link is invalid or expired.', code: token.reason }, { status: 401 })
  }

  try {
    const status = await getContinuationIntakeStatus({
      intakeId: token.claims.intakeId,
      reference: token.claims.reference,
    })
    return NextResponse.json({ status: 'ready', intake: status }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json(
      { error: 'Unable to verify this submission. Please contact publishing@jmerrill.one.', code: 'CONTINUATION_READBACK_UNAVAILABLE' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

export async function POST(req: Request, context: RouteContext) {
  const params = await context.params
  const token = verifyIntakeContinuationToken(params.token)
  if (!token.ok) {
    return NextResponse.json({ error: 'Continuation link is invalid or expired.', code: token.reason }, { status: 401 })
  }

  const formData = await req.formData().catch(() => null)
  const value = formData?.get('manuscriptFile')
  if (!value || typeof value === 'string' || !isFileLike(value) || value.size <= 0) {
    return NextResponse.json({ error: 'A manuscript file is required.' }, { status: 400 })
  }
  if (value.size > 25 * 1024 * 1024) return NextResponse.json({ error: 'Upload a manuscript smaller than 25 MB.' }, { status: 413 })

  const candidate: ManuscriptUploadCandidate = {
    fileName: value.name,
    contentType: value.type,
    size: value.size,
    bytes: await value.arrayBuffer(),
  }

  try {
    const result = await bindContinuationManuscriptToIntake({
      intakeId: token.claims.intakeId,
      reference: token.claims.reference,
      candidate,
    })
    return NextResponse.json({ status: 'received', result }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const conflict = ['continuation_existing_source_requires_review', 'CONTINUATION_SOURCE_CHANGED', 'CONTINUATION_CUSTODY_CONFLICT',
      'CONTINUATION_SOURCE_CUSTODY_CONFLICT'].includes(message)
    return NextResponse.json(
      { error: conflict
        ? 'An existing manuscript requires Publishing review. No replacement was accepted. Please contact publishing@jmerrill.one.'
        : 'Receipt is not yet complete. Please retain your file and use this same link to check again; do not start a new inquiry.',
        code: conflict ? 'CONTINUATION_SOURCE_REVIEW_REQUIRED' : 'CONTINUATION_RECOVERY_PENDING' },
      { status: conflict ? 409 : 503, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } },
    )
  }
}

function isFileLike(value: FormDataEntryValue): value is File {
  return typeof value === 'object' &&
    value !== null &&
    'arrayBuffer' in value &&
    'name' in value &&
    'size' in value
}
