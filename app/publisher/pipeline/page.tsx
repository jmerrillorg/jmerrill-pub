import type { Metadata } from 'next'

import { PublisherPipelineClient } from '../_components/PublisherPipelineClient'
import { getPublisherOperatingCenterSession } from '@/lib/server/author-durable-auth'
import { buildPublisherOperatingCenterSnapshot } from '@/lib/server/publisher-operating-center'
import { buildHumanPublishingPipelineView } from '@/lib/publishing/lifecycle/human-pipeline-read-model'

export const metadata: Metadata = {
  title: 'Publishing Pipeline | J Merrill Publishing',
  description: 'Internal 16-stage title lifecycle board for J Merrill Publishing.',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function PublisherPipelinePage() {
  const session = await getPublisherOperatingCenterSession()
  const snapshot = session ? await buildPublisherOperatingCenterSnapshot() : null
  const pipeline = snapshot
    ? buildHumanPublishingPipelineView(snapshot.titleOperatingView.cards, snapshot.generatedAt)
    : null

  return (
    <PublisherPipelineClient
      initialPipeline={pipeline}
      signedIn={Boolean(session)}
      operatorEmail={session?.user?.email}
    />
  )
}

