import type { Metadata } from 'next'
import { ModularHomePage } from '@/components/home/ModularHomePage'

export const metadata: Metadata = {
  title: 'J Merrill Publishing, Inc. — Publishing Operating System',
  description:
    'J Merrill Publishing is a full-service, multi-imprint publisher and publishing intelligence platform. 78+ titles across five imprints. Enterprise Ingram infrastructure. AI-powered. A J Merrill One company.',
}

export default function HomePage() {
  return <ModularHomePage />
}
