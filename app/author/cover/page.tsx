import type { Metadata } from 'next'

import { PublishingCommandCenterPage } from '@/app/author/_components/PublishingCommandCenterPage'
import { waveCommandCenters } from '@/lib/publishing/program-002-command-centers'

export const metadata: Metadata = {
  title: 'Cover Design Command Center | J Merrill Publishing',
  description: 'Governed cover design readiness command center for J Merrill Publishing titles.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function CoverDesignCommandCenterPage() {
  return <PublishingCommandCenterPage center={waveCommandCenters.cover} />
}
