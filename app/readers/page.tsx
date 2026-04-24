import type { Metadata } from 'next'
import { PageHero } from '@/components/site/PageHero'
import { PageSection } from '@/components/site/PageSection'
import { ReaderFunnelSection } from '@/components/readers/ReaderFunnelSection'

export const metadata: Metadata = {
  title: 'Readers',
  description:
    'Discover your next read and subscribe for new releases, special editions, and exclusive content from J Merrill Publishing.',
}
export const dynamic = 'force-static'

export default function ReadersPage() {

  return (
    <div className="pt-[76px]">
      <PageHero
        eyebrow="Reader Funnel"
        ghost="Readers"
        title="Discover Your Next Read"
        description="Get early access to new releases, special editions, and exclusive content from J Merrill Publishing."
        actions={[{ label: 'Get Updates', href: '#reader-signup' }]}
      />

      <PageSection
        eyebrow="Imprint Selection"
        title="Choose the reader path that fits your taste"
        description="Select an imprint interest first, then step into the signup flow built to keep discovery clean, premium, and easier to grow over time."
      >
        <ReaderFunnelSection />
      </PageSection>
    </div>
  )
}
