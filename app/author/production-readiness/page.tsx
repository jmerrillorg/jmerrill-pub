import type { Metadata } from 'next'

import { PublishingCommandCenterPage } from '@/app/author/_components/PublishingCommandCenterPage'
import { waveCommandCenters } from '@/lib/publishing/program-002-command-centers'

export const metadata: Metadata = {
  title: 'Production Readiness Command Center | J Merrill Publishing',
  description: 'Governed production readiness and distribution gate command center for J Merrill Publishing titles.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function ProductionReadinessCommandCenterPage() {
  return <PublishingCommandCenterPage center={waveCommandCenters.production} />
}
