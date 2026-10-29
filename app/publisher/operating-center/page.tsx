import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

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

export default async function PublisherOperatingCenterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await getPublisherOperatingCenterSession()
  const requestedDetails = Object.keys(await searchParams).length > 0
  if (session && !requestedDetails) redirect('/publisher/pipeline')
  const snapshot = session ? await buildPublisherOperatingCenterSnapshot() : null

  return (
    <PublisherOperatingCenterClient
      initialSnapshot={snapshot}
      signedIn={Boolean(session)}
      operatorEmail={session?.user?.email}
    />
  )
}
