import type { Metadata } from 'next'
import { PageHero } from '@/components/site/PageHero'
import { PageSection } from '@/components/site/PageSection'
import { ReaderFunnelSection } from '@/components/readers/ReaderFunnelSection'
import { normalizeImprintSlug } from '@/data/imprints'

export const metadata: Metadata = {
  title: 'Readers',
  description:
    'Discover your next read and subscribe for new releases, special editions, and exclusive content from J Merrill Publishing.',
}

type ReadersPageProps = {
  searchParams?: {
    imprint?: string | string[]
    book?: string | string[]
    title?: string | string[]
  }
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default function ReadersPage({ searchParams }: ReadersPageProps) {
  const initialImprintSlug = normalizeImprintSlug(firstValue(searchParams?.imprint))
  const contextBookId = firstValue(searchParams?.book) || ''
  const contextTitle = firstValue(searchParams?.title) || ''

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
        <ReaderFunnelSection
          initialImprintSlug={initialImprintSlug}
          contextBookId={contextBookId}
          contextTitle={contextTitle}
        />
      </PageSection>
    </div>
  )
}
