import { NextResponse } from 'next/server'

import { buildPublisherOperatingCenterModel, requirePublisherOperator } from '@/lib/server/publisher-operating-center'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const publisher = requirePublisherOperator()
  if (!publisher.ok) {
    return NextResponse.json({ error: publisher.reason }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }

  return NextResponse.json(
    {
      ok: true,
      model: buildPublisherOperatingCenterModel(publisher.operator),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
