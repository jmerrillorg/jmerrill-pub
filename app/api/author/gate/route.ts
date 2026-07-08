import { NextRequest, NextResponse } from 'next/server'

import { validateAuthorAccessCode, type AuthorAccessScope } from '@/lib/server/author-access'
import { createAuthorPortalGateResponse } from '@/lib/server/author-portal-context'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const code = String(body.code || '').trim()
    const scope: AuthorAccessScope = body.scope === 'portal' ? 'portal' : 'forms'

    if (scope === 'portal') {
      return createAuthorPortalGateResponse({
        code,
        requestedReference:
          typeof body.reference === 'string'
            ? body.reference.trim()
            : typeof body.intakeReference === 'string'
              ? body.intakeReference.trim()
              : undefined,
      })
    }

    if (!validateAuthorAccessCode(code)) {
      return NextResponse.json(
        { error: 'Invalid access code.' },
        { status: 401 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Author onboarding gate error:', error)
    return NextResponse.json(
      { error: 'Unable to validate access code.' },
      { status: 500 },
    )
  }
}
