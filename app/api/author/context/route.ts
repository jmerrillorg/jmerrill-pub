import { createHash, randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'

import { getAuthorPortalContextFromCookies } from '@/lib/server/author-portal-context'
import { getDurableAuthorSession } from '@/lib/server/author-durable-auth'
import {
  getAuthorPortalContextFromAuthorEmail,
  getAuthorPortalContextFromExternalId,
  setAuthorPortalSessionCookie,
} from '@/lib/server/author-portal-context'
import { createAuthorPortalSession } from '@/lib/server/author-portal-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const correlationId = `AOC-AUTH-${randomUUID()}`
  const { searchParams } = new URL(request.url)
  const overrides = {
    intakeReference: searchParams.get('reference') || searchParams.get('intakeReference') || undefined,
    opportunityId: searchParams.get('opportunityId') || undefined,
    titleId: searchParams.get('titleId') || undefined,
    publishingAssetId: searchParams.get('publishingAssetId') || undefined,
  }

  const cookieContext = await getAuthorPortalContextFromCookies(overrides)
  if (cookieContext) {
    logAuthorWorkspaceAuth({
      correlationId,
      route: 'context',
      sessionSource: 'author_portal_cookie',
      workspaceResult: 'resolved',
      contactId: cookieContext.author.contactId,
      authorEmail: cookieContext.author.email,
      selectedProjectKey: cookieContext.selectedProjectKey,
    })

    return NextResponse.json({ success: true, context: cookieContext, correlationId })
  }

  const durableSession = await getDurableAuthorSession()
  const durableUser = durableSession?.user as
    | { authorObjectId?: string; role?: string; email?: string | null }
    | undefined
  const externalId = durableUser?.authorObjectId
  const email = durableUser?.email

  if (durableUser?.role === 'publisher') {
    logAuthorWorkspaceAuth({
      correlationId,
      route: 'context',
      sessionSource: 'durable_session',
      providerRole: durableUser.role,
      failureReason: 'publisher_session_present_author_session_required',
      authorEmail: email || undefined,
    })

    return NextResponse.json(
      {
        error:
          'Your publisher sign-in was found. Please use Author sign-in to open an author workspace, or return to the Publisher Operating Center.',
        status: 'author_session_required',
        correlationId,
      },
      { status: 403 },
    )
  }

  const context = externalId
    ? await getAuthorPortalContextFromExternalId(externalId, overrides)
    : email
      ? await getAuthorPortalContextFromAuthorEmail(email, overrides)
      : null

  if (!context) {
    logAuthorWorkspaceAuth({
      correlationId,
      route: 'context',
      sessionSource: durableSession ? 'durable_session' : 'none',
      providerRole: durableUser?.role,
      failureReason: durableSession ? 'author_relationship_not_resolved' : 'author_session_missing',
      subjectHash: hashSafe(externalId || email || ''),
      authorEmail: email || undefined,
    })

    return NextResponse.json(
      durableSession
        ? {
            error:
              'Your sign-in was found, but your author relationship could not be resolved. The Publishing Team can restore access without creating a duplicate account.',
            status: 'author_relationship_not_resolved',
            correlationId,
          }
        : {
            error: 'Author workspace session not found.',
            status: 'author_session_missing',
            correlationId,
          },
      { status: durableSession ? 409 : 401 },
    )
  }

  const response = NextResponse.json({ success: true, context, correlationId })
  setAuthorPortalSessionCookie(
    response,
    createAuthorPortalSession({
      code: '',
      contactId: context.author.contactId,
      contactEmail: context.author.email,
      externalUserIdentifier: externalId,
      intakeReference: context.access.intakeReference,
      opportunityId: context.currentProject.opportunityId,
      title: context.currentProject.title,
      scope: 'relationship',
    }),
  )

  logAuthorWorkspaceAuth({
    correlationId,
    route: 'context',
    sessionSource: 'durable_session',
    providerRole: durableUser?.role,
    workspaceResult: 'resolved',
    subjectHash: hashSafe(externalId || email || ''),
    contactId: context.author.contactId,
    authorEmail: context.author.email,
    selectedProjectKey: context.selectedProjectKey,
  })

  return response
}

function hashSafe(value: string) {
  if (!value.trim()) return undefined
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex').slice(0, 16)
}

function logAuthorWorkspaceAuth(event: {
  correlationId: string
  route: string
  sessionSource: 'author_portal_cookie' | 'durable_session' | 'none'
  providerRole?: string
  workspaceResult?: 'resolved'
  failureReason?: string
  subjectHash?: string
  contactId?: string
  authorEmail?: string
  selectedProjectKey?: string
}) {
  console.info('AUTHOR_WORKSPACE_AUTH_SESSION_RESOLUTION', {
    correlationId: event.correlationId,
    route: event.route,
    sessionSource: event.sessionSource,
    providerRole: event.providerRole || 'unknown',
    subjectHash: event.subjectHash || hashSafe(event.authorEmail || event.contactId || ''),
    contactHash: hashSafe(event.contactId || ''),
    workspaceResult: event.workspaceResult || 'not_resolved',
    failureReason: event.failureReason || '',
    selectedProjectKey: event.selectedProjectKey || '',
  })
}
