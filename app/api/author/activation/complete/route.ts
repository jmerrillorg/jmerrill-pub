import { NextRequest, NextResponse } from 'next/server'

import { getDurableAuthorSession } from '@/lib/server/author-durable-auth'
import { bindAuthorContactExternalId } from '@/lib/server/author-activation-recovery'
import {
  createAuthorPortalSession,
  getAuthorPortalActivationTransactionCookieName,
  readAuthorPortalActivationTransaction,
} from '@/lib/server/author-portal-access'
import {
  clearAuthorPortalActivationTransactionCookie,
  setAuthorPortalSessionCookie,
} from '@/lib/server/author-portal-context'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const transaction = readAuthorPortalActivationTransaction(
    req.cookies.get(getAuthorPortalActivationTransactionCookieName())?.value,
  )
  if (!transaction) {
    return NextResponse.json({ error: 'Activation transaction not found.' }, { status: 401 })
  }

  const durableSession = await getDurableAuthorSession()
  const externalUserIdentifier = (durableSession?.user as { authorObjectId?: string } | undefined)?.authorObjectId
  if (!externalUserIdentifier) {
    return NextResponse.json({ error: 'Microsoft sign-in is required.' }, { status: 401 })
  }

  const decision = await bindAuthorContactExternalId({
    contactId: transaction.contactId,
    externalUserIdentifier,
    recoveryAuthorized: transaction.purpose === 'recovery',
  })

  if (decision.action === 'reject') {
    return NextResponse.json({ error: 'Author identity requires publisher review.' }, { status: 409 })
  }

  const sessionValue = createAuthorPortalSession({
    code: '',
    contactId: transaction.contactId,
    externalUserIdentifier,
    intakeReference: transaction.intakeReference,
    title: transaction.title,
    titleSlug: transaction.titleSlug,
    opportunityId: transaction.opportunityId,
    scope: 'relationship',
  })

  const response = NextResponse.json({
    success: true,
    binding: decision.action,
    purpose: transaction.purpose,
  })
  setAuthorPortalSessionCookie(response, sessionValue)
  clearAuthorPortalActivationTransactionCookie(response)
  return response
}
