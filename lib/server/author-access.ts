import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'

const LOCAL_TEST_ACCESS_CODE = 'JMP-AUTHOR-2026'
const LOCAL_TEST_PORTAL_CODE = 'JMP-PORTAL-ADMIN-2026'

export type AuthorAccessScope = 'forms' | 'portal'

export type AuthorPortalAccessResult =
  | {
      success: true
      accessType: 'admin' | 'author'
      portalContext?: {
        contactId?: string
        authorPortalId?: string
        titleId?: string
        titleIds?: string[]
        projectId?: string
        projectIds?: string[]
        titleName?: string
        stripeAccountId?: string
      }
    }
  | {
      success: false
      reason: 'missing-code' | 'invalid-code' | 'expired' | 'inactive'
    }

type ConfiguredPortalAccessRecord = {
  status?: string
  expiresOn?: string
  accessCode?: string
  accessCodeHash?: string
  contactId?: string
  authorPortalId?: string
  titleId?: string
  titleIds?: string[]
  projectId?: string
  projectIds?: string[]
  titleName?: string
  stripeAccountId?: string
}

export function getExpectedAuthorAccessCode() {
  if (process.env.AUTHOR_ONBOARDING_ACCESS_CODE) return process.env.AUTHOR_ONBOARDING_ACCESS_CODE
  if (process.env.NODE_ENV === 'development') return LOCAL_TEST_ACCESS_CODE
  return ''
}

export function validateAuthorAccessCode(code: unknown) {
  const expected = getExpectedAuthorAccessCode()
  return typeof code === 'string' && code.length > 0 && expected.length > 0 && code === expected
}

export function requireAuthorAccess(req: NextRequest) {
  const code = req.headers.get('x-author-access-code')
  if (validateAuthorAccessCode(code)) return null
  if (validateAuthorPortalAccessCode(code).success) return null

  return NextResponse.json(
    {
      error: 'Author setup access is restricted. Please unlock the author hub with the access code provided by J Merrill Publishing.',
    },
    { status: 401 },
  )
}

export function validateAuthorPortalAccessCode(code: unknown): AuthorPortalAccessResult {
  if (typeof code !== 'string' || code.trim().length === 0) {
    return { success: false, reason: 'missing-code' }
  }

  const trimmedCode = code.trim()
  if (isMasterPortalAccessCode(trimmedCode)) {
    return { success: true, accessType: 'admin' }
  }

  const record = getConfiguredPortalAccessRecords().find((candidate) => recordMatchesCode(candidate, trimmedCode))
  if (!record) return { success: false, reason: 'invalid-code' }

  const status = String(record.status || 'active').toLowerCase()
  if (!['active', 'enabled'].includes(status)) return { success: false, reason: 'inactive' }

  if (record.expiresOn) {
    const expiresOn = Date.parse(record.expiresOn)
    if (Number.isFinite(expiresOn) && expiresOn < Date.now()) return { success: false, reason: 'expired' }
  }

  return {
    success: true,
    accessType: 'author',
    portalContext: {
      contactId: record.contactId,
      authorPortalId: record.authorPortalId,
      titleId: record.titleId,
      titleIds: record.titleIds,
      projectId: record.projectId,
      projectIds: record.projectIds,
      titleName: record.titleName,
      stripeAccountId: record.stripeAccountId,
    },
  }
}

function isMasterPortalAccessCode(code: string) {
  const expected =
    process.env.AUTHOR_PORTAL_MASTER_ACCESS_CODE ||
    (process.env.NODE_ENV === 'development' ? LOCAL_TEST_PORTAL_CODE : '')

  return compareSecret(code, expected)
}

function getConfiguredPortalAccessRecords(): ConfiguredPortalAccessRecord[] {
  const raw = process.env.AUTHOR_PORTAL_ACCESS_RECORDS_JSON
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function recordMatchesCode(record: ConfiguredPortalAccessRecord, code: string) {
  if (record.accessCodeHash) {
    return compareSecret(hashPortalCode(code), record.accessCodeHash)
  }

  if (process.env.NODE_ENV !== 'production' && record.accessCode) {
    return compareSecret(code, record.accessCode)
  }

  return false
}

function hashPortalCode(code: string) {
  return createHash('sha256')
    .update(`${process.env.AUTHOR_PORTAL_ACCESS_CODE_PEPPER || ''}${code}`)
    .digest('hex')
}

function compareSecret(actual: string, expected?: string) {
  if (!expected) return false
  const actualBuffer = Buffer.from(actual)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(actualBuffer, expectedBuffer)
}
