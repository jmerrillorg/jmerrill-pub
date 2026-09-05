import { NextRequest, NextResponse } from 'next/server'

import { requireAuthorAccess } from '@/lib/server/author-portal-context'
import { getAuthorV2IntakeReadback, saveAuthorV2Intake, type V2IntakeAnswers } from '@/lib/server/v2-intake'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const access = requireAuthorAccess(request)
  if ('unauthorized' in access) return access.unauthorized

  try {
    return NextResponse.json({ success: true, intake: await getAuthorV2IntakeReadback(access.session) })
  } catch (error) {
    return intakeError(error)
  }
}

export async function POST(request: NextRequest) {
  const access = requireAuthorAccess(request)
  if ('unauthorized' in access) return access.unauthorized

  try {
    const body = (await request.json()) as { answers?: V2IntakeAnswers; mode?: string }
    const mode = body.mode === 'SUBMIT' ? 'SUBMIT' : 'SAVE'
    const result = await saveAuthorV2Intake(access.session, body.answers || {}, mode)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    return intakeError(error)
  }
}

function intakeError(error: unknown) {
  const message = error instanceof Error ? error.message : 'V2_INTAKE_REQUEST_FAILED'
  const status = message.includes('NOT_AUTHORIZED') || message.includes('ACCESS_REQUIRED') ? 403 : 409
  console.error('V2 Intake request failed:', message)
  return NextResponse.json({ error: message }, { status })
}
