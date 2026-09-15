import { NextResponse } from 'next/server'

import { getPublisherOperatingCenterSession } from '@/lib/server/author-durable-auth'
import { buildHumanPublishingPipelineView } from '@/lib/publishing/lifecycle/human-pipeline-read-model'
import { buildPublisherOperatingCenterSnapshot } from '@/lib/server/publisher-operating-center'

export const runtime = 'nodejs'

export async function GET() {
  const session = await getPublisherOperatingCenterSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Publisher session not found.' }, { status: 401 })
  }

  const snapshot = await buildPublisherOperatingCenterSnapshot()
  return NextResponse.json(buildHumanPublishingPipelineView(snapshot.titleOperatingView.cards, snapshot.generatedAt), {
    headers: { 'Cache-Control': 'no-store' },
  })
}
