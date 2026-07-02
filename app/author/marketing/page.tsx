import type { Metadata } from 'next'

import { PublishingCommandCenterPage } from '@/app/author/_components/PublishingCommandCenterPage'
import { waveCommandCenters } from '@/lib/publishing/program-002-command-centers'

export const metadata: Metadata = {
  title: 'Marketing Command Center | J Merrill Publishing',
  description: 'Governed marketing readiness command center for J Merrill Publishing titles.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function MarketingCommandCenterPage() {
  return <PublishingCommandCenterPage center={waveCommandCenters.marketing} />
}
