import { NextRequest, NextResponse } from 'next/server'

import { createAuthorPortalGateResponse } from '@/lib/server/author-portal-context'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const code = String(body.code || '').trim()
    const requestedReference = String(body.reference || body.intakeReference || '').trim()
    return createAuthorPortalGateResponse({ code, requestedReference })
  } catch (error) {
    console.error('Author onboarding gate error:', error)
    return NextResponse.json(
      { error: 'Unable to validate access code.' },
      { status: 500 },
    )
  }
}
