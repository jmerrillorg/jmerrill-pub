import type { Metadata } from 'next'

import { PublishingCommandCenterPage } from '@/app/author/_components/PublishingCommandCenterPage'
import { waveCommandCenters } from '@/lib/publishing/program-002-command-centers'

export const metadata: Metadata = {
  title: 'Distribution Command Center | J Merrill Publishing',
  description: 'Governed distribution readiness command center for J Merrill Publishing titles.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function DistributionCommandCenterPage() {
  return <PublishingCommandCenterPage center={waveCommandCenters.distribution} />
}
