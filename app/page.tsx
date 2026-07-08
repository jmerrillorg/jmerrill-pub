import type { Metadata } from 'next'
import { ModularHomePage } from '@/components/home/ModularHomePage'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'J Merrill Publishing, Inc. — Your Words. Your Legacy. Your Rights.',
  description:
    'J Merrill Publishing helps authors protect, honor, and share their life’s work through professional publishing guidance, editorial and design support, retained rights, and global distribution through Ingram’s retail and library network.',
}

export default function HomePage() {
  return <ModularHomePage />
}
