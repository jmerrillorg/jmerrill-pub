import { NextRequest, NextResponse } from 'next/server'
import { validateAuthorAccessCode, validateAuthorPortalAccessCode, type AuthorAccessScope } from '@/lib/server/author-access'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const code = String(body.code || '').trim()
    const scope: AuthorAccessScope = body.scope === 'portal' ? 'portal' : 'forms'

    if (scope === 'portal') {
      const result = validateAuthorPortalAccessCode(code)
      if (!result.success) {
        return NextResponse.json(
          { error: 'Invalid access code.' },
          { status: 401 },
        )
      }

      return NextResponse.json({
        success: true,
        accessType: result.accessType,
        portalContext: result.portalContext || null,
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
