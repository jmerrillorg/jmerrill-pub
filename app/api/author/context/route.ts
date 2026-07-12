import { NextResponse } from 'next/server'

import { getAuthorPortalContextFromCookies } from '@/lib/server/author-portal-context'
import { getDurableAuthorSession } from '@/lib/server/author-durable-auth'
import { getAuthorPortalContextFromAuthorEmail } from '@/lib/server/author-portal-context'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const overrides = {
    intakeReference: searchParams.get('reference') || searchParams.get('intakeReference') || undefined,
    opportunityId: searchParams.get('opportunityId') || undefined,
    titleId: searchParams.get('titleId') || undefined,
    publishingAssetId: searchParams.get('publishingAssetId') || undefined,
  }

  const context =
    (await getAuthorPortalContextFromCookies(overrides)) ||
    (await getDurableAuthorSession().then((session) => {
      const email = session?.user?.email
      if (!email) return null
      return getAuthorPortalContextFromAuthorEmail(email, overrides)
    }))

  if (!context) {
    return NextResponse.json({ error: 'Author workspace session not found.' }, { status: 401 })
  }

  return NextResponse.json({ success: true, context })
}
