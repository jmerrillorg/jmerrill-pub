import type { Metadata } from 'next'

import { PublishingCommandCenterPage } from '@/app/author/_components/PublishingCommandCenterPage'
import { waveCommandCenters } from '@/lib/publishing/program-002-command-centers'

export const metadata: Metadata = {
  title: 'Author Success Command Center | J Merrill Publishing',
  description: 'Governed royalty, relationship, and author success readiness command center for J Merrill Publishing titles.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AuthorSuccessCommandCenterPage() {
  return <PublishingCommandCenterPage center={waveCommandCenters.authorSuccess} />
}
