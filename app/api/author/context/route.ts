import { NextResponse } from 'next/server'

import { getAuthorPortalContextFromCookies } from '@/lib/server/author-portal-context'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const context = await getAuthorPortalContextFromCookies({
    intakeReference: searchParams.get('reference') || searchParams.get('intakeReference') || undefined,
    opportunityId: searchParams.get('opportunityId') || undefined,
    titleId: searchParams.get('titleId') || undefined,
    publishingAssetId: searchParams.get('publishingAssetId') || undefined,
  })
  if (!context) {
    return NextResponse.json({ error: 'Author workspace session not found.' }, { status: 401 })
  }

  return NextResponse.json({ success: true, context })
}
