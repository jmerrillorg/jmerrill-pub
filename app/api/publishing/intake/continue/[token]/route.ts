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
  params: {
    token: string
  }
}

export async function GET(_req: Request, context: RouteContext) {
  const token = verifyIntakeContinuationToken(context.params.token)
  if (!token.ok) {
    return NextResponse.json({ error: 'Continuation link is invalid or expired.', code: token.reason }, { status: 401 })
  }

  try {
    const status = await getContinuationIntakeStatus({
      intakeId: token.claims.intakeId,
      reference: token.claims.reference,
    })
    return NextResponse.json({ status: 'ready', intake: status }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load continuation status.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

export async function POST(req: Request, context: RouteContext) {
  const token = verifyIntakeContinuationToken(context.params.token)
  if (!token.ok) {
    return NextResponse.json({ error: 'Continuation link is invalid or expired.', code: token.reason }, { status: 401 })
  }

  const formData = await req.formData().catch(() => null)
  const value = formData?.get('manuscriptFile')
  if (!value || typeof value === 'string' || !isFileLike(value) || value.size <= 0) {
    return NextResponse.json({ error: 'A manuscript file is required.' }, { status: 400 })
  }

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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to bind manuscript.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
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
