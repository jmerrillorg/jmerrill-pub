import { NextRequest, NextResponse } from 'next/server'

import { getDurableAuthorSession } from '@/lib/server/author-durable-auth'
import {
  getAuthorPortalContextFromAuthorEmail,
  getAuthorPortalContextFromContactId,
  getAuthorPortalContextFromCookies,
  getAuthorPortalContextFromExternalId,
} from '@/lib/server/author-portal-context'
import {
  resolveAdditionalPaymentEligibility,
  startAdditionalPayment,
} from '@/lib/server/stripe/publishing-additional-payment'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authority = await resolveAuthority(req)
  if (!authority) return NextResponse.json({ eligible: false, reason: 'AUTHOR_SESSION_REQUIRED' }, { status: 401 })
  const result = await resolveAdditionalPaymentEligibility(authority)
  if (!result.eligible) return NextResponse.json(result, { status: 409 })
  return NextResponse.json({
    eligible: true,
    currentBalanceCents: result.state.remainingBalanceCents,
    currentInstallmentCents: result.state.nextScheduledInstallmentCents,
    pastDueAmountCents: result.state.pastDueBalanceCents,
    maximumAmountCents: result.maximumAmountCents,
    nextDueDate: result.state.nextScheduledDueDate,
  })
}

export async function POST(req: NextRequest) {
  const authority = await resolveAuthority(req)
  if (!authority) return NextResponse.json({ eligible: false, reason: 'AUTHOR_SESSION_REQUIRED' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const result = await startAdditionalPayment({
    ...authority,
    amountCents: Number(body.amountCents),
    operationId: typeof body.operationId === 'string' ? body.operationId : '',
  })
  if (!result.eligible || !('started' in result) || !result.started) return NextResponse.json(result, { status: 409 })
  return NextResponse.json(result)
}

async function resolveAuthority(req: NextRequest) {
  const requestedEngagement = clean(new URL(req.url).searchParams.get('opportunityId'))
  const cookieContext = await getAuthorPortalContextFromCookies({ opportunityId: requestedEngagement || undefined }).catch(() => null)
  const durableSession = await getDurableAuthorSession()
  const user = durableSession?.user as { authorObjectId?: string; authorContactId?: string; role?: string; email?: string | null } | undefined
  const context = cookieContext || (user?.role !== 'publisher'
    ? user?.authorContactId
      ? await getAuthorPortalContextFromContactId(user.authorContactId, { opportunityId: requestedEngagement || undefined })
      : user?.authorObjectId
        ? await getAuthorPortalContextFromExternalId(user.authorObjectId, { opportunityId: requestedEngagement || undefined })
        : user?.email
          ? await getAuthorPortalContextFromAuthorEmail(user.email, { opportunityId: requestedEngagement || undefined })
          : null
    : null)
  if (!context?.author.contactId) return null
  const engagementId = requestedEngagement || clean(context.currentProject.opportunityId)
  if (engagementId && !context.projects.some((project) => clean(project.opportunityId) === engagementId)) return null
  return { contactId: clean(context.author.contactId), engagementId }
}

function clean(value?: string | null) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}
