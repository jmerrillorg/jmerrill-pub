import type { NextRequest } from 'next/server'

import { getAuthorPortalAccessGrants } from './author-portal-access'
import { requireAuthorAccess as requireAuthorPortalAccess } from './author-portal-context'

const LOCAL_TEST_ACCESS_CODE = 'JMP-AUTHOR-2026'

export function getExpectedAuthorAccessCode() {
  const firstGrant = getAuthorPortalAccessGrants()[0]
  if (firstGrant?.code) return firstGrant.code
  if (process.env.NODE_ENV === 'development') return LOCAL_TEST_ACCESS_CODE
  return ''
}

export function validateAuthorAccessCode(code: unknown) {
  return getAuthorPortalAccessGrants().some((grant) => typeof code === 'string' && code.length > 0 && grant.code === code)
}

export function requireAuthorAccess(req: NextRequest) {
  const result = requireAuthorPortalAccess(req)
  return result.unauthorized || null
}
