import { NextRequest, NextResponse } from 'next/server'

import { validateAuthorAccessCode, type AuthorAccessScope } from '@/lib/server/author-access'
import { getAuthorPortalAccessDiagnostics } from '@/lib/server/author-portal-access'
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
      const response = NextResponse.json(
        { error: 'Invalid access code.' },
        { status: 401 },
      )
      response.headers.set('x-author-gate-diag', buildAuthorGateDiagHeader())
      return response
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Author onboarding gate error:', error)
    const response = NextResponse.json(
      { error: 'Unable to validate access code.' },
      { status: 500 },
    )
    response.headers.set('x-author-gate-diag', buildAuthorGateDiagHeader())
    return response
  }
}

function buildAuthorGateDiagHeader() {
  const diagnostics = getAuthorPortalAccessDiagnostics()
  return [
    `src=${diagnostics.registrySource}`,
    `grants=${diagnostics.grantCount}`,
    `active=${diagnostics.activeGrantCount}`,
    `master=${diagnostics.masterCodeConfigured ? 1 : 0}`,
    `onboarding=${diagnostics.onboardingCodeConfigured ? 1 : 0}`,
    `pepper=${diagnostics.pepperConfigured ? 1 : 0}`,
    `session=${diagnostics.sessionSecretConfigured ? 1 : 0}`,
  ].join(';')
}
