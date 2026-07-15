import { NextResponse } from 'next/server'

import { getPublisherOperatingCenterSession } from '@/lib/server/author-durable-auth'
import { initializePublisherIntakeReview } from '@/lib/server/publisher-operating-center'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const session = await getPublisherOperatingCenterSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Publisher session not found.' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as { action?: string; intakeId?: string } | null
  if (!body?.intakeId || body.action !== 'initialize_publisher_intake_review') {
    return NextResponse.json({ error: 'Unsupported publisher action.' }, { status: 400 })
  }

  try {
    const result = await initializePublisherIntakeReview({
      intakeId: body.intakeId,
      operatorEmail: session.user.email,
    })

    return NextResponse.json({ status: 'completed', result }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Publisher action failed.',
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
