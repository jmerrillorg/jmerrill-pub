import Link from 'next/link'
import { BookCard } from '@/components/content/BookCard'
import { PageHero } from '@/components/site/PageHero'
import { PageSection } from '@/components/site/PageSection'
import { ReaderSignupForm } from '@/components/readers/ReaderSignupForm'
import type { BookRecord } from '@/lib/content'
import type { ImprintStrategy } from '@/data/imprints'

export function ImprintDetailTemplate({
  imprint,
  featuredBooks,
}: {
  imprint: ImprintStrategy
  featuredBooks: BookRecord[]
}) {
  return (
    <div className="pt-[76px]">
      <PageHero
        eyebrow="Imprint Discovery"
        ghost={imprint.label}
        title={
          <>
            {imprint.label}
            <br />
            <em className="not-italic italic text-blue-500">{imprint.readerPathLabel}</em>
          </>
        }
        description={imprint.positioningStatement}
        actions={[
          { label: 'Get Updates', href: `/readers?imprint=${imprint.slug}` },
          { label: 'Browse Titles', href: imprint.booksHref },
        ]}
      />

      <PageSection
        eyebrow="Positioning"
        title="A focused reader entry point"
        description="Each imprint gives readers a cleaner path into the right books, the right release cadence, and the right kind of discovery without clutter."
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[28px] border border-gray-200 bg-[#F7F8FA] p-8">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-blue-500">Audience</div>
            <p className="mt-3 text-[16px] font-light leading-[1.9] text-gray-600">{imprint.audienceSummary}</p>
            <div className="mt-8 font-mono text-[10px] uppercase tracking-[0.12em] text-blue-500">House rule</div>
            <p className="mt-3 text-[15px] font-light leading-[1.9] text-gray-500">{imprint.assignmentRule}</p>
          </div>

          <div className="rounded-[28px] border border-white/8 bg-[#0F1C2E] p-8">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-blue-400">Recommended discovery channels</div>
            <div className="mt-4">
              <div className="text-[12px] uppercase tracking-[0.1em] text-white/25">Primary</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {imprint.primaryPlatforms.map((platform) => (
                  <span key={platform} className="rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1.5 text-[12px] text-blue-200">
                    {platform}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-6">
              <div className="text-[12px] uppercase tracking-[0.1em] text-white/25">Secondary</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {imprint.secondaryPlatforms.map((platform) => (
                  <span key={platform} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] text-white/55">
                    {platform}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-6 rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-blue-400">CTA emphasis</div>
              <p className="mt-3 text-[14px] font-light leading-[1.8] text-white/50">
                Reader messaging should emphasize {imprint.recommendedCtaEmphasis}, while still driving the primary relationship back to jmerrill.pub and email.
              </p>
            </div>
          </div>
        </div>
      </PageSection>

      <PageSection
        eyebrow="Featured Titles"
        title={`From ${imprint.label}`}
        description="Each imprint page is prepared to hold richer reader-facing discovery, title clustering, and future Dataverse-driven merchandising."
        surface="dark"
      >
        {featuredBooks.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {featuredBooks.map((book) => (
              <BookCard key={book.id} book={book} compact />
            ))}
          </div>
        ) : (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] px-6 py-8 text-[15px] font-light text-white/45">
            Featured titles can be curated here as the imprint discovery layer expands.
          </div>
        )}
      </PageSection>

      <PageSection
        eyebrow="Reader Signup"
        title="Stay close to this imprint"
        description="Subscribe for early access to new releases, special editions, and exclusive content aligned with this reader path."
      >
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] border border-gray-200 bg-[#F7F8FA] p-8">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-blue-500">Why subscribe</div>
            <p className="mt-3 text-[15px] font-light leading-[1.9] text-gray-500">
              Website-first reader growth keeps discovery clean, measurable, and easier to segment over time. Social stays supportive, not primary.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/readers" className="rounded-full bg-blue-500 px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-blue-600">
                Explore all reader paths
              </Link>
              <Link href={imprint.booksHref} className="rounded-full border border-gray-300 px-6 py-3 text-[14px] text-gray-600 transition-all hover:border-blue-500 hover:text-blue-500">
                Browse this imprint
              </Link>
            </div>
          </div>

          <ReaderSignupForm imprintSlug={imprint.slug} compact />
        </div>
      </PageSection>
    </div>
  )
}
