import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHero } from '@/components/site/PageHero'
import { PageSection } from '@/components/site/PageSection'
import { imprintStrategies } from '@/data/imprints'

export const metadata: Metadata = {
  title: 'Imprints',
  description:
    'Explore the multi-imprint publishing structure behind J Merrill Publishing and discover the reader path that fits each audience.',
}

export default function ImprintsPage() {
  return (
    <div className="pt-[76px]">
      <PageHero
        eyebrow="Imprint Structure"
        ghost="Imprints"
        title={
          <>
            A multi-imprint structure
            <br />
            <em className="not-italic italic text-blue-500">built for distinct audiences</em>
          </>
        }
        description="J Merrill Publishing, Inc. is an independent publisher with a multi-imprint structure designed to serve distinct audiences and genres."
        actions={[
          { label: 'Explore Reader Paths', href: '/readers' },
          { label: 'Browse Titles', href: '/books' },
        ]}
      />

      <PageSection
        eyebrow="Imprint Discovery"
        title="Five imprints. One flagship publishing home."
        description="Each imprint gives readers a cleaner entry point into the catalog, while keeping jmerrill.pub as the primary relationship hub."
      >
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {imprintStrategies.map((imprint) => (
            <article
              key={imprint.slug}
              className="flex h-full flex-col rounded-[30px] border border-gray-200 bg-white p-7 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_18px_48px_rgba(15,28,46,0.08)]"
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-blue-500">{imprint.label}</div>
              <h2
                className="mt-3 text-charcoal"
                style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '28px', fontWeight: 700, lineHeight: 1.15 }}
              >
                {imprint.readerPathLabel}
              </h2>
              <p className="mt-3 text-[14px] font-light leading-[1.85] text-gray-500">{imprint.positioningStatement}</p>
              <div className="mt-5 rounded-[22px] border border-gray-200 bg-[#F7F8FA] px-4 py-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-blue-500">Audience</div>
                <p className="mt-2 text-[13px] font-light leading-[1.8] text-gray-500">{imprint.audienceSummary}</p>
              </div>
              <div className="mt-auto pt-6">
                <div className="mb-4 text-[12px] text-gray-400">Discovery emphasis: {imprint.recommendedCtaEmphasis}</div>
                <div className="flex flex-wrap items-center gap-4">
                  <Link href={imprint.pageHref} className="font-mono text-[11px] uppercase tracking-[0.08em] text-blue-500">
                    View imprint -&gt;
                  </Link>
                  <Link href={imprint.booksHref} className="text-[13px] text-gray-500 transition-colors hover:text-blue-500">
                    Browse titles
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/readers"
            className="inline-flex items-center gap-2 text-[13px] text-gray-500 transition-colors hover:text-blue-500"
          >
            Prefer a guided reader signup path? Start at /readers →
          </Link>
        </div>
      </PageSection>
    </div>
  )
}
