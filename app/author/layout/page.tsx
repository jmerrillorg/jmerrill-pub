import type { Metadata } from 'next'

import { PublishingCommandCenterPage } from '@/app/author/_components/PublishingCommandCenterPage'
import { waveCommandCenters } from '@/lib/publishing/program-002-command-centers'

export const metadata: Metadata = {
  title: 'Interior Layout Command Center | J Merrill Publishing',
  description: 'Governed interior layout readiness command center for J Merrill Publishing titles.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function InteriorLayoutCommandCenterPage() {
  return <PublishingCommandCenterPage center={waveCommandCenters.layout} />
}
