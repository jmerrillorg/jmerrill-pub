import type { Metadata } from 'next'

import { PublisherOperatingCenterClient } from '../_components/PublisherOperatingCenterClient'
import { getPublisherOperatingCenterSession } from '@/lib/server/author-durable-auth'
import { buildPublisherOperatingCenterSnapshot } from '@/lib/server/publisher-operating-center'

export const metadata: Metadata = {
  title: 'Publisher Operating Center | J Merrill Publishing',
  description: 'Internal J Merrill Publishing operating surface for governed publishing pipeline movement.',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function PublisherOperatingCenterPage() {
  const session = await getPublisherOperatingCenterSession()
  const snapshot = session ? await buildPublisherOperatingCenterSnapshot() : null

  return (
    <PublisherOperatingCenterClient
      initialSnapshot={snapshot}
      signedIn={Boolean(session)}
      operatorEmail={session?.user?.email}
    />
  )
}
