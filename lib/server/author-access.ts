import { NextRequest, NextResponse } from 'next/server'

const LOCAL_TEST_ACCESS_CODE = 'JMP-AUTHOR-2026'

export function getExpectedAuthorAccessCode() {
  if (process.env.AUTHOR_ONBOARDING_ACCESS_CODE) return process.env.AUTHOR_ONBOARDING_ACCESS_CODE
  if (process.env.NODE_ENV !== 'production') return LOCAL_TEST_ACCESS_CODE
  return ''
}

export function validateAuthorAccessCode(code: unknown) {
  const expected = getExpectedAuthorAccessCode()
  return typeof code === 'string' && code.length > 0 && expected.length > 0 && code === expected
}

export function requireAuthorAccess(req: NextRequest) {
  const code = req.headers.get('x-author-access-code')
  if (validateAuthorAccessCode(code)) return null

  return NextResponse.json(
    {
      error: 'Author setup access is restricted. Please unlock the author hub with the access code provided by J Merrill Publishing.',
    },
    { status: 401 },
  )
}
